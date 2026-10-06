# Simrule Regulatory Assistant: Q&A pairs

Add each pair to the Chatbase agent as a Q&A source. Answers use the same vocabulary as the Simrule app (`knowledge/framework.json`). 28 pairs, grouped by the capability they cover.

> Academic prototype for Ivey Online coursework. Not affiliated with or representative of the Financial Services Regulatory Authority of Ontario (FSRA). All insurer submissions and precedent records are fictional.

## A. Regulatory requirements and process

**1. What is Take All Comers?**
In Ontario, private insurers may not decline auto insurance unless the regulator has approved the ground in advance. This is Take All Comers, based on the Insurance Act. An insurer must quote and accept every consumer who meets its approved underwriting rules. (Source 02.)

**2. What is an underwriting decline rule?**
An insurer's approved right to decline to offer an auto insurance policy to a consumer. It is an approved exception to Take All Comers. A rule usually has a trigger, often a threshold and a lookback period, and the insurer's rationale. (Source 02.)

**3. What is the difference between a decline rule and an eligibility rule?**
A decline rule declines the whole policy and is in scope for Simrule. An eligibility rule sets criteria for optional coverages or limits, such as collision coverage on older vehicles. Eligibility rules are out of scope and go to the eligibility-rule process (issue code OUT_OF_SCOPE_ELIGIBILITY). (Sources 01, 02.)

**4. What are the four Levels of the framework?**
Level 1 Basic Compliance (legislation and guidance, human rights, market check) is a gate. Level 2 Interpretation of Principles and Fair Consumer Outcomes (weight 40). Level 3 checks the rule is not subjective or arbitrary and has a direct link to risk (weight 35). Level 4 Public Policy Filter (weight 25). There are 15 criteria in total. (Source 03.)

**5. How does Simrule turn findings into a recommendation?**
The AI records findings only. Fixed scoring code applies these rules in order: eligibility rule, Out of scope; any Level 1 fail, Recommend decline; any high-severity fail at Levels 2 to 4, Recommend decline; score below 50, Recommend decline; score 50 to 74 or a material information gap, Request more information; 75 or above, Approve with conditions. (Source 03.)

**6. If another insurer already has the same rule, will mine be approved?**
Not automatically. The framework says an existing rule at another insurer is a consideration, not a guarantee, and approved rules are not approved forever. A match is recorded as PRECEDENT_APPROVED_MATCH at Level 1, but Levels 2 to 4 are still assessed and supporting analysis is still expected. (Sources 02, 05.)

**7. What does Level 1 hard stop mean?**
Any Level 1 criterion that does not meet the standard, for example a rule that uses a protected ground under the Human Rights Code. The framework treats this as a full-stop refusal, so Simrule recommends decline regardless of the score. A human reviewer still makes the decision. (Source 03.)

**8. What are the six principles used at Level 2?**
Accurate pricing and underwriting; absence of unfair discrimination, bias or proxies; accessible products and coverages; cost mitigation; balanced profitability and consumer interests; and clear consumer communications. Each has a fair consumer outcome that a rule should support. (Source 04.)

## B. Information required by application type

**9. What should every decline rule filing include?**
The insurer, date, rule wording, stated rationale and category; confirmation it is a decline rule; definitions of key terms; actuarial data or analysis; and how declined consumers are told the reason. The package also needs a summary of information form, a certificate of an official and a consolidated rules list (from filing guidelines; check the official version). (Source 06.)

**10. What should a driving record rule include?**
The event type (at-fault accident, minor or major conviction, Criminal Code conviction), the number, the lookback period, and which drivers it applies to, plus data for the threshold. Use convictions, not charges. An approved example is 2 or more at-fault accidents in the preceding 3 years. (Source 06.)

**11. What should a vehicle use rule include?**
A clear definition of the use (for example commercial purposes or racing), whether occasional use counts, and why personal auto coverage does not fit. Approved examples include commercial use and use on a racetrack. Avoid undefined words like "regular" and consider whether an endorsement would work instead. (Source 06.)

**12. What should a vehicle type rule include?**
An objective definition or list of the modifications or vehicle status and how it is verified. Approved examples include vehicles modified for speed. Define words like "unacceptable" or "high-performance". Theft-risk declines, such as "top stolen models", are a non-compliant example in the framework. (Source 06.)

**13. What should a claims or fraud history rule include?**
Whether the trigger is a conviction or other final finding, the lookback, and the definition used. An approved example is 1 or more auto insurance fraud convictions in 10 years. Suspicion or an investigation without a final outcome raises ALLEGATION_NOT_CONVICTION. (Source 06.)

**14. What should a payment history rule include?**
The number of non-payment cancellations, the lookback, and whether the debt is owed to this insurer or its affiliates. Credit scores, bankruptcy and collections are restricted factors (PROHIBITED_FACTOR). (Source 06.)

**15. Can a decline rule be based on location or postal code?**
The framework's examples include no approved geographic decline rule. Location is a rating factor, so a full decline is hard to justify. Postal codes can act as proxies for protected grounds and can cut whole communities off from mandatory coverage. A reviewer would ask why rating is not enough. (Source 06.)

**16. What should a licensing rule include?**
The requirement, who must hold the licence and how other provinces' or countries' licences are treated. Approved examples: no driver holds a valid Canadian licence; improper class or invalid licence. Declining new drivers or newcomers, or using administrative lapses, raises concerns. (Source 06.)

## C. Common compliance issues and how to address them

**17. What are the most common reasons a rule is rejected?**
The framework lists six: not risk-relevant, vague language, copycat rule, human rights violation, contrary to legislation, and discriminatory impact on new drivers or drivers new to Canada. Each maps to Simrule issue codes. (Source 05.)

**18. What is a proxy for a protected ground, and how do I fix it?**
A neutral-looking factor that closely tracks a protected ground, such as language spoken or neighbourhood. Issue code PROXY_FOR_PROTECTED_GROUND. Replace it with a direct, behaviour-based risk factor and test the rule for disparate impact. (Sources 04, 05.)

**19. Our rationale says other insurers use this rule. Is that a problem?**
It can be. Relying on another insurer's decision or "industry practice" is a copycat reference (COPYCAT_REFERENCE). Justify the rule with your own risk analysis instead. (Source 05.)

**20. What if we have no actuarial data yet?**
Missing data alone is not a reason to decline, but it is recorded as Insufficient information (NO_ACTUARIAL_SUPPORT). For a new rule resting on a statistical claim it is usually medium severity, which leads to Request more information. Approval with conditions normally requires filing the analysis before use. (Sources 03, 06.)

**21. How do we fix vague language?**
Define every key term so the rule applies the same way to every applicant (VAGUE_LANGUAGE), and replace judgment calls with objective criteria (SUBJECTIVE_JUDGMENT). Words like "excessive", "frequent" or "high-risk" need definitions. (Source 05.)

**22. What is a less restrictive alternative?**
A tool that manages the risk without a full decline: rating, an endorsement, a driver exclusion or a verification step. Issue code LESS_RESTRICTIVE_ALTERNATIVE. Because auto insurance is compulsory, a decline has a large effect on the consumer. (Sources 04, 05.)

## D. Guiding users through the review workflow

**23. What are the workflow stages?**
Received; Intake and completeness check; AI pre-assessment; Analyst review; Information requested; Senior sign-off; Decision recorded; Closed. (Source 07.)

**24. How does a reviewer use Simrule on a rule?**
Confirm the extraction, read the AI recommendation (advisory) and its evidence, accept or override all 15 findings (an override needs a reason code and note), choose a decision, draft and edit the rationale, then tick "I have reviewed this rationale and take ownership of it". (Source 07.)

**25. When is senior sign-off required?**
When the decision differs from the AI recommendation, a Level 1 finding is overridden, AI confidence is low, the AI flagged a Level 1 concern, or the analyst escalates. The senior reviewer signs off or returns it with a note. (Source 07.)

**26. How does Simrule keep decisions consistent?**
One framework and issue-code list for every rule, deterministic scoring, a similar-rules panel with reasons, "Review together" for pending look-alikes, and a consistency monitor that flags similar rules with different outcomes. (Sources 01, 07.)

## E. Acknowledging limits

**27. Will my rule be approved?**
I can't predict or decide that. Only the regulator's reviewers decide, after a full review. I can walk you through how a rule like yours would be evaluated against Levels 1 to 4 and what the filing should include. For your specific filing, please contact the regulator or a qualified professional. (Source 09.)

**28. Can you tell me which section of the Insurance Act applies?**
I can't give section numbers. My sources hold legal references at instrument level because they could not be verified against the official text. Please read the current text on ontario.ca/laws and consult a qualified professional for legal interpretation. (Sources 08, 09.)
