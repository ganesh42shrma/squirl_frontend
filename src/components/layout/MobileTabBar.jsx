import { Link, useLocation } from 'react-router-dom';
import { mobileTabs, moduleForPath } from '../../app/modules';

// The phone's navigation: one thumb-reach bar at the bottom, built from the module registry.
export function MobileTabBar() {
  const { pathname } = useLocation();
  const inModule = moduleForPath(pathname);
  return (
    <nav className="tabbar" aria-label="Main">
      {mobileTabs().map(({ id, label, to, end, icon: Icon, base }) => {
        const active = base ? inModule?.base === base : end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link key={id} to={to} className={`tabbar__item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
            <Icon size={24} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
