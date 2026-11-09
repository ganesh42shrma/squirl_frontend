import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CaretRight, Check, MagnifyingGlass, Question, X } from '@phosphor-icons/react';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { MONEY_TYPES, MONEY_TYPE_ORDER } from '../../lib/moneyTypes';
import { useCategories } from './useCategories';
import './categoryPicker.css';

const RECENT_KEY = 'squirl-recent-categories';
const RECENT_MAX = 6;

// Recently picked categories (this browser only; ids from another account are simply not found).
function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}
function rememberRecent(id) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((r) => r !== id)].slice(0, RECENT_MAX)));
  } catch {
    /* storage blocked: no recents */
  }
}

/**
 * A button that opens the category dialog. Same props as the old <select>-based CategorySelect:
 *   value, onChange(id | null | 'none'), placeholder (button text when empty), allowNone ("Not sorted yet"),
 *   clearLabel (the "no selection" choice, e.g. "All categories"), defaultOpen + onClose (open straight
 *   away, e.g. when a ledger cell is clicked), className, aria-label, title (dialog heading).
 */
export function CategoryPicker({
  value,
  onChange,
  placeholder = 'Category',
  allowNone = false,
  clearLabel = 'No category',
  defaultOpen = false,
  onClose,
  className = '',
  title,
  'aria-label': ariaLabel,
}) {
  const { byId, labelOf } = useCategories();
  const [open, setOpen] = useState(defaultOpen);

  const label = value === 'none' ? 'Not sorted yet' : value && byId.has(value) ? labelOf(value) : placeholder;
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  const pick = (id) => {
    if (id && id !== 'none') rememberRecent(id);
    onChange(id);
    close();
  };

  return (
    <>
      <button
        type="button"
        className={`select picker-trigger${value ? ' has-value' : ''} ${className}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={ariaLabel ? `${ariaLabel}: ${label}` : undefined}
        title={label}
      >
        {value && value !== 'none' && <CategoryIcon id={value} size={16} />}
        <span className="picker-trigger__label">{label}</span>
      </button>
      {open &&
        createPortal(
          // Portalled to <body> so clicks inside never reach the row or bar that holds the button.
          <PickerDialog
            value={value}
            allowNone={allowNone}
            clearLabel={clearLabel}
            title={title || ariaLabel || 'Choose a category'}
            onPick={pick}
            onDismiss={close}
          />,
          document.body,
        )}
    </>
  );
}

function PickerDialog({ value, allowNone, clearLabel, title, onPick, onDismiss }) {
  const { tree, byId, categories } = useCategories();
  const dialogRef = useRef(null);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const current = value && byId.get(value);
  const [activeId, setActiveId] = useState(current ? current.parent || current._id : tree[0]?._id);
  // Phones show one pane at a time: the main list, then a category's subcategories.
  const [pane, setPane] = useState(current ? 'sub' : 'main');

  // Native modal dialog: focus is trapped inside, Esc fires "cancel", the page behind is inert.
  // Opened once; the latest onDismiss is read through a ref so re-renders don't reopen it.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    searchRef.current?.focus();
    const onCancel = (e) => {
      e.preventDefault();
      dismissRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, []);

  const groups = useMemo(
    () =>
      MONEY_TYPE_ORDER.map((type) => ({ type, label: MONEY_TYPES[type].label, parents: tree.filter((p) => p.type === type) })).filter(
        (g) => g.parents.length,
      ),
    [tree],
  );
  const active = tree.find((p) => p._id === activeId);
  const recent = useMemo(() => readRecent().filter((id) => byId.has(id)), [byId]);

  // Search across every category. At least one word must be in the category's own name; the
  // parent's name can narrow it ("food del" → Food & Drinks › Food Delivery) but never matches
  // alone, so "gro" finds Groceries, not every subcategory of "Education & Growth".
  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    return categories
      .map((c) => {
        const parent = c.parent ? byId.get(c.parent) : null;
        const own = c.name.toLowerCase();
        const parentName = parent ? parent.name.toLowerCase() : '';
        if (!words.some((w) => own.includes(w))) return null;
        if (!words.every((w) => own.includes(w) || parentName.includes(w))) return null;
        // Names starting with what was typed come first, then subcategories before main ones.
        const rank = (c.name.toLowerCase().startsWith(words[0]) ? 0 : 2) + (parent ? 0 : 1);
        return { category: c, parent, rank };
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank || a.category.name.localeCompare(b.category.name))
      .slice(0, 60);
  }, [query, categories, byId]);

  useEffect(() => setHighlight(0), [query]);
  useEffect(() => {
    resultsRef.current?.querySelector('[data-highlighted="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const onSearchKey = (e) => {
    if (!results?.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onPick(results[highlight].category._id);
    }
  };

  const openParent = (id) => {
    setActiveId(id);
    setPane('sub');
  };

  return (
    // A click on the backdrop lands on the <dialog> element itself: close.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog ref={dialogRef} className="picker" aria-labelledby="picker-title" data-pane={pane} onClick={(e) => e.target === dialogRef.current && onDismiss()}>
      <div className="picker__frame">
        <header className="picker__head">
          <h2 id="picker-title">{title}</h2>
          <button type="button" className="picker__close" onClick={onDismiss} aria-label="Close">
            <X size={18} />
          </button>
          <label className="picker__search">
            <MagnifyingGlass size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search categories"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              aria-label="Search categories"
              aria-controls="picker-results"
              autoComplete="off"
            />
          </label>
        </header>

        {results ? (
          <ul className="picker__results" id="picker-results" ref={resultsRef} role="listbox" aria-label="Matching categories">
            {results.length === 0 && <li className="picker__empty">No category matches “{query}”.</li>}
            {results.map(({ category, parent }, i) => (
              <li key={category._id} role="option" aria-selected={category._id === value}>
                <button
                  type="button"
                  className="picker__option"
                  data-highlighted={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => onPick(category._id)}
                >
                  <CategoryIcon id={category._id} />
                  <span className="picker__option-text">
                    {parent ? (
                      <>
                        <span className="picker__muted">{parent.name} › </span>
                        {category.name}
                      </>
                    ) : (
                      <>
                        {category.name} <span className="picker__muted">(main category)</span>
                      </>
                    )}
                  </span>
                  <span className="picker__type">{MONEY_TYPES[category.type]?.label}</span>
                  {category._id === value && <Check size={16} weight="bold" className="picker__check" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {recent.length > 0 && (
              <div className="picker__recent" aria-label="Recently used">
                <span className="picker__recent-label">Recent</span>
                {recent.map((id) => (
                  <button key={id} type="button" className={`picker__chip${id === value ? ' is-selected' : ''}`} onClick={() => onPick(id)}>
                    <CategoryIcon id={id} size={14} />
                    {byId.get(id).name}
                  </button>
                ))}
              </div>
            )}
            <div className="picker__panes">
              <nav className="picker__mains" aria-label="Main categories">
                {groups.map((group) => (
                  <div key={group.type} className="picker__group">
                    <p className="picker__group-label">
                      <span className="picker__dot" style={{ background: MONEY_TYPES[group.type].viz }} aria-hidden="true" />
                      {group.label}
                    </p>
                    {group.parents.map((p) => {
                      const holdsValue = current && (current._id === p._id || current.parent === p._id);
                      return (
                        <button
                          key={p._id}
                          type="button"
                          className={`picker__main${p._id === activeId ? ' is-active' : ''}`}
                          onClick={() => openParent(p._id)}
                          aria-current={p._id === activeId ? 'true' : undefined}
                        >
                          <CategoryIcon id={p._id} />
                          <span className="picker__main-name">{p.name}</span>
                          {holdsValue && <span className="picker__dot picker__dot--selected" aria-label="contains the current choice" />}
                          <CaretRight size={14} className="picker__caret" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <section className="picker__subs" aria-label={active ? `${active.name} subcategories` : 'Subcategories'}>
                {active && (
                  <>
                    <div className="picker__subs-head">
                      <button type="button" className="picker__back" onClick={() => setPane('main')} aria-label="Back to main categories">
                        <ArrowLeft size={16} />
                      </button>
                      <CategoryIcon id={active._id} size={20} />
                      <h3>{active.name}</h3>
                    </div>
                    <ul className="picker__sub-list">
                      {/* The main category itself, for anything that doesn't fit a subcategory. */}
                      <li>
                        <button type="button" className={`picker__option picker__option--other${value === active._id ? ' is-selected' : ''}`} onClick={() => onPick(active._id)}>
                          <CategoryIcon id={active._id} />
                          <span className="picker__option-text">
                            Other in {active.name}
                            <span className="picker__hint">When none of these fit</span>
                          </span>
                          {value === active._id && <Check size={16} weight="bold" className="picker__check" aria-hidden="true" />}
                        </button>
                      </li>
                      {active.children.map((child) => (
                        <li key={child._id}>
                          <button type="button" className={`picker__option${value === child._id ? ' is-selected' : ''}`} onClick={() => onPick(child._id)}>
                            <CategoryIcon id={child._id} />
                            <span className="picker__option-text">{child.name}</span>
                            {value === child._id && <Check size={16} weight="bold" className="picker__check" aria-hidden="true" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            </div>
          </>
        )}

        {(allowNone || value) && (
          <footer className="picker__foot">
            {allowNone && (
              <button type="button" className={`picker__chip${value === 'none' ? ' is-selected' : ''}`} onClick={() => onPick('none')}>
                <Question size={14} weight="duotone" aria-hidden="true" />
                Not sorted yet
              </button>
            )}
            {value && (
              <button type="button" className="picker__chip" onClick={() => onPick(null)}>
                {clearLabel}
              </button>
            )}
          </footer>
        )}
      </div>
    </dialog>
  );
}
