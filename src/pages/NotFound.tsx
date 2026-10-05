import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">That rule or page does not exist in this prototype.</p>
      <Link to="/" className="btn btn-primary mt-4">
        Back to the queue
      </Link>
    </div>
  );
}
