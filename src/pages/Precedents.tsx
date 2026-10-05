import { Link } from "react-router-dom";
import { precedents, rulesById, decisionLabel } from "../data";
import { useStore } from "../store/store";
import { DecisionBadge, EmptyState, SectionTitle } from "../components/ui";

export default function Precedents() {
  const cases = useStore((s) => s.cases);
  const approved = precedents.filter((p) => p.type === "approved_precedent");
  const common = precedents.filter(
    (p) => p.type === "framework_common_example",
  );
  const nonCompliant = precedents.filter(
    (p) => p.type === "illustrative_non_compliant",
  );
  const decided = Object.values(cases)
    .filter(
      (c) =>
        c.decision &&
        c.decision.option !== "REQUEST_INFORMATION" &&
        rulesById.has(c.id),
    )
    .sort((a, b) => (b.decision!.at > a.decision!.at ? 1 : -1));

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">Precedent registry</div>
        <h1 className="text-3xl font-bold">Precedent library</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-muted)]">
          The Level 1 market check compares each submission with these records.
          Approved rules come from the framework deck; the insurer names and
          approval years were invented for this prototype and are marked
          illustrative. Reviewer decisions made in Simrule are added at the
          bottom and become precedents for later reviews.
        </p>
      </div>

      <section className="card p-4">
        <SectionTitle
          eyebrow={`${approved.length} rules`}
          title="Approved precedents (illustrative)"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                <th className="py-1">Id</th>
                <th className="py-1">Approved rule</th>
                <th className="py-1">Insurer (fictional)</th>
                <th className="py-1">Year</th>
                <th className="py-1">Category</th>
              </tr>
            </thead>
            <tbody>
              {approved.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--color-line-soft)] align-top"
                >
                  <td className="py-1.5 pr-2 font-semibold">{p.id}</td>
                  <td className="py-1.5 pr-2">{p.ruleText}</td>
                  <td className="py-1.5 pr-2">{p.insurer}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{p.approvalYear}</td>
                  <td className="py-1.5 text-xs text-[var(--color-ink-muted)]">
                    {p.categories.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <SectionTitle
            eyebrow="Framework slide 3"
            title="Common decline rules"
          />
          <ul className="space-y-2 text-sm">
            {common.map((p) => (
              <li key={p.id}>
                <span className="font-semibold">{p.id}</span> {p.ruleText}
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-4">
          <SectionTitle
            eyebrow="Framework slide 5"
            title="Illustrative non-compliant examples"
          />
          <ul className="space-y-2 text-sm">
            {nonCompliant.map((p) => (
              <li key={p.id}>
                <span className="font-semibold">{p.id}</span> {p.ruleText}
                <span className="block text-xs text-[var(--color-ink-muted)]">
                  Level {p.level}: {p.reason}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-4">
        <SectionTitle
          eyebrow={`${decided.length} decisions`}
          title="Reviewer decisions made in Simrule"
        />
        {decided.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                  <th className="py-1">Rule</th>
                  <th className="py-1">Wording</th>
                  <th className="py-1">Decision</th>
                  <th className="py-1">By</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-[var(--color-line-soft)] align-top"
                  >
                    <td className="py-1.5 pr-2">
                      <Link
                        to={`/rule/${c.id}`}
                        className="font-semibold underline underline-offset-2"
                      >
                        {c.id}
                      </Link>
                      <span className="block text-xs text-[var(--color-ink-muted)]">
                        {rulesById.get(c.id)!.insurer}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2">
                      {rulesById.get(c.id)!.ruleText}
                    </td>
                    <td
                      className="py-1.5 pr-2"
                      title={decisionLabel(c.decision!.option)}
                    >
                      <DecisionBadge option={c.decision!.option} />
                    </td>
                    <td className="py-1.5 text-xs">
                      {c.decision!.by}
                      {c.decision!.signedOffBy && (
                        <span className="block text-[var(--color-ink-muted)]">
                          signed off by {c.decision!.signedOffBy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>No decisions yet.</EmptyState>
        )}
      </section>
    </div>
  );
}
