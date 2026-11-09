import { useId, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { normalizeTag, useCreateTag, useDeleteTag, useTags, useUpdateTag } from '../tags/useTags';
import { InlineEdit } from './InlineEdit';

export function TagManager() {
  const { tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [confirming, setConfirming] = useState(null);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const groupListId = useId();
  const toast = useToast();
  const onError = (err) => toast(describeError(err), { tone: 'error' });

  const groups = useMemo(() => {
    const map = new Map();
    for (const tag of tags) {
      if (!map.has(tag.group)) map.set(tag.group, []);
      map.get(tag.group).push(tag);
    }
    return [...map.entries()];
  }, [tags]);

  const add = (e) => {
    e.preventDefault();
    const tagName = normalizeTag(name);
    if (!tagName) return;
    createTag.mutate(
      { name: tagName, ...(group.trim() && { group: normalizeTag(group) }) },
      {
        onSuccess: () => {
          toast(`Added ${tagName}`);
          setName('');
        },
        onError,
      },
    );
  };

  const remove = (tag) => {
    if (confirming !== tag._id) {
      setConfirming(tag._id);
      setTimeout(() => setConfirming((c) => (c === tag._id ? null : c)), 3500);
      return;
    }
    deleteTag.mutate(tag._id, {
      onSuccess: (r) => toast(`Deleted ${tag.name}${r.data.removedFromTransactions ? ` from ${r.data.removedFromTransactions} rows` : ''}`),
      onError,
    });
  };

  // Tags typed on rows but not in the catalog have no id yet; adding them keeps the name and gives them a group.
  const adopt = (tag) => createTag.mutate({ name: tag.name }, { onSuccess: () => toast(`Saved ${tag.name}`), onError });

  return (
    <section className="manager" aria-labelledby="tags-title">
      <div className="manager__head">
        <h2 id="tags-title">Tags</h2>
      </div>

      {isLoading && <p className="manager__muted">Loading…</p>}

      <div className="tag-groups">
        {groups.map(([groupName, groupTags]) => (
          <div key={groupName} className="tag-group">
            <h3>{groupName.charAt(0).toUpperCase() + groupName.slice(1)}</h3>
            <ul>
              {groupTags.map((tag) => (
                <li key={tag.name} className="tag-row">
                  <span className="tag__dot" style={{ background: tag.color || 'var(--ink-faint)' }} aria-hidden="true" />
                  {tag._id ? (
                    <InlineEdit
                      value={tag.name}
                      label={`Rename ${tag.name}`}
                      onSave={(next) => updateTag.mutate({ id: tag._id, name: normalizeTag(next) }, { onError })}
                    />
                  ) : (
                    <span className="tag-row__name">{tag.name}</span>
                  )}
                  <span className="tag-row__count num">{tag.count ? `${tag.count} row${tag.count === 1 ? '' : 's'}` : 'unused'}</span>
                  {tag._id ? (
                    <button type="button" className="text-danger" onClick={() => remove(tag)}>
                      {confirming === tag._id ? 'Confirm' : 'Delete'}
                    </button>
                  ) : (
                    <button type="button" className="text-quiet" onClick={() => adopt(tag)}>
                      Save to list
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <form className="add-inline add-inline--tag" onSubmit={add}>
        <input className="input" placeholder="New tag" value={name} onChange={(e) => setName(e.target.value)} aria-label="New tag name" />
        <input
          className="input"
          placeholder="Group (optional)"
          value={group}
          list={groupListId}
          onChange={(e) => setGroup(e.target.value)}
          aria-label="Tag group"
        />
        <datalist id={groupListId}>
          {groups.map(([g]) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <Button type="submit" variant="quiet" size="small">
          Add tag
        </Button>
      </form>
    </section>
  );
}
