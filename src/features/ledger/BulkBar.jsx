import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Trash, X } from '@phosphor-icons/react';
import { CategorySelect } from '../categories/CategorySelect';
import { normalizeTag } from '../tags/useTags';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useBulkUpdateTransactions, useDeleteTransactions } from './useTransactions';

/** Floating bar for acting on the selected rows: set a category, add a tag, or delete. */
export function BulkBar({ ids, onClear }) {
  const [tag, setTag] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bulkUpdate = useBulkUpdateTransactions();
  const deleteTransactions = useDeleteTransactions();
  const toast = useToast();
  const count = ids.length;
  const rows = `${count} row${count === 1 ? '' : 's'}`;

  // Deleting needs a second click; the confirmation quietly expires.
  useEffect(() => {
    if (!confirmDelete) return;
    const id = setTimeout(() => setConfirmDelete(false), 3500);
    return () => clearTimeout(id);
  }, [confirmDelete]);

  const onError = (err) => toast(describeError(err), { tone: 'error' });

  const setCategory = (category) => {
    if (!category) return;
    bulkUpdate.mutate(
      { ids, set: { category } },
      { onSuccess: () => toast(`Sorted ${rows}`), onError },
    );
  };

  const addTag = (e) => {
    e.preventDefault();
    const name = normalizeTag(tag);
    if (!name) return;
    bulkUpdate.mutate(
      { ids, set: { addTags: [name] } },
      {
        onSuccess: () => {
          toast(`Tagged ${rows} with ${name}`);
          setTag('');
        },
        onError,
      },
    );
  };

  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    deleteTransactions.mutate(ids, {
      onSuccess: () => {
        toast(`Deleted ${rows}`);
        onClear();
      },
      onError,
    });
  };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          className="bulk-bar"
          role="region"
          aria-label="Selected rows"
          initial={{ opacity: 0, y: 24, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 24, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <span className="bulk-bar__count">{rows} selected</span>
          <CategorySelect
            className="bulk-bar__category"
            value=""
            onChange={setCategory}
            placeholder="Set category"
            title={`Category for ${rows} selected row${rows === 1 ? '' : 's'}`}
            aria-label="Set category for selected rows"
          />
          <form className="bulk-bar__tag" onSubmit={addTag}>
            <input
              className="input"
              placeholder="Add tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              aria-label="Tag to add to selected rows"
            />
          </form>
          <Button variant="danger" size="small" onClick={remove} disabled={deleteTransactions.isPending}>
            <Trash size={14} aria-hidden="true" />
            {confirmDelete ? `Confirm delete` : 'Delete'}
          </Button>
          <button type="button" className="bulk-bar__clear" onClick={onClear} aria-label="Clear selection" title="Clear selection">
            <X aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
