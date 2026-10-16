import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import './layout.css';

const NAV = [
  { to: '/app', label: 'Ledger', end: true },
  { to: '/app/insights', label: 'Insights' },
  { to: '/app/imports', label: 'Imports' },
  { to: '/app/sort-out', label: 'Sort out' },
];

export function AppShell() {
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
        <ThemeToggle />
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
