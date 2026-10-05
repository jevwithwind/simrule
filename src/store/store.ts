// Application state: workflow cases, audit trail, uploads and UI state, persisted to localStorage
// under a versioned key. Every human action that changes a case writes an audit event.
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { aiScores, assessments, assessmentsById, rules } from '../data';
import type { Assessment, Rule, Severity, Status } from '../lib/schema';
import type { TriageResult } from '../lib/heuristics';
import type { ChecklistRow } from '../lib/completeness';
import {
  buildSeedState,
  humanScore,
  signOffTriggers,
  type AuditEvent,
  type CaseState,
  type DecisionKey,
  type DecisionRecord,
  type Role,
  type StageKey,
} from '../lib/workflow';

export const STORAGE_KEY = 'simrule-state-v1';

export interface UploadedSubmission {
  id: string;
  rule: Rule;
  source: { method: 'file' | 'paste' | 'form'; fileName?: string };
  extraction: { definitions?: string; actuarial?: string; consumerNotice?: string };
  triage: TriageResult;
  checklist: ChecklistRow[];
  similar: { id: string; kind: 'submission' | 'precedent'; score: number }[];
  createdAt: string;
  liveAssessment?: Assessment;
}

const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* storage unavailable: state lives in memory for this session */
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const ACTOR: Record<Role, string> = { Analyst: 'Demo analyst (you)', 'Senior reviewer': 'Demo senior reviewer (you)' };

interface StoreState {
  role: Role;
  cases: Record<string, CaseState>;
  audit: AuditEvent[];
  uploads: UploadedSubmission[];
  tourStep: number | null;
  setRole: (r: Role) => void;
  setTourStep: (s: number | null) => void;
  acceptCriterion: (caseId: string, key: string) => void;
  acceptLevel: (caseId: string, level: number) => void;
  overrideCriterion: (caseId: string, key: string, o: { status: Status; severity: Severity; reasonCode: string; note: string }) => void;
  revertCriterion: (caseId: string, key: string) => void;
  completeIntake: (caseId: string) => void;
  submitDecision: (caseId: string, d: { option: DecisionKey; rationale: string; ownershipConfirmed: boolean }) => { needsSignOff: boolean };
  signOff: (caseId: string, note: string) => void;
  returnToAnalyst: (caseId: string, note: string) => void;
  recordInsurerResponse: (caseId: string, note: string) => void;
  closeCase: (caseId: string) => void;
  addUpload: (u: UploadedSubmission) => void;
  attachLiveAssessment: (id: string, a: Assessment) => void;
  log: (e: Omit<AuditEvent, 'id' | 'at'> & { at?: string }) => void;
  resetDemo: () => void;
}

const seed = () => buildSeedState(assessments, rules, aiScores);
const now = () => new Date().toISOString();
let counter = 0;
const newId = () => `evt-${Date.now().toString(36)}-${(++counter).toString(36)}`;

export function assessmentFor(id: string, uploads: UploadedSubmission[]): Assessment | undefined {
  return assessmentsById.get(id) ?? uploads.find((u) => u.id === id)?.liveAssessment;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      const s0 = seed();
      const log: StoreState['log'] = (e) => set((st) => ({ audit: [...st.audit, { id: newId(), at: e.at ?? now(), ...e }] }));
      const updateCase = (id: string, fn: (c: CaseState) => CaseState) =>
        set((st) => ({ cases: { ...st.cases, [id]: fn(st.cases[id] ?? { id, stage: 'ANALYST_REVIEW', accepted: {}, overrides: {} }) } }));
      const actor = () => ({ actor: ACTOR[get().role], role: get().role });

      return {
        role: 'Analyst',
        cases: s0.cases,
        audit: s0.audit,
        uploads: [],
        tourStep: null,
        setRole: (role) => {
          set({ role });
          log({ caseId: '-', actor: ACTOR[role], role, action: `Switched role to ${role}` });
        },
        setTourStep: (tourStep) => set({ tourStep }),
        acceptCriterion: (caseId, key) => {
          updateCase(caseId, (c) => ({ ...c, accepted: { ...c.accepted, [key]: { by: ACTOR[get().role], role: get().role, at: now() } } }));
          log({ caseId, ...actor(), action: `Accepted AI finding ${key}` });
        },
        acceptLevel: (caseId, level) => {
          const a = assessmentFor(caseId, get().uploads);
          if (!a) return;
          const keys = a.criteria.filter((x) => x.level === level && !get().cases[caseId]?.overrides[x.key] && !get().cases[caseId]?.accepted[x.key]).map((x) => x.key);
          if (!keys.length) return;
          updateCase(caseId, (c) => {
            const accepted = { ...c.accepted };
            for (const k of keys) accepted[k] = { by: ACTOR[get().role], role: get().role, at: now() };
            return { ...c, accepted };
          });
          log({ caseId, ...actor(), action: `Accepted ${keys.length} AI findings at Level ${level}`, detail: keys.join(', ') });
        },
        overrideCriterion: (caseId, key, o) => {
          const a = assessmentFor(caseId, get().uploads);
          const before = a?.criteria.find((x) => x.key === key);
          updateCase(caseId, (c) => {
            const accepted = { ...c.accepted };
            delete accepted[key];
            return { ...c, accepted, overrides: { ...c.overrides, [key]: { ...o, by: ACTOR[get().role], role: get().role, at: now() } } };
          });
          log({
            caseId,
            ...actor(),
            action: `Overrode ${key}`,
            before: before ? `${before.status} / ${before.severity}` : undefined,
            after: `${o.status} / ${o.severity}`,
            reason: `${o.reasonCode}: ${o.note}`,
          });
        },
        revertCriterion: (caseId, key) => {
          updateCase(caseId, (c) => {
            const overrides = { ...c.overrides };
            const accepted = { ...c.accepted };
            delete overrides[key];
            delete accepted[key];
            return { ...c, overrides, accepted };
          });
          log({ caseId, ...actor(), action: `Reverted ${key} to the AI finding (not yet validated)` });
        },
        completeIntake: (caseId) => {
          const hasAssessment = !!assessmentFor(caseId, get().uploads);
          const next: StageKey = hasAssessment ? 'ANALYST_REVIEW' : 'AI_PRE_ASSESSMENT';
          updateCase(caseId, (c) => ({ ...c, stage: next }));
          log({ caseId, ...actor(), action: 'Intake and completeness check completed', after: next });
        },
        submitDecision: (caseId, d) => {
          const a = assessmentFor(caseId, get().uploads)!;
          const ai = aiScores.get(caseId) ?? humanScore(a, undefined);
          const c = get().cases[caseId];
          const triggers = signOffTriggers(d.option, a, ai, c);
          const record: DecisionRecord = {
            ...d,
            by: ACTOR[get().role],
            role: get().role,
            at: now(),
            triggers,
            aiRecommendation: ai.recommendation,
            humanScore: humanScore(a, c).score,
          };
          const senior = get().role === 'Senior reviewer';
          if (triggers.length && !senior) {
            updateCase(caseId, (cs) => ({ ...cs, proposed: record, stage: 'SENIOR_SIGN_OFF', returnedNote: undefined }));
            log({ caseId, ...actor(), action: `Proposed decision: ${d.option}`, detail: `Senior sign-off required: ${triggers.join(', ')}. Ownership of the rationale confirmed.` });
            return { needsSignOff: true };
          }
          const final: DecisionRecord = senior && triggers.length ? { ...record, signedOffBy: ACTOR[get().role], signedOffAt: record.at, signOffNote: 'Decided directly by a senior reviewer.' } : record;
          const stage: StageKey = d.option === 'REQUEST_INFORMATION' ? 'INFO_REQUESTED' : d.option === 'ESCALATE' ? 'SENIOR_SIGN_OFF' : 'DECIDED';
          updateCase(caseId, (cs) => ({
            ...cs,
            decision: d.option === 'ESCALATE' ? cs.decision : final,
            proposed: d.option === 'ESCALATE' ? final : undefined,
            stage,
            infoRequest: d.option === 'REQUEST_INFORMATION' ? { questions: a.questionsForInsurer, at: record.at, by: record.by } : cs.infoRequest,
          }));
          log({ caseId, ...actor(), action: `Decision recorded: ${d.option}`, detail: 'Ownership of the rationale confirmed.' });
          return { needsSignOff: false };
        },
        signOff: (caseId, note) => {
          const c = get().cases[caseId];
          if (!c?.proposed) return;
          const p = c.proposed;
          const final: DecisionRecord = { ...p, signedOffBy: ACTOR[get().role], signedOffAt: now(), signOffNote: note };
          const stage: StageKey = p.option === 'REQUEST_INFORMATION' ? 'INFO_REQUESTED' : 'DECIDED';
          const a = assessmentFor(caseId, get().uploads);
          updateCase(caseId, (cs) => ({
            ...cs,
            decision: final,
            proposed: undefined,
            stage,
            infoRequest: p.option === 'REQUEST_INFORMATION' && a ? { questions: a.questionsForInsurer, at: final.signedOffAt!, by: final.by } : cs.infoRequest,
          }));
          log({ caseId, ...actor(), action: `Senior sign-off: ${p.option}`, detail: `Triggers reviewed: ${p.triggers.join(', ') || 'none'}`, reason: note });
        },
        returnToAnalyst: (caseId, note) => {
          updateCase(caseId, (cs) => ({ ...cs, proposed: undefined, stage: 'ANALYST_REVIEW', returnedNote: note }));
          log({ caseId, ...actor(), action: 'Returned to analyst without sign-off', reason: note });
        },
        recordInsurerResponse: (caseId, note) => {
          updateCase(caseId, (cs) => ({ ...cs, stage: 'ANALYST_REVIEW', decision: undefined }));
          log({ caseId, ...actor(), action: 'Insurer response recorded; returned to analyst review', detail: note });
        },
        closeCase: (caseId) => {
          updateCase(caseId, (cs) => ({ ...cs, stage: 'CLOSED' }));
          log({ caseId, ...actor(), action: 'Case closed' });
        },
        addUpload: (u) => {
          set((st) => ({
            uploads: [...st.uploads, u],
            cases: { ...st.cases, [u.id]: { id: u.id, stage: 'AI_PRE_ASSESSMENT', accepted: {}, overrides: {} } },
          }));
          log({ caseId: u.id, actor: 'System', role: 'System', action: 'Submission received', detail: u.source.fileName ? `File: ${u.source.fileName}` : `Entered by ${u.source.method}` });
          log({ caseId: u.id, ...actor(), action: 'Extraction confirmed by reviewer', detail: 'Reviewer checked and confirmed the extracted fields before triage.' });
          log({ caseId: u.id, actor: 'Keyword triage', role: 'AI (advisory)', action: 'Keyword triage completed (low confidence)', detail: u.triage.flags.map((f) => f.code).join(', ') || 'No flags' });
        },
        attachLiveAssessment: (id, a) => {
          set((st) => ({ uploads: st.uploads.map((u) => (u.id === id ? { ...u, liveAssessment: a } : u)) }));
          updateCase(id, (cs) => ({ ...cs, stage: 'ANALYST_REVIEW' }));
          log({ caseId: id, actor: 'Live AI assessment', role: 'AI (advisory)', action: 'AI pre-assessment completed (advisory)', detail: `Prompt ${a.provenance.promptVersion}` });
        },
        log,
        resetDemo: () => {
          const s = seed();
          set({ cases: s.cases, audit: s.audit, uploads: [], role: 'Analyst', tourStep: null });
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ role: s.role, cases: s.cases, audit: s.audit, uploads: s.uploads }),
    },
  ),
);

export function caseStage(cases: Record<string, CaseState>, id: string): StageKey {
  return cases[id]?.stage ?? 'ANALYST_REVIEW';
}
