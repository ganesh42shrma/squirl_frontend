import { X } from '@phosphor-icons/react';
import { useTags } from './useTags';
import '../../components/ui/ui.css';

export function TagPill({ name, onRemove }) {
  const { byName } = useTags();
  const color = byName.get(name)?.color || 'var(--ink-faint)';

  return (
    <span className="tag">
      <span className="tag__dot" style={{ background: color }} aria-hidden="true" />
      {name}
      {onRemove && (
        <button type="button" className="tag__remove" onClick={onRemove} aria-label={`Remove tag ${name}`}>
          <X size={11} weight="bold" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
