import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { MONEY_TYPES, MONEY_TYPE_ORDER } from '../../lib/moneyTypes';
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../categories/useCategories';
import { InlineEdit } from './InlineEdit';

function useConfirm() {
  const [pending, setPending] = useState(null);
  const ask = (id) => {
    setPending(id);
    setTimeout(() => setPending((p) => (p === id ? null : p)), 3500);
  };
  return [pending, ask];
}

function AddInline({ placeholder, onAdd, withIcon }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  return (
    <form
      className="add-inline"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd({ name: name.trim(), ...(icon.trim() && { icon: icon.trim() }) });
        setName('');
        setIcon('');
      }}
    >
      {withIcon && (
        <input
          className="input add-inline__icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🙂"
          aria-label="Emoji icon"
          maxLength={4}
        />
      )}
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <Button type="submit" variant="quiet" size="small">
        Add
      </Button>
    </form>
  );
}

export function CategoryManager() {
  const [type, setType] = useState('expense');
  const { tree, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [confirming, askConfirm] = useConfirm();
  const toast = useToast();

  const onError = (err) => toast(describeError(err), { tone: 'error' });
  const parents = tree.filter((c) => c.type === type);

  const create = (body, done) => createCategory.mutate(body, { onSuccess: () => toast(`Added ${body.name}`), onError, ...done });
  const rename = (category, name) => updateCategory.mutate({ id: category._id, name }, { onError });
  const remove = (category) => {
    if (confirming !== category._id) return askConfirm(category._id);
    deleteCategory.mutate(category._id, { onSuccess: () => toast(`Deleted ${category.name}`), onError });
  };

  return (
    <section className="manager" aria-labelledby="categories-title">
      <div className="manager__head">
        <h2 id="categories-title">Categories</h2>
        <div className="type-tabs" role="tablist" aria-label="Category type">
          {MONEY_TYPE_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              className={`type-tab${type === t ? ' is-active' : ''}`}
              onClick={() => setType(t)}
            >
              <span className="type-tab__dot" style={{ background: MONEY_TYPES[t].color }} aria-hidden="true" />
              {MONEY_TYPES[t].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="manager__muted">Loading…</p>}

      <ul className="category-list" role="tabpanel">
        {parents.map((parent) => (
          <li key={parent._id} className="category-group">
            <div className="category-group__head">
              <span className="category-group__icon">
                <CategoryIcon id={parent._id} size={22} />
              </span>
              <InlineEdit value={parent.name} label={`Rename ${parent.name}`} onSave={(name) => rename(parent, name)} className="category-group__name" />
              <button type="button" className="text-danger" onClick={() => remove(parent)}>
                {confirming === parent._id ? 'Confirm delete' : 'Delete'}
              </button>
            </div>
            <ul className="subcategories">
              {parent.children.map((child) => (
                <li key={child._id} className="subcategory">
                  <InlineEdit value={child.name} label={`Rename ${child.name}`} onSave={(name) => rename(child, name)} />
                  <button
                    type="button"
                    className="subcategory__remove"
                    onClick={() => remove(child)}
                    aria-label={confirming === child._id ? `Confirm delete ${child.name}` : `Delete ${child.name}`}
                    title={confirming === child._id ? 'Click again to delete' : 'Delete'}
                  >
                    {confirming === child._id ? 'Delete?' : <X size={11} weight="bold" aria-hidden="true" />}
                  </button>
                </li>
              ))}
              <li>
                <AddInline placeholder="New subcategory" onAdd={(body) => create({ ...body, parent: parent._id })} />
              </li>
            </ul>
          </li>
        ))}
      </ul>

      <div className="manager__add">
        <p className="manager__muted">New top-level {MONEY_TYPES[type].label.toLowerCase()} category</p>
        <AddInline placeholder="Category name" withIcon onAdd={(body) => create({ ...body, type })} />
      </div>
    </section>
  );
}
