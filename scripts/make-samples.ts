// Generates three fictional sample filings for the intake demo: PDF (clean, precedent-like), DOCX (proxy
// discrimination) and TXT (two out-of-scope eligibility rules). PDF is converted from DOCX with LibreOffice.
import { writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const OUT = 'deliverables/demo/sample-submissions';
mkdirSync(OUT, { recursive: true });

const NOTE = 'Fictional sample filing for the Simrule academic prototype. Not a real insurer or rule.';

function doc(title: string, fields: [string, string][][]): Document {
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }),
    new Paragraph({ children: [new TextRun({ text: NOTE, italics: true })] }),
  ];
  fields.forEach((rule, i) => {
    if (fields.length > 1) children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`Rule ${i + 1}`)] }));
    for (const [label, value] of rule) children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)] }));
  });
  return new Document({ creator: 'Simrule', title, sections: [{ children }] });
}

const clean: [string, string][] = [
  ['Submitting Insurer', 'Harbourline Mutual'],
  ['Date Submitted', '2024-12-02'],
  ['Proposed Decline Rule', 'Decline to insure any applicant with 1 or more convictions for auto insurance fraud in the preceding 10 years.'],
  ["Insurer's Stated Rationale", 'A conviction for auto insurance fraud is direct, proven evidence of moral hazard. A 10-year lookback matches the seriousness of the offence and current market practice for fraud convictions.'],
  ['Rule Category', 'Claims / Fraud History'],
  ['Definitions', 'Auto insurance fraud conviction means a conviction under the Criminal Code or the Insurance Act for fraud relating to an automobile insurance policy or claim.'],
  ['Actuarial Support', 'Claims severity and frequency study, 2019 to 2023 book of business, attached as Exhibit B (not included in this demo file).'],
  ['Consumer Notice', 'Declined applicants receive a letter naming the conviction relied on and explaining how to correct an inaccurate record.'],
];

const proxy: [string, string][] = [
  ['Submitting Insurer', 'Pinegate Assurance'],
  ['Date Submitted', '2024-12-05'],
  ['Proposed Decline Rule', 'Decline to insure any applicant whose primary language spoken at home is not English and who resides in a postal code with above-average claims costs.'],
  ["Insurer's Stated Rationale", 'Applicants who do not speak English at home in high-cost areas may misunderstand policy terms, and these areas generate higher claims costs across our portfolio.'],
  ['Rule Category', 'Demographic / Geographic'],
];

const eligibility: [string, string][][] = [
  [
    ['Submitting Insurer', 'Northlake General'],
    ['Date Submitted', '2024-12-09'],
    ['Proposed Decline Rule', 'Decline to offer optional collision coverage on any vehicle more than 15 years old.'],
    ["Insurer's Stated Rationale", 'The repair cost of older vehicles frequently exceeds their actual cash value, so collision coverage provides little value to the consumer.'],
    ['Rule Category', 'Vehicle Type'],
  ],
  [
    ['Proposed Decline Rule', 'Decline to offer third-party liability limits above $2,000,000 to applicants with 2 or more at-fault accidents in the preceding 3 years.'],
    ["Insurer's Stated Rationale", 'Higher limits concentrate severe-loss exposure on drivers with a demonstrated pattern of at-fault accidents.'],
    ['Rule Category', 'Driving Record'],
  ],
];

async function main() {
  const cleanDocx = join(OUT, 'harbourline-fraud-conviction-rule.docx');
  writeFileSync(cleanDocx, await Packer.toBuffer(doc('Underwriting rule filing: Harbourline Mutual', [clean])));
  execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', OUT, cleanDocx], { stdio: 'ignore', timeout: 120_000 });
  const pdf = join(OUT, 'harbourline-fraud-conviction-rule.pdf');
  if (!existsSync(pdf)) throw new Error('PDF conversion failed');
  // Keep only the PDF for the clean rule so the three samples use three different formats.
  renameSync(cleanDocx, join('/tmp', 'harbourline-source.docx'));

  writeFileSync(join(OUT, 'pinegate-language-postal-rule.docx'), await Packer.toBuffer(doc('Underwriting rule filing: Pinegate Assurance', [proxy])));

  const txt = [
    'Underwriting rule filing: Northlake General',
    NOTE,
    '',
    ...eligibility.flatMap((rule, i) => [`Rule ${i + 1}`, ...rule.map(([k, v]) => `${k}: ${v}`), '']),
  ].join('\n');
  writeFileSync(join(OUT, 'northlake-optional-coverage-rules.txt'), txt);
  console.log('Wrote 3 sample filings to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
