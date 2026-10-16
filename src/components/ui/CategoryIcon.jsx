import { Tag } from '@phosphor-icons/react';
import { useCategories } from '../../features/categories/useCategories';
import { CATEGORY_ICONS } from '../../lib/categoryIcons';
import { MONEY_TYPES } from '../../lib/moneyTypes';

/**
 * A category's icon in duotone (ink outline over a soft wash), tinted by its money type.
 * Lookup order: its own slug → its parent's slug → the emoji saved on it → a plain tag.
 */
export function CategoryIcon({ id, size = 18 }) {
  const { byId } = useCategories();
  const category = byId.get(id);
  if (!category) return null;

  const parent = category.parent ? byId.get(category.parent) : null;
  const Icon = CATEGORY_ICONS[category.slug] || (parent && CATEGORY_ICONS[parent.slug]);
  const color = MONEY_TYPES[category.type]?.ink || 'var(--ink-soft)';

  if (Icon) return <Icon size={size} weight="duotone" color={color} aria-hidden="true" style={{ flex: 'none' }} />;

  const emoji = category.icon || parent?.icon;
  if (emoji) {
    return (
      <span aria-hidden="true" style={{ fontSize: size * 0.9, lineHeight: 1, width: size, textAlign: 'center' }}>
        {emoji}
      </span>
    );
  }
  return <Tag size={size} weight="duotone" color={color} aria-hidden="true" style={{ flex: 'none' }} />;
}
