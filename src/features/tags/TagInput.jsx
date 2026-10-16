import { useId, useRef, useState } from 'react';
import { TagPill } from './TagPill';
import { normalizeTag, useTags } from './useTags';

/**
 * Type a tag and press Enter or comma to add it. Backspace on an empty field removes the last one.
 * Suggestions come from the tag catalog via a native <datalist>.
 */
export function TagInput({ value = [], onChange, placeholder = 'Add tags', autoFocus, onKeyDown }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const listId = useId();
  const { tags } = useTags();

  const add = (raw) => {
    const tag = normalizeTag(raw);
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
      e.preventDefault();
      e.stopPropagation();
      add(draft);
      return;
    }
    if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div className="tag-input" onClick={() => inputRef.current?.focus()}>
      {value.map((tag) => (
        <TagPill key={tag} name={tag} onRemove={() => onChange(value.filter((t) => t !== tag))} />
      ))}
      <input
        ref={inputRef}
        className="tag-input__field"
        value={draft}
        list={listId}
        placeholder={value.length ? '' : placeholder}
        aria-label="Tags"
        autoFocus={autoFocus}
        onChange={(e) => {
          // Picking from the datalist fills the whole value at once; add it straight away.
          const next = e.target.value;
          if (tags.some((t) => t.name === next)) add(next);
          else setDraft(next);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && add(draft)}
      />
      <datalist id={listId}>
        {tags
          .filter((t) => !value.includes(t.name))
          .map((t) => (
            <option key={t.name} value={t.name}>
              {t.group}
            </option>
          ))}
      </datalist>
    </div>
  );
}
