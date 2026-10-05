import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardPaste, FileText, FormInput, Loader2, UploadCloud } from 'lucide-react';
import { similarityIndex } from '../data';
import { useStore } from '../store/store';
import { extractTextFromFile, splitRules, type ExtractedRule } from '../lib/parseDocs';
import { keywordTriage } from '../lib/heuristics';
import { runChecklist } from '../lib/completeness';
import { topCandidates } from '../lib/similarity';
import { AiTag, cx, IssueChip } from '../components/ui';

type Method = 'file' | 'paste' | 'form';

interface Draft extends ExtractedRule {
  confirmed: boolean;
}

const blank = (): Draft => ({ insurer: '', dateSubmitted: '', ruleText: '', rationale: '', categoryLabel: '', definitions: '', actuarial: '', consumerNotice: '', confirmed: false });

export default function Intake() {
  const uploads = useStore((s) => s.uploads);
  const addUpload = useStore((s) => s.addUpload);
  const [method, setMethod] = useState<Method>('file');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [source, setSource] = useState<{ method: Method; fileName?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [created, setCreated] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = (rules: ExtractedRule[], src: { method: Method; fileName?: string }) => {
    setCreated([]);
    if (!rules.length) {
      setError('No rule found. Look for wording such as "Proposed Decline Rule:" or a sentence starting with "Decline to insure". You can also use the form.');
      setDrafts([]);
      return;
    }
    setError(null);
    setSource(src);
    setDrafts(rules.map((r) => ({ ...r, confirmed: false })));
  };

  const onFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const text = await extractTextFromFile(file);
      load(splitRules(text), { method: 'file', fileName: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file.');
    } finally {
      setBusy(false);
    }
  };

  const update = (i: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch, confirmed: patch.confirmed ?? false } : x)));

  const submit = () => {
    const ids: string[] = [];
    let n = uploads.length;
    for (const d of drafts.filter((x) => x.confirmed)) {
      n++;
      const id = `UP-${n}`;
      const categories = d.categoryLabel.split('/').map((c) => c.trim()).filter(Boolean);
      const rule = {
        id,
        insurer: d.insurer.trim(),
        dateSubmitted: d.dateSubmitted.trim(),
        ruleText: d.ruleText.trim(),
        rationale: d.rationale.trim(),
        categories: categories.length ? categories : ['Uncategorised'],
        categoryLabel: d.categoryLabel.trim() || 'Uncategorised',
      };
      const triage = keywordTriage(rule.ruleText, rule.rationale);
      const checklist = runChecklist({ ...rule, category: rule.categoryLabel, definitions: d.definitions, actuarial: d.actuarial, consumerNotice: d.consumerNotice }, triage.scope.inScope, false);
      const similar = topCandidates(similarityIndex.query({ text: rule.ruleText, categories: rule.categories }), 5).map((s) => ({ id: s.id, kind: s.kind, score: s.score }));
      addUpload({
        id,
        rule,
        source: source ?? { method: 'form' },
        extraction: { definitions: d.definitions, actuarial: d.actuarial, consumerNotice: d.consumerNotice },
        triage,
        checklist,
        similar,
        createdAt: new Date().toISOString(),
      });
      ids.push(id);
    }
    setCreated(ids);
    setDrafts([]);
    setPaste('');
  };

  const confirmedCount = drafts.filter((d) => d.confirmed).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">Document upload</div>
        <h1 className="text-3xl font-bold">Intake</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-muted)]">
          Upload a filing (PDF, DOCX, TXT or MD), paste text, or fill the form. Simrule extracts each rule, you check and confirm the extraction, then it runs the completeness check, the scope check, keyword
          triage and similarity search. New rules join the queue as <strong>Awaiting full AI assessment</strong>.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Intake steps">
        {['1. Provide the filing', '2. Check and confirm the extraction', '3. Triage and add to the queue'].map((s, i) => (
          <li key={s} className={cx('rounded-full px-3 py-1 font-semibold', (i === 0 && !drafts.length) || (i === 1 && drafts.length) || (i === 2 && created.length) ? 'bg-[var(--color-pine-900)] text-white' : 'bg-white ring-1 ring-[var(--color-line)]')}>
            {s}
          </li>
        ))}
      </ol>

      <section className="card p-4" aria-label="Provide the filing">
        <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label="Input method">
          {(
            [
              ['file', 'Upload a file', <UploadCloud key="u" size={15} aria-hidden />],
              ['paste', 'Paste text', <ClipboardPaste key="p" size={15} aria-hidden />],
              ['form', 'Fill a form', <FormInput key="f" size={15} aria-hidden />],
            ] as [Method, string, React.ReactNode][]
          ).map(([m, label, icon]) => (
            <button key={m} role="tab" aria-selected={method === m} type="button" onClick={() => setMethod(m)} className={cx('btn', method === m ? 'btn-primary' : 'btn-secondary')}>
              {icon} {label}
            </button>
          ))}
        </div>

        {method === 'file' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) void onFile(f);
            }}
            className={cx('flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center', drag ? 'border-[var(--color-gold-500)] bg-[var(--color-gold-100)]' : 'border-[var(--color-line)] bg-[var(--color-paper)]')}
          >
            <UploadCloud size={32} className="text-[var(--color-pine-700)]" aria-hidden />
            <p className="text-sm">Drag and drop a filing here, or</p>
            <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              <FileText size={15} aria-hidden /> Choose a file
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" data-testid="file-input" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} aria-label="Choose a filing to upload" />
            <p className="text-xs text-[var(--color-ink-muted)]">Parsed in your browser. Nothing is uploaded to a server. Sample filings are in deliverables/demo/sample-submissions.</p>
          </div>
        )}

        {method === 'paste' && (
          <div className="space-y-2">
            <label className="label" htmlFor="paste">
              Paste one or more rules (labelled fields such as "Submitting Insurer:", "Proposed Decline Rule:", "Rationale:" work best)
            </label>
            <textarea id="paste" className="field min-h-[160px]" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <button type="button" className="btn btn-primary" disabled={paste.trim().length < 15} onClick={() => load(splitRules(paste), { method: 'paste' })}>
              Extract rules
            </button>
          </div>
        )}

        {method === 'form' && (
          <div>
            <p className="mb-2 text-sm text-[var(--color-ink-muted)]">Enter the rule directly. You will still confirm it before triage.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSource({ method: 'form' });
                setDrafts([blank()]);
                setCreated([]);
              }}
            >
              Start a blank rule
            </button>
          </div>
        )}

        {busy && (
          <p className="mt-3 flex items-center gap-2 text-sm" role="status">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Reading the file...
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-md bg-[var(--color-concern-bg)] px-3 py-2 text-sm text-[var(--color-concern-fg)]" role="alert">
            {error}
          </p>
        )}
      </section>

      {drafts.length > 0 && (
        <section className="card p-4" aria-labelledby="preview-h" data-testid="extraction-preview">
          <h2 id="preview-h" className="text-xl font-semibold">
            Extraction preview: {drafts.length} rule{drafts.length > 1 ? 's' : ''} found{source?.fileName ? ` in ${source.fileName}` : ''}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            The reviewer validates the extraction. Check each field against the source, correct anything wrong, then confirm. Nothing is triaged until you confirm it.
          </p>
          <div className="mt-4 space-y-4">
            {drafts.map((d, i) => (
              <fieldset key={i} className={cx('rounded-lg border p-3', d.confirmed ? 'border-[var(--color-pine-700)] bg-[var(--color-pine-50)]' : 'border-[var(--color-line)]')}>
                <legend className="px-1 text-sm font-semibold">Rule {i + 1}</legend>
                <div className="grid gap-2 md:grid-cols-3">
                  <Field label="Submitting insurer" value={d.insurer} onChange={(v) => update(i, { insurer: v })} />
                  <Field label="Date submitted (YYYY-MM-DD)" value={d.dateSubmitted} onChange={(v) => update(i, { dateSubmitted: v })} />
                  <Field label="Rule category" value={d.categoryLabel} onChange={(v) => update(i, { categoryLabel: v })} />
                </div>
                <Field label="Proposed decline rule" value={d.ruleText} onChange={(v) => update(i, { ruleText: v })} area />
                <Field label="Insurer's stated rationale" value={d.rationale} onChange={(v) => update(i, { rationale: v })} area />
                <div className="grid gap-2 md:grid-cols-3">
                  <Field label="Definitions (if supplied)" value={d.definitions} onChange={(v) => update(i, { definitions: v })} />
                  <Field label="Actuarial support (if supplied)" value={d.actuarial} onChange={(v) => update(i, { actuarial: v })} />
                  <Field label="Consumer notice (if supplied)" value={d.consumerNotice} onChange={(v) => update(i, { consumerNotice: v })} />
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={d.confirmed} disabled={d.ruleText.trim().length < 10} onChange={(e) => update(i, { confirmed: e.target.checked })} data-testid={`confirm-extraction-${i}`} />
                  I have checked this extraction against the source
                </label>
              </fieldset>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={!confirmedCount} onClick={submit} data-testid="run-triage">
              <CheckCircle2 size={15} aria-hidden /> Run triage and add {confirmedCount || ''} to the queue
            </button>
            <span className="text-xs text-[var(--color-ink-muted)]">Unconfirmed rules are discarded.</span>
          </div>
        </section>
      )}

      {created.length > 0 && (
        <section className="card border-l-4 border-l-[var(--color-pine-700)] p-4" role="status" data-testid="intake-result">
          <h2 className="text-lg font-semibold">Added to the queue</h2>
          <ul className="mt-2 space-y-2">
            {created.map((id) => {
              const u = useStore.getState().uploads.find((x) => x.id === id);
              if (!u) return null;
              return (
                <li key={id} className="rounded-md border border-[var(--color-line)] p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/rule/${id}`} className="font-semibold text-[var(--color-pine-900)] underline underline-offset-2">
                      {id}
                    </Link>
                    <span className="text-xs">{u.triage.scope.inScope ? 'In scope' : 'Out of scope: eligibility rule'}</span>
                    <AiTag>{u.triage.label}</AiTag>
                  </div>
                  <p className="mt-1 text-xs">{u.rule.ruleText}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.triage.flags.map((f) => (
                      <IssueChip key={f.code} code={f.code} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label className="mt-2 block">
      <span className="label">{label}</span>
      {area ? <textarea className="field min-h-[56px]" value={value} onChange={(e) => onChange(e.target.value)} /> : <input className="field" value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}
