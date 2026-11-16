import { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useDebouncedValue } from '../../lib/hooks';
import { initialOf, personSubtitle } from './circleModel';
import { usePeople } from './useCircle';
import './circle.css';

/** A searchable list of your circle; choosing one calls onPick(person). Used by "Who is this?" on phone and desktop. */
export function PersonPicker({ onPick, selectedId, disabled = false }) {
  const [text, setText] = useState('');
  const search = useDebouncedValue(text.trim(), 200);
  const { data, isLoading, isError } = usePeople({ search: search || undefined, limit: 8 });
  const items = data?.data || [];
  const total = data?.meta?.circle ?? 0;
  return (
    <div className="circle-picker">
      <div className="circle-search">
        <MagnifyingGlass size={16} aria-hidden="true" className="circle-search__icon" />
        <input className="input" type="search" autoComplete="off" placeholder="Search your circle" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search your circle" />
      </div>
      {isError && <p className="import-error" role="alert">Your circle couldn’t load.</p>}
      {!isLoading && !isError && !items.length && (
        <p className="member-hint">{total ? 'No one matches.' : 'Your circle is empty. Import your contacts or add someone in Settings → Your circle.'}</p>
      )}
      <ul className="circle-picker__list">
        {items.map((p) => (
          <li key={p._id}>
            <button type="button" className={`circle-picker__item${p._id === selectedId ? ' is-selected' : ''}`} disabled={disabled} onClick={() => onPick(p)}>
              <span className="member-avatar" aria-hidden="true">{initialOf(p.name)}</span>
              <span className="member-list-info">
                <span className="member-list-name">{p.name}</span>
                <span className="member-hint">{personSubtitle(p)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {total > items.length && !search && <p className="member-hint">Type to search all {total.toLocaleString('en-IN')} people.</p>}
    </div>
  );
}
