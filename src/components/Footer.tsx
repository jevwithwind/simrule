export const DISCLAIMER =
  'Academic prototype for Ivey Online coursework. Not affiliated with or representative of the Financial Services Regulatory Authority of Ontario (FSRA). All insurer submissions and precedent records are fictional.';

export default function Footer() {
  return (
    <footer className="sticky bottom-0 z-20 border-t border-[var(--color-pine-800)] bg-[var(--color-pine-900)] text-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-xs sm:px-6">
        <p className="leading-snug">{DISCLAIMER}</p>
        <p className="whitespace-nowrap text-[var(--color-gold-200)]">AI output is advisory. Humans decide.</p>
      </div>
    </footer>
  );
}
