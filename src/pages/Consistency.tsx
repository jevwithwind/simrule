import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, GitCompareArrows } from "lucide-react";
import {
  aiScores,
  assessmentsById,
  framework,
  issueCodesByCode,
  rulesById,
  similarPairs,
} from "../data";
import { useStore } from "../store/store";
import { currentOutcome, DECISION_TO_OUTCOME } from "../lib/workflow";
import { EmptyState, RecBadge, SectionTitle } from "../components/ui";

export default function Consistency() {
  const cases = useStore((s) => s.cases);

  const pairs = useMemo(
    () =>
      similarPairs
        .map((p) => {
          const oa = currentOutcome(aiScores.get(p.a)!, cases[p.a]);
          const ob = currentOutcome(aiScores.get(p.b)!, cases[p.b]);
          const recorded =
            assessmentsById.get(p.a)!.precedents.find((x) => x.refId === p.b)
              ?.explanation ??
            assessmentsById.get(p.b)!.precedents.find((x) => x.refId === p.a)
              ?.explanation;
          const humanNote = [
            cases[p.a]?.decision?.rationale,
            cases[p.b]?.decision?.rationale,
            cases[p.a]?.proposed?.rationale,
            cases[p.b]?.proposed?.rationale,
          ].some((t) => t && (t.includes(p.a) || t.includes(p.b)));
          return { ...p, oa, ob, recorded, humanNote };
        })
        .filter((p) => p.oa.outcome !== p.ob.outcome),
    [cases],
  );

  const divergence = useMemo(() => {
    const byCode = new Map<string, { overrides: number; findings: number }>();
    for (const a of assessmentsById.values()) {
      const c = cases[a.id];
      for (const crit of a.criteria) {
        for (const code of crit.issueCodes) {
          const e = byCode.get(code) ?? { overrides: 0, findings: 0 };
          if (c?.accepted[crit.key] || c?.overrides[crit.key]) e.findings++;
          if (c?.overrides[crit.key]) e.overrides++;
          byCode.set(code, e);
        }
      }
    }
    return [...byCode.entries()]
      .filter(([, v]) => v.findings > 0)
      .sort(
        (x, y) =>
          y[1].overrides - x[1].overrides || y[1].findings - x[1].findings,
      );
  }, [cases]);

  const crossInsurer = useMemo(() => {
    return similarPairs
      .filter(
        (p) => rulesById.get(p.a)!.insurer !== rulesById.get(p.b)!.insurer,
      )
      .map((p) => ({ ...p, ca: cases[p.a], cb: cases[p.b] }))
      .filter(
        (p) =>
          p.ca?.decision || p.cb?.decision || p.ca?.proposed || p.cb?.proposed,
      );
  }, [cases]);

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">Consistency</div>
        <h1 className="text-3xl font-bold">Consistency monitor</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-muted)]">
          Similar rules should be treated similarly. This page watches for
          similar submissions with different outcomes, for findings that
          reviewers override often, and for decisions on similar rules from
          different insurers. Outcomes use the human decision where one exists
          and the AI recommendation otherwise.
        </p>
      </div>

      <section
        className="card p-4"
        data-tour="consistency"
        aria-labelledby="pairs-h"
      >
        <SectionTitle
          eyebrow={`${pairs.length} alerts`}
          title="Similar rules with different outcomes"
        >
          <span className="text-xs text-[var(--color-ink-muted)]">
            Similarity of 35% or more
          </span>
        </SectionTitle>
        {pairs.length ? (
          <ul className="space-y-3">
            {pairs.map((p) => (
              <li
                key={`${p.a}-${p.b}`}
                className="rounded-lg border border-[var(--color-line)] p-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">
                    {Math.round(p.similarity * 100)}% similar
                  </span>
                  <Side id={p.a} outcome={p.oa.outcome} source={p.oa.source} />
                  <GitCompareArrows
                    size={16}
                    aria-hidden
                    className="text-[var(--color-ink-faint)]"
                  />
                  <Side id={p.b} outcome={p.ob.outcome} source={p.ob.source} />
                  <Link
                    to={`/compare/${p.a}/${p.b}`}
                    className="btn btn-secondary ml-auto py-1 text-xs"
                  >
                    Side by side
                  </Link>
                </div>
                {p.recorded || p.humanNote ? (
                  <p className="mt-2 flex items-start gap-1 text-xs">
                    <CheckCircle2
                      size={13}
                      className="mt-0.5 shrink-0 text-[var(--color-pass-fg)]"
                      aria-hidden
                    />
                    <span>
                      <strong>Difference explained.</strong>{" "}
                      {p.recorded ?? "Explained in a reviewer rationale."}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-[var(--color-concern-fg)]">
                    No explanation recorded. Review both rules together.
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>
            No similar pairs currently have different outcomes.
          </EmptyState>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card min-w-0 p-4" aria-labelledby="div-h">
          <SectionTitle title="Human and AI divergence by issue code" />
          <p className="mb-2 text-xs text-[var(--color-ink-muted)]">
            Findings validated by reviewers, and how many were overridden. A
            code that is overridden often may need a clearer definition or a
            prompt change.
          </p>
          {divergence.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                    <th className="py-1">Issue code</th>
                    <th className="py-1 text-right">Validated</th>
                    <th className="py-1 text-right">Overridden</th>
                    <th className="py-1 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {divergence.slice(0, 15).map(([code, v]) => (
                    <tr
                      key={code}
                      className="border-t border-[var(--color-line-soft)]"
                    >
                      <td className="py-1">
                        <span className="font-mono text-xs">{code}</span>
                        <span className="block text-xs text-[var(--color-ink-muted)]">
                          {issueCodesByCode.get(code)?.label}
                        </span>
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {v.findings}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {v.overrides}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {Math.round((v.overrides / v.findings) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>No findings validated yet.</EmptyState>
          )}
        </section>

        <section className="card min-w-0 p-4" aria-labelledby="xi-h">
          <SectionTitle title="Decisions on similar rules across insurers" />
          <p className="mb-2 text-xs text-[var(--color-ink-muted)]">
            Pairs from different insurers where at least one rule has a human
            decision or proposal.
          </p>
          {crossInsurer.length ? (
            <ul className="space-y-2 text-sm">
              {crossInsurer.map((p) => (
                <li
                  key={`${p.a}-${p.b}`}
                  className="rounded-md border border-[var(--color-line)] p-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <XI id={p.a} />
                    <span className="text-xs text-[var(--color-ink-faint)]">
                      vs
                    </span>
                    <XI id={p.b} />
                    <Link
                      to={`/compare/${p.a}/${p.b}`}
                      className="ml-auto text-xs underline"
                    >
                      Compare
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>
              No human decisions on similar cross-insurer pairs yet.
            </EmptyState>
          )}
        </section>
      </div>
      <p className="text-xs text-[var(--color-ink-muted)]">
        The batch consistency audit run during the build is documented in
        deliverables/report/consistency-audit.md. Scoring weights: Level 2{" "}
        {framework.scoring.weights["2"]}, Level 3{" "}
        {framework.scoring.weights["3"]}, Level 4{" "}
        {framework.scoring.weights["4"]}.
      </p>
    </div>
  );

  function XI({ id }: { id: string }) {
    const c = cases[id];
    const d = c?.decision ?? c?.proposed;
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <Link
          to={`/rule/${id}`}
          className="font-semibold underline underline-offset-2"
        >
          {id}
        </Link>
        <span className="text-xs text-[var(--color-ink-muted)]">
          {rulesById.get(id)!.insurer}
        </span>
        {d ? (
          <RecBadge rec={DECISION_TO_OUTCOME[d.option] ?? "ESCALATED"} />
        ) : (
          <span className="text-xs">
            AI:{" "}
            {aiScores.get(id)!.recommendation.replace(/_/g, " ").toLowerCase()}
          </span>
        )}
      </span>
    );
  }
}

function Side({
  id,
  outcome,
  source,
}: {
  id: string;
  outcome: string;
  source: string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Link
        to={`/rule/${id}`}
        className="font-semibold text-[var(--color-pine-900)] underline underline-offset-2"
      >
        {id}
      </Link>
      <span className="text-xs text-[var(--color-ink-muted)]">
        {rulesById.get(id)!.insurer}
      </span>
      <RecBadge rec={outcome} />
      <span className="text-[11px] text-[var(--color-ink-muted)]">
        {source === "ai"
          ? "AI"
          : source === "proposed"
            ? "proposed"
            : "decided"}
      </span>
    </span>
  );
}
