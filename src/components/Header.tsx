import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Compass, Download, MessageCircleQuestion, MoreHorizontal, RotateCcw, UserRound } from 'lucide-react';
import { useStore } from '../store/store';
import { integrations } from '../config/integrations';
import { download } from '../lib/exporters';
import { cx } from './ui';
import type { Role } from '../lib/workflow';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/intake', label: 'Intake' },
  { to: '/consistency', label: 'Consistency monitor' },
  { to: '/precedents', label: 'Precedent library' },
  { to: '/how-it-works', label: 'How it works' },
];

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="6" fill="#C9A227" />
        <path d="M9 21.5c1.4 1.6 3.6 2.5 6.4 2.5 3.9 0 6.6-2 6.6-5 0-2.8-2.1-4-5.6-4.8l-1.9-.4c-2-.5-2.8-1.1-2.8-2.2 0-1.3 1.3-2.2 3.3-2.2 1.9 0 3.3.8 4.1 2l2.3-1.9C19.4 7.6 17.4 6.6 14.6 6.6c-3.7 0-6.2 2-6.2 4.8 0 2.6 1.9 4 5.3 4.7l1.9.4c2.2.5 3.2 1.1 3.2 2.4 0 1.4-1.4 2.4-3.6 2.4-2.1 0-3.8-.8-4.9-2.1z" fill="#05473A" />
      </svg>
      <span className="leading-tight">
        <span className="block font-serif text-lg font-bold tracking-tight text-white">Simrule</span>
        <span className="block text-[11px] text-[var(--color-pine-200)]">Decline-rule review workbench</span>
      </span>
    </span>
  );
}

export default function Header() {
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const resetDemo = useStore((s) => s.resetDemo);
  const setTourStep = useStore((s) => s.setTourStep);
  const audit = useStore((s) => s.audit);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  return (
    <header className="no-print border-b-4 border-[var(--color-gold-500)] bg-[var(--color-pine-900)] text-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <NavLink to="/" aria-label="Simrule home">
          <Wordmark />
        </NavLink>
        <nav aria-label="Main" className="order-3 w-full lg:order-none lg:w-auto">
          <ul className="flex flex-wrap gap-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cx('block rounded-md px-3 py-1.5 text-sm font-medium', isActive ? 'bg-white text-[var(--color-pine-900)]' : 'text-white/90 hover:bg-white/10 hover:text-white')
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {integrations.chatbaseHelpUrl && (
            <a href={integrations.chatbaseHelpUrl} target="_blank" rel="noreferrer" className="btn btn-ghost text-white hover:bg-white/10 hover:text-white">
              <MessageCircleQuestion size={16} aria-hidden /> Ask the Regulatory Assistant
            </a>
          )}
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => {
              navigate('/');
              setTourStep(0);
            }}
          >
            <Compass size={16} aria-hidden /> Guided demo
          </button>
          <label className="flex items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-sm">
            <UserRound size={16} aria-hidden />
            <span className="sr-only sm:not-sr-only">Role</span>
            <span className="relative">
              <select
                aria-label="Switch role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                data-testid="role-switcher"
                className="appearance-none rounded bg-white py-1 pr-7 pl-2 text-sm font-semibold text-[var(--color-pine-900)]"
              >
                <option>Analyst</option>
                <option>Senior reviewer</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute top-1.5 right-1.5 text-[var(--color-pine-900)]" aria-hidden />
            </span>
          </label>
          <div className="relative" ref={menuRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="btn btn-ghost text-white hover:bg-white/10 hover:text-white" aria-label="More actions">
              <MoreHorizontal size={18} aria-hidden />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 z-40 mt-1 w-64 rounded-lg border border-[var(--color-line)] bg-white p-1 text-[var(--color-ink)] shadow-xl">
                <button
                  role="menuitem"
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-[var(--color-pine-50)]"
                  onClick={() => {
                    download('simrule-audit-log.json', JSON.stringify(audit, null, 2), 'application/json');
                    setMenuOpen(false);
                  }}
                >
                  <Download size={15} aria-hidden /> Export full audit log (JSON)
                </button>
                <button
                  role="menuitem"
                  type="button"
                  data-testid="reset-demo"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-[var(--color-pine-50)]"
                  onClick={() => {
                    if (window.confirm('Reset all demo data? This clears your decisions, overrides, uploads and audit entries and restores the seeded queue.')) {
                      resetDemo();
                      navigate('/');
                    }
                    setMenuOpen(false);
                  }}
                >
                  <RotateCcw size={15} aria-hidden /> Reset demo data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
