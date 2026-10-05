# Accessibility check (axe-core)

Automated scan with @axe-core/playwright against WCAG 2.0 and 2.1 A and AA rules, run by `npx playwright test e2e/a11y.spec.ts` on the production build. Automated checks catch roughly a third of accessibility issues; keyboard and screen-reader checks are still needed.

| Screen | Rules passed | Violations (impact, nodes) |
|---|---|---|
| `#/` | 30 | none |
| `#/intake` | 26 | none |
| `#/rule/DR-005` | 30 | none |
| `#/rule/DR-012` | 27 | none |
| `#/rule/DR-071` | 27 | none |
| `#/compare/DR-012/AP-07` | 20 | none |
| `#/consistency` | 22 | none |
| `#/precedents` | 22 | none |
| `#/how-it-works` | 23 | none |

Known design decision: the request-more-information chart colour (#c9a227) is under 3:1 against the surface, so every chart ships a legend, tooltips and a table view, and status is never shown by colour alone.
