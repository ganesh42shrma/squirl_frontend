import { useCategories } from './useCategories';
import { MONEY_TYPES } from '../../lib/moneyTypes';
import '../../components/ui/ui.css';

/**
 * Native <select> grouped by top-level category. A top-level category can be picked on its own,
 * or one of its subcategories (indented). Native keeps keyboard and screen-reader support for free.
 */
export function CategorySelect({ value, onChange, placeholder = 'Category', allowNone, className = '', ...props }) {
  const { tree } = useCategories();

  return (
    <select
      className={`select ${className}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      {...props}
    >
      <option value="">{placeholder}</option>
      {allowNone && <option value="none">Not sorted yet</option>}
      {tree.map((parent) => (
        // Native <option>s can only hold text, so icons appear wherever the chosen category is shown instead.
        <optgroup key={parent._id} label={`${parent.name} (${MONEY_TYPES[parent.type]?.label.toLowerCase()})`}>
          <option value={parent._id}>{parent.name}</option>
          {parent.children.map((child) => (
            <option key={child._id} value={child._id}>
              {'   '}
              {child.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
