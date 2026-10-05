import { Bot } from 'lucide-react';
import type { UploadedSubmission } from '../../store/store';

/** Placeholder for the full AI assessment of an uploaded rule (precomputed only for the 100 seeded rules). */
export default function LiveAssessment({ upload }: { upload: UploadedSubmission }) {
  return (
    <section className="card p-4" aria-labelledby={`live-${upload.id}`}>
      <h2 id={`live-${upload.id}`} className="flex items-center gap-2 text-lg font-semibold">
        <Bot size={18} aria-hidden /> Full AI assessment
      </h2>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        In this static prototype, full assessments are precomputed for the 100 seeded rules. In production this step runs server-side with the same prompt
        (<code>prompts/assessment-prompt.md</code>), the same schema validation and the same deterministic scoring, then the rule moves to Analyst review.
      </p>
    </section>
  );
}
