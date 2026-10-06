/** Renders text with the active evidence quote highlighted (exact substring match). */
export default function Highlight({ text, quote }: { text: string; quote: string | null }) {
  if (!quote) return <>{text}</>;
  const i = text.indexOf(quote);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="evidence" data-testid="evidence-highlight">
        {text.slice(i, i + quote.length)}
      </mark>
      {text.slice(i + quote.length)}
    </>
  );
}
