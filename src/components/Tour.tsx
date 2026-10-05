import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, X } from 'lucide-react';
import { useStore } from '../store/store';

export const TOUR_STEPS = [
  {
    route: '/',
    title: 'The compliance dashboard',
    body: 'Every one of the 100 fictional submissions already has an advisory AI pre-assessment. The queue shows the AI recommendation, Level 1 hard stops, senior-review flags and consumer impact. Sort by risk, age or similarity cluster, filter by stage, insurer, category or issue code, or switch to the kanban view.',
  },
  {
    route: '/rule/DR-005',
    title: 'A hard stop: DR-005 (primary language)',
    body: 'The red banner means a Level 1 fail: language is a close proxy for ancestry and place of origin, which the Human Rights Code protects. Click any quoted evidence under a finding to highlight the exact words in the rule. Citations show whether the section was verified.',
  },
  {
    route: '/rule/DR-012',
    title: 'A precedent match: DR-012 (racetrack use)',
    body: 'The similar-rules panel finds approved precedent AP-07 at 90% similarity and explains the one wording difference. The score breakdown shows the formula. The recommendation is computed by code from the findings, not written by the AI.',
  },
  {
    route: '/rule/DR-071',
    title: 'Override and senior sign-off: DR-071 (stunt driving)',
    body: 'The AI asks for data because the 5-year lookback is stricter than the approved 3-year rule. Try overriding "Actuarial support" to low severity with a reason: the score recomputes and the human-adjusted result appears. Approving would differ from the AI, so the decision goes to a senior reviewer. Switch role in the header to sign off.',
  },
  {
    route: '/consistency',
    title: 'The consistency monitor',
    body: 'Similar rules with different outcomes are listed with the recorded reason for the difference. Reviewer overrides are tracked by issue code, so a finding that people keep overriding becomes visible. Every action is in the audit trail and can be exported.',
  },
];

export default function Tour() {
  const step = useStore((s) => s.tourStep);
  const setStep = useStore((s) => s.setTourStep);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === null) return;
    const target = TOUR_STEPS[step].route;
    if (pathname !== target) navigate(target);
    headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === null) return null;
  const s = TOUR_STEPS[step];
  return (
    <div role="dialog" aria-labelledby="tour-title" aria-modal="false" className="no-print fixed right-4 bottom-16 z-40 w-[min(420px,calc(100vw-2rem))] rounded-xl border-2 border-[var(--color-gold-500)] bg-white p-4 shadow-2xl" data-testid="tour">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-gold-700)]">
          <Compass size={14} aria-hidden /> Guided demo · step {step + 1} of {TOUR_STEPS.length}
        </div>
        <button type="button" aria-label="Close guided demo" className="rounded p-1 hover:bg-[var(--color-pine-50)]" onClick={() => setStep(null)}>
          <X size={16} aria-hidden />
        </button>
      </div>
      <h2 id="tour-title" ref={headingRef} tabIndex={-1} className="mt-1 text-lg font-semibold">
        {s.title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed">{s.body}</p>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </button>
        <div className="flex gap-1" aria-hidden>
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 w-5 rounded-full ${i === step ? 'bg-[var(--color-pine-900)]' : 'bg-[var(--color-line)]'}`} />
          ))}
        </div>
        {step < TOUR_STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setStep(null)}>
            Finish
          </button>
        )}
      </div>
    </div>
  );
}
