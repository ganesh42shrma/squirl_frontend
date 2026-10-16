import { useState } from 'react';

/** Text that turns into an input on click. Enter or leaving saves; Escape cancels. */
export function InlineEdit({ value, onSave, label, className = '' }) {
  const [editing, setEditing] = useState(false);

  const commit = (next) => {
    setEditing(false);
    const trimmed = next.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
  };

  if (editing) {
    return (
      <input
        className="input inline-edit__input"
        defaultValue={value}
        autoFocus
        aria-label={label}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value);
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }

  return (
    <button type="button" className={`inline-edit ${className}`} onClick={() => setEditing(true)} title={`Rename ${value}`}>
      {value}
    </button>
  );
}
