# Spot check: 15 rules, re-read cold against the tool's output

**How this was done.** After all 100 assessments were scored and audited, I re-read 15 rules from the rule text and rationale only, wrote down the outcome I would recommend as a reviewer, and then compared it with the tool's recommendation (which comes from deterministic scoring of the findings).

**Honest limitation.** The same AI (Claude, in this build session) wrote the findings and did this spot check. It is a re-read, not an independent second opinion, so agreement here is weak evidence. A real validation would use human regulatory analysts and historical decisions. That is listed as a limitation in the report.

## Results

| Rule | Tool recommendation (score) | My cold read | Agree? | Notes |
|---|---|---|---|---|
| DR-002 impaired suspension, 5 years | Request more information (66.8), senior review | Request more information | Yes | The deciding question is whether roadside administrative suspensions are included. |
| DR-006 rebuilt after total loss | Approve with conditions (93.2) | Approve with conditions | Yes | Same as framework common rule FX-03. Condition: exception for vehicles with a valid structural inspection. |
| DR-007 under 21 | Recommend decline (37.8), senior review | Decline | Yes | The Code's insurance provision allows age distinctions on reasonable and bona fide grounds, so Level 1 is a concern, not a hard stop. The decline comes from the Level 2 discriminatory impact on new drivers. |
| DR-011 credit score below 600 | Recommend decline (27.7), Level 1 hard stop | Decline | Yes, with a caveat | The hard stop rests on the credit-information restriction, which could not be verified. If the restriction did not apply, Level 2 proxy and accessibility fails would still lead to decline. |
| DR-013 changed insurers more than 3 times in 2 years | Recommend decline (44.2), senior review | Decline | Yes | Close to non-compliant example NC-05. The tighter window narrows who is affected but does not change the defect. |
| DR-016 engine over 6.0 litres | Request more information (67.0) | Request more information | Yes | The insurer says it has data; ask for it and check work trucks. |
| DR-022 2 non-payment cancellations, 3 years | Request more information (67.2) | Request more information | Yes | Approved rules pair payment history with driving events; this one drops the driving element. |
| DR-033 improper, invalid or expired licence | Approve with conditions (89.7), senior review | Approve with conditions | Yes | Same as AP-12. Senior review is triggered by the Level 1 concern about administrative lapses (expired licence). |
| DR-043 volunteer emergency responders | Recommend decline (47.8) | Decline | Yes | Close to the 50 threshold. The deciding factor is the public policy fail; rating could address the exposure. |
| DR-060 vehicle registered in another province | Approve with conditions (86.2) | Approve with conditions | Yes | Jurisdictional product boundary. Condition: tell declined applicants where to get coverage. |
| DR-062 vehicle worth under $3,000 | Recommend decline (30.8), senior review | Decline | Yes | The concern belongs in an eligibility rule for optional collision coverage, which would be out of scope. |
| DR-071 stunt driving conviction, 5 years | Request more information (93.0) | Approve with conditions | **Partly** | Score is high (93), but the 5-year lookback is stricter than the approved 3-year Criminal Code rule, so prompt rule 17 marks the missing data as material and scoring routes it to request information. A reviewer could reasonably approve with a data condition. Kept the tool's output: it follows the rule applied to every other stricter-than-precedent submission (DR-002, DR-048, DR-065), which is the point of consistency. Good example for a reviewer override with a reason code. |
| DR-084 gross weight over 4,500 kg | Approve with conditions (89.7) | Approve with conditions | Yes | Condition: confirm the source of the 4,500 kg line. If no recognised boundary exists, this should move to request information. |
| DR-085 inconsistent application information | Recommend decline (46.5), senior review | Request more information | **No** | My cold read is that the underlying misrepresentation concern is legitimate and fixable with a materiality test and a correction step, so I would ask for a redraft. The findings themselves are fair (no chance to correct, subjective test), and they put the score just under 50. Kept the tool's output; flagged as a borderline case where a reviewer override to "Request information" with reason code "Weighs the evidence differently" would be reasonable. |
| DR-097 imported from outside North America, under 15 years | Recommend decline (50.0) | Request more information | **No** | The tool reads the rule literally: "imported from outside North America" covers most overseas-built cars, which triggers a high-severity accessibility fail. The rationale shows the insurer meant private grey-market imports. Reading rules literally is the right default for a regulator, because the rule as written is what the insurer would apply. A reviewer who confirms intent with the insurer could override to request information. |

**Agreement:** 12 of 15 full agreement, 1 partial (DR-071), 2 disagreements (DR-085, DR-097). All three differences are near a threshold or turn on how literally to read wording, which is exactly where the product asks for human judgment.

## Sanity anchors (brief section 8)

| Anchor | Expected direction | Tool result | Match |
|---|---|---|---|
| DR-012 racetrack | Approve with conditions; top similar rule is the racetrack precedent | Approve with conditions (96.5); top similarity candidate AP-07 at 0.896 | Yes |
| DR-001 3+ at-fault in 3 years | Approvable; less restrictive than approved "2 or more in 3 years" | Approve with conditions (96.5); AP-02 cited as less restrictive | Yes |
| DR-006 rebuilt | Likely approvable; check overbreadth | Approve with conditions (93.2); overbreadth noted at Level 2 accessibility | Yes |
| DR-005 primary language | Decline (protected-ground proxy) | Decline, Level 1 human rights hard stop | Yes |
| DR-007 under 21 | Examine the Code's insurance provision before concluding | Level 1 concern (insurance provision may apply), decline from Level 2 new-driver impact; senior review | Yes |
| DR-011 credit below 600 | Serious concern | Decline, Level 1 hard stop on restricted credit information (unverified) | Yes |
| DR-010 postal codes | Geographic proxy and accessibility concerns | Decline; proxy and accessibility high-severity fails | Yes |
| DR-013 insurer switching | Explain similarity and difference with the non-compliant example | Decline; NC-05 comparison explains narrower window, same defect | Yes |
| DR-002 impaired suspension | Distinguish administrative from conviction; likely request information | Request more information; definition question drives it | Yes |
| DR-008 Criminal Code convictions | Copycat flag despite matching a precedent | Approve with conditions; `COPYCAT_REFERENCE` at Level 3 with a condition | Yes |
| DR-009 cancelled by another insurer | Flag reliance on another insurer's decision | Decline; `COPYCAT_REFERENCE` high-severity fail | Yes |
| DR-096 child protective services | Decline | Decline (17.3) | Yes |
| DR-100 public advocacy | Decline | Decline (13.7) | Yes |

No anchor disagreed with my analysis, so none needed an override explanation. Note that calibration also used these anchors (prompt log entry 7), so matching them is partly by construction; they are not an independent test.
