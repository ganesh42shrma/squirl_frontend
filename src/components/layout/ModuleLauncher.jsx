import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, SquaresFour } from '@phosphor-icons/react';

const loadMenu = () => import('./ModuleMenu');
const ModuleMenu = lazy(loadMenu);

// The header button that opens the module menu (React Bits Staggered Menu). It shows the current
// module's name, or "Modules" on the dashboard and profile. The menu itself loads on first use.
export function ModuleLauncher({ module }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef(null);
  const { pathname } = useLocation();
  const Icon = module?.icon || SquaresFour;

  useEffect(() => setOpen(false), [pathname]); // following a link closes the menu
  const close = useCallback(() => setOpen(false), []);
  const toggle = () => {
    setMounted(true);
    setOpen((value) => !value);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`module-launcher${module ? ' is-module' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="module-menu"
        onClick={toggle}
        onPointerEnter={loadMenu}
        onFocus={loadMenu}
      >
        <Icon size={16} weight="duotone" aria-hidden="true" />
        <span className="module-launcher__label">{module?.label || 'Modules'}</span>
        <Plus size={14} weight="bold" aria-hidden="true" className="module-launcher__plus" />
      </button>
      {mounted && (
        <Suspense fallback={null}>
          <ModuleMenu open={open} onClose={close} returnFocusRef={buttonRef} />
        </Suspense>
      )}
    </>
  );
}
