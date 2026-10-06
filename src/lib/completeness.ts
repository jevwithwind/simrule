// Prototype completeness checklist. Items come from the framework and from a summary of FSRA's
// Filing Guidelines for Underwriting Rules that could not be fetched and verified.
import framework from '../../knowledge/framework.json';

export interface SubmissionFields {
  insurer?: string;
  dateSubmitted?: string;
  ruleText?: string;
  rationale?: string;
  category?: string;
  definitions?: string;
  actuarial?: string;
  consumerNotice?: string;
  /** Present only for uploaded filings that include package documents. */
  packageDocs?: { summaryForm?: boolean; certificate?: boolean; consolidatedList?: boolean };
}

export type ItemState = 'present' | 'missing' | 'not_in_summary';

export interface ChecklistRow {
  key: string;
  label: string;
  source: string;
  state: ItemState;
  note?: string;
}

const has = (s?: string) => !!s && s.trim().length > 2;

export function runChecklist(f: SubmissionFields, scopeInScope: boolean | null, isSummaryRecord: boolean): ChecklistRow[] {
  return framework.completenessChecklist.items.map((item) => {
    let state: ItemState = 'missing';
    let note: string | undefined;
    switch (item.key) {
      case 'INSURER':
        state = has(f.insurer) ? 'present' : 'missing';
        break;
      case 'DATE':
        state = has(f.dateSubmitted) ? 'present' : 'missing';
        break;
      case 'RULE_TEXT':
        state = has(f.ruleText) ? 'present' : 'missing';
        break;
      case 'RATIONALE':
        state = has(f.rationale) ? 'present' : 'missing';
        break;
      case 'CATEGORY':
        state = has(f.category) ? 'present' : 'missing';
        break;
      case 'SCOPE':
        state = scopeInScope === null ? 'missing' : 'present';
        note = scopeInScope === false ? 'Out of scope: eligibility rule' : undefined;
        break;
      case 'DEFINITIONS':
        state = has(f.definitions) ? 'present' : 'missing';
        break;
      case 'ACTUARIAL':
        state = has(f.actuarial) ? 'present' : 'missing';
        note = state === 'missing' ? 'A stated claim that data exists is not the data.' : undefined;
        break;
      case 'CONSUMER_NOTICE':
        state = has(f.consumerNotice) ? 'present' : 'missing';
        break;
      case 'SUMMARY_FORM':
        state = f.packageDocs?.summaryForm ? 'present' : isSummaryRecord ? 'not_in_summary' : 'missing';
        break;
      case 'CERTIFICATE':
        state = f.packageDocs?.certificate ? 'present' : isSummaryRecord ? 'not_in_summary' : 'missing';
        break;
      case 'CONSOLIDATED_LIST':
        state = f.packageDocs?.consolidatedList ? 'present' : isSummaryRecord ? 'not_in_summary' : 'missing';
        break;
    }
    return { key: item.key, label: item.label, source: item.source, state, note };
  });
}

export function checklistSummary(rows: ChecklistRow[]): { present: number; missing: number; notInSummary: number; total: number } {
  return {
    present: rows.filter((r) => r.state === 'present').length,
    missing: rows.filter((r) => r.state === 'missing').length,
    notInSummary: rows.filter((r) => r.state === 'not_in_summary').length,
    total: rows.length,
  };
}
