// Decision record export (Markdown and JSON). The record is the accountable artefact: who decided what, why,
// what the AI said, what the human changed, and the full audit trail.
import type { Assessment, Rule } from './schema';
import type { ScoreResult } from './scoring';
import type { AuditEvent, CaseState } from './workflow';

export interface DecisionRecordInput {
  rule: Rule;
  assessment: Assessment;
  ai: ScoreResult;
  human: ScoreResult;
  caseState: CaseState;
  audit: AuditEvent[];
  labels: { recommendation: (k: string) => string; decision: (k: string) => string; stage: (k: string) => string; text: (s: string) => string };
}

export function decisionRecordJson(i: DecisionRecordInput): string {
  return JSON.stringify(
    {
      disclaimer: 'Academic prototype for Ivey Online coursework. Not affiliated with or representative of FSRA. All submissions are fictional.',
      exportedAt: new Date().toISOString(),
      rule: i.rule,
      stage: i.caseState.stage,
      aiRecommendation: { key: i.ai.recommendation, score: i.ai.score, reasons: i.ai.reasons, advisory: true },
      humanAdjusted: { key: i.human.recommendation, score: i.human.score },
      overrides: i.caseState.overrides,
      acceptedFindings: Object.keys(i.caseState.accepted),
      proposedDecision: i.caseState.proposed ?? null,
      decision: i.caseState.decision ?? null,
      infoRequest: i.caseState.infoRequest ?? null,
      provenance: i.assessment.provenance,
      auditTrail: i.audit,
    },
    null,
    2,
  );
}

export function decisionRecordMarkdown(i: DecisionRecordInput): string {
  const { rule, ai, human, caseState: c, labels } = i;
  const d = c.decision ?? c.proposed;
  const out: string[] = [];
  out.push(`# Decision record: ${rule.id}`);
  out.push('_Academic prototype for Ivey Online coursework. Not affiliated with or representative of FSRA. All submissions are fictional._');
  out.push(`- **Insurer:** ${rule.insurer}\n- **Submitted:** ${rule.dateSubmitted}\n- **Categories:** ${rule.categoryLabel}\n- **Stage:** ${labels.stage(c.stage)}`);
  out.push(`## Proposed rule\n\n> ${rule.ruleText}\n\n**Insurer's rationale:** ${rule.rationale}`);
  out.push(
    `## AI recommendation (advisory)\n\n${labels.recommendation(ai.recommendation)} (score ${ai.score ?? 'n/a'}). ${ai.reasons.join(' ')}\n\nAfter human validation: ${labels.recommendation(human.recommendation)} (score ${human.score ?? 'n/a'}).`,
  );
  const ov = Object.entries(c.overrides);
  out.push(
    `## Human validation\n\n${Object.keys(c.accepted).length} findings accepted, ${ov.length} overridden.${
      ov.length ? '\n\n' + ov.map(([k, o]) => `- **${k}** -> ${o.status} / ${o.severity}. Reason ${o.reasonCode}: ${o.note} (${o.by}, ${o.role}, ${o.at})`).join('\n') : ''
    }`,
  );
  if (d) {
    out.push(
      `## ${c.decision ? 'Decision' : 'Proposed decision (awaiting sign-off)'}\n\n**${labels.decision(d.option)}** by ${d.by} (${d.role}) at ${d.at}. Ownership confirmed: ${
        d.ownershipConfirmed ? 'yes' : 'no'
      }.${d.triggers.length ? ` Senior sign-off triggers: ${d.triggers.join(', ')}.` : ''}${d.signedOffBy ? ` Signed off by ${d.signedOffBy} at ${d.signedOffAt}: ${d.signOffNote ?? ''}` : ''}\n\n### Rationale\n\n${d.rationale}`,
    );
  }
  out.push(`## Audit trail\n\n| Time | Actor | Role | Action | Detail |\n|---|---|---|---|---|\n${i.audit
    .map((e) => `| ${e.at} | ${e.actor} | ${e.role} | ${i.labels.text(e.action)} | ${i.labels.text([e.detail, e.before && `before: ${e.before}`, e.after && `after: ${e.after}`, e.reason && `reason: ${e.reason}`].filter(Boolean).join('; ')).replace(/\|/g, '/')} |`)
    .join('\n')}`);
  return out.join('\n\n') + '\n';
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
