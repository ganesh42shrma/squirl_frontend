import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { GuestModeToggle } from './GuestModeToggle';
import { useGuestMode } from '../../lib/useGuestMode';
import { BackgroundNotices } from './BackgroundNotices';
import { useLogout, useMe } from '../../features/auth/useAuth';
import './layout.css';
import '../../features/profile/profile.css';

const NAV = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/ledger', label: 'Ledger' },
  { to: '/app/highlights', label: 'Highlights' },
  { to: '/app/payments', label: 'EMIs & bills' },
  { to: '/app/goals', label: 'Goals' },
  { to: '/app/live', label: 'Live' },
  { to: '/app/imports', label: 'Imports' },
  { to: '/app/sort-out', label: 'Sort out' },
];

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Who's signed in, with Profile and Sign out. A native <details> keeps it keyboard-friendly.
function AccountMenu() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);

  // Close on navigation and on clicks outside.
  useEffect(() => ref.current?.removeAttribute('open'), [location.pathname]);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && ref.current.removeAttribute('open');
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!me) return null;
  return (
    <details className="account-menu" ref={ref}>
      <summary aria-label={`Account: ${me.name}`}>
        <span className="avatar">{initialsOf(me.name)}</span>
      </summary>
      <div className="account-menu__panel">
        <p className="account-menu__who">
          {me.name}
          <span>{me.email}</span>
        </p>
        <Link to="/app/profile" className="account-menu__item">
          Profile
        </Link>
        <button
          type="button"
          className="account-menu__item"
          onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })}
        >
          Sign out
        </button>
      </div>
    </details>
  );
}

export function AppShell() {
  const { guestMode } = useGuestMode();
  return (
    <div className="shell">
      <header className="shell__header">
        <Logo to="/app" />
        <nav className="shell__nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="shell__link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <GuestModeToggle />
        <ThemeToggle />
        <AccountMenu />
      </header>
      {/* Rebuild views and close open editors when privacy changes, including memoized
          ledger rows and animated figures, so no previous amount stays on screen. */}
      <main className="shell__main" key={guestMode ? 'guest' : 'private'}>
        <Outlet />
      </main>
      <BackgroundNotices />
    </div>
  );
}
