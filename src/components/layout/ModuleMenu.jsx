import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { StaggeredMenu } from '../reactbits/StaggeredMenu';
import { MODULES, TOP_LEVEL, moduleForPath } from '../../app/modules';
import { useUnsortedCount } from '../../features/ledger/useTransactions';
import { useTasksOverview } from '../../features/tasks/useTasks';

// The module launcher's panel: Dashboard, each module, Profile, plus a module's quick links.
// Loaded the first time the launcher opens, so the animation library stays out of the first paint.
export default function ModuleMenu({ open, onClose, returnFocusRef }) {
  const { pathname } = useLocation();
  const current = moduleForPath(pathname);
  const unsorted = useUnsortedCount();
  const tasks = useTasksOverview();

  const items = useMemo(() => {
    const quest = tasks.data?.quest;
    const badges = {
      finance: unsorted.data > 0 ? `${unsorted.data} to sort` : null,
      tasks: quest && quest.total > 0 && quest.status !== 'none' ? `Daily Quest ${quest.done}/${quest.total}` : null,
    };
    const dashboard = TOP_LEVEL.find((t) => t.id === 'dashboard');
    return [
      { id: dashboard.id, label: dashboard.label, to: dashboard.to, description: dashboard.blurb, current: pathname === dashboard.to },
      ...MODULES.map((m) => ({ id: m.id, label: m.label, to: m.tabs[0] ? `${m.base}/${m.tabs[0].path}` : m.base, description: m.blurb, badge: badges[m.id], current: current?.id === m.id })),
    ];
  }, [pathname, current, unsorted.data, tasks.data]);

  const quick = current?.quick || MODULES.flatMap((m) => m.quick.slice(0, 1));
  return (
    <StaggeredMenu
      id="module-menu"
      open={open}
      onClose={onClose}
      title="Where to?"
      items={items}
      quickTitle={current ? `Quick links · ${current.label}` : 'Quick links'}
      quickItems={quick}
      returnFocusRef={returnFocusRef}
    />
  );
}
