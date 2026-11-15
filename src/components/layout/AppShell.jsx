import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { GuestModeToggle } from './GuestModeToggle';
import { ModuleLauncher } from './ModuleLauncher';
import { useGuestMode } from '../../lib/useGuestMode';
import { BackgroundNotices } from './BackgroundNotices';
import { MobileTabBar } from './MobileTabBar';
import { useIsMobile } from '../../hooks/useMedia';
import { QuoteFooter } from './QuoteFooter';
import { SystemToasts } from '../../features/tasks/SystemToasts';
import { CaptureLauncher } from '../../features/capture/CaptureLauncher';
import { useLogout, useMe } from '../../features/auth/useAuth';
import { DASHBOARD_PATH, PROFILE_PATH, SETTINGS_PATH, tabForPath } from '../../app/modules';
import './layout.css';
import './mobile.css';
import '../../features/profile/profile.css';

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Who's signed in, with Profile, Settings and Sign out. A native <details> keeps it keyboard-friendly.
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
        <Link to={PROFILE_PATH} className="account-menu__item">
          Profile
        </Link>
        <Link to={SETTINGS_PATH} className="account-menu__item">
          Settings
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

// The second header row: the current module's pages. Imports and Sort out sit after a divider.
function SubTabs({ module }) {
  const ref = useRef(null);
  const { pathname } = useLocation();
  // Keep the active tab in view on narrow screens.
  useEffect(() => {
    ref.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
  }, [pathname]);
  return (
    <nav className="shell__tabs" aria-label={`${module.label} sections`} ref={ref}>
      {module.tabs.map((tab, index) => (
        <span key={tab.path} className="shell__tab-wrap">
          {tab.group && module.tabs[index - 1]?.group !== tab.group && <span className="shell__tab-divider" role="separator" aria-orientation="vertical" />}
          <NavLink to={`${module.base}/${tab.path}`} className="shell__link shell__link--tab">
            {tab.label}
          </NavLink>
        </span>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { guestMode } = useGuestMode();
  const { pathname } = useLocation();
  const { module } = tabForPath(pathname);
  const isMobile = useIsMobile();
  // Lets fixed elements outside the shell (toasts) clear the tab bar.
  useEffect(() => {
    if (!isMobile) return undefined;
    document.documentElement.dataset.mobileShell = '';
    return () => { delete document.documentElement.dataset.mobileShell; };
  }, [isMobile]);
  return (
    <div className={`shell${isMobile ? ' shell--mobile' : ''}`}>
      <header className="shell__header">
        <div className="shell__bar">
          <Logo to={DASHBOARD_PATH} />
          {isMobile ? (
            <span className="shell__title">{module?.label || (pathname.startsWith(SETTINGS_PATH) ? 'Settings' : 'Home')}</span>
          ) : (
            <nav className="shell__nav" aria-label="Main">
              <NavLink to={DASHBOARD_PATH} end className="shell__link shell__link--dash">
                Dashboard
              </NavLink>
              <ModuleLauncher module={module} />
            </nav>
          )}
          <CaptureLauncher />
          <GuestModeToggle />
          <ThemeToggle />
          {!isMobile && <AccountMenu />}
        </div>
        {module && module.tabs.length > 1 && <SubTabs module={module} />}
      </header>
      {/* Rebuild views and close open editors when privacy changes, including memoized
          ledger rows and animated figures, so no previous amount stays on screen. */}
      <main className="shell__main" key={guestMode ? 'guest' : 'private'}>
        <Outlet />
      </main>
      {!isMobile && <QuoteFooter />}
      <BackgroundNotices />
      <SystemToasts />
      {isMobile && <MobileTabBar />}
    </div>
  );
}
