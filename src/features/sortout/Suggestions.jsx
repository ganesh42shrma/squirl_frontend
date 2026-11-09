import { useMemo, useState } from 'react';
import { Sparkle, X } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { CategorySelect } from '../categories/CategorySelect';
import { useApplySuggestions, useDismissSuggestion, useLlmStatus, useRunSuggestions, useSuggestions } from '../insights/useInsights';
import { useApplyRules } from '../rules/useRules';

const CONFIDENCE = { high: 'Sure', medium: 'Likely', low: 'Guess' };
const PAGE = 60;
const plural = (n, word) => `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;

/**
 * Suggestions from the local model, worked out in the background for every unsorted merchant.
 * The model picks a main category; the person reviews, can change any of them (down to a
 * subcategory), and applies. Applying teaches merchant memory, so future imports arrive sorted.
 */
export function Suggestions() {
  const model = useLlmStatus();
  const { data, isLoading } = useSuggestions();
  const apply = useApplySuggestions();
  const applyRules = useApplyRules();
  const dismiss = useDismissSuggestion();
  const run = useRunSuggestions();
  const toast = useToast();
  const [overrides, setOverrides] = useState({}); // suggestion id → category id
  const [unticked, setUnticked] = useState(() => new Set());
  const [shown, setShown] = useState(PAGE);

  const items = useMemo(() => data?.suggestions || [], [data]);
  const status = data?.status;
  // Low-confidence guesses start unticked (a "+id" entry ticks one); the others start ticked.
  const isTicked = (s) => (s.confidence === 'low' ? unticked.has(`+${s._id}`) : !unticked.has(s._id));
  const ticked = items.filter(isTicked);
  const tickedRows = ticked.reduce((n, s) => n + s.rowCount, 0);
  const allTicked = items.length > 0 && ticked.length === items.length;
  const allRows = items.reduce((n, s) => n + s.rowCount, 0);
  const guessRows = items.filter((s) => s.confidence === 'low').reduce((n, s) => n + s.rowCount, 0);
  const toggleAll = () => setUnticked(new Set(items
    .filter((s) => allTicked ? s.confidence !== 'low' : s.confidence === 'low')
    .map((s) => s.confidence === 'low' ? `+${s._id}` : s._id)));
  const sure = items.filter((s) => s.confidence === 'high');
  const sureRows = sure.reduce((n, s) => n + s.rowCount, 0);
  const toggle = (s) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      const key = s.confidence === 'low' ? `+${s._id}` : s._id;
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const applyItems = (list) =>
    apply.mutate(
      list.map((s) => ({ id: s._id, ...(overrides[s._id] && { categoryId: overrides[s._id] }) })),
      {
        onSuccess: (r) => {
          toast(`Sorted ${plural(r.applied, 'row')}.`);
          setUnticked(new Set());
          setOverrides({});
        },
        onError: (err) => toast(describeError(err), { tone: 'error' }),
      },
    );

  if (!model.data?.available) {
    return model.isLoading ? null : (
      <p className="suggest__off">
        <Sparkle size={16} weight="duotone" aria-hidden="true" /> Start the local model to finish categorizing.
      </p>
    );
  }

  const asked = status?.checkedMerchants ?? status?.merchantsAsked ?? 0;
  const total = status?.merchants || 0;
  const pending = status?.pendingMerchants ?? Math.max(0, total - asked);
  const pct = total ? Math.round((asked / total) * 100) : 100;

  return (
    <section className="suggest" aria-labelledby="suggest-title">
      <div className="suggest__head">
        <div>
          <h2 id="suggest-title">
            <Sparkle size={18} weight="duotone" aria-hidden="true" /> Auto-categorization
          </h2>
          <p className="suggest__hint">Runs automatically. Unclear rows go to Other.</p>
        </div>
      </div>

      {/* Progress of the background job */}
      {status && (
        <div className="suggest__progress" role="status">
          {(status.running || pending > 0) && <div className="suggest__bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>}
          <p>
            {model.data.loaded === false
              ? 'Loading model…'
              : status.running
                ? `Categorizing ${plural(status.unsortedRows, 'row')}…`
                : pending > 0
                  ? `Categorizing ${plural(status.unsortedRows, 'row')}…`
                  : status.unsortedRows > 0 ? 'Finishing categorization…' : 'All categorized.'}
            {status.error && !status.running && ` ${status.error}. Retrying shortly.`}
          </p>
          {!status.running && status.unsortedRows > 0 && (
            <button type="button" className="link-button" onClick={() => run.mutate()} disabled={run.isPending}>
              Run now
            </button>
          )}
        </div>
      )}

      {status?.learnedRows > 0 && <div className="suggest__actions">
        <span className="suggest__hint">{plural(status.learnedRows, 'row')} match saved categories.</span>
        <Button variant="quiet" disabled={applyRules.isPending} onClick={() => applyRules.mutate(undefined, {
          onSuccess: (r) => toast(`Sorted ${plural(r.applied, 'row')}.`),
          onError: (err) => toast(describeError(err), { tone: 'error' }),
        })}>{applyRules.isPending ? 'Applying…' : 'Apply learned categories'}</Button>
      </div>}

      {items.length > 0 && (
        <>
          <div className="suggest__actions">
            <label className="suggest__select-all">
              <input
                type="checkbox"
                checked={allTicked}
                ref={(node) => { if (node) node.indeterminate = ticked.length > 0 && !allTicked; }}
                onChange={toggleAll}
                disabled={apply.isPending}
              />
              Select all
            </label>
            <Button variant="accent" onClick={() => applyItems(items)} disabled={apply.isPending}>
              {apply.isPending ? 'Applying…' : `Apply all (${plural(allRows, 'row')})`}
            </Button>
            {sure.length > 0 && (
              <Button variant="quiet" onClick={() => applyItems(sure)} disabled={apply.isPending}>
                Apply all Sure ({plural(sureRows, 'row')})
              </Button>
            )}
            <Button variant="quiet" onClick={() => applyItems(ticked)} disabled={!ticked.length || apply.isPending}>
              {apply.isPending ? 'Applying…' : `Apply ticked (${plural(tickedRows, 'row')})`}
            </Button>
            <span className="suggest__hint">
              {plural(allRows, 'row')} · {plural(items.length, 'merchant')}
              {guessRows > 0 && ` · ${guessRows} guesses`}
            </span>
          </div>

          <ul className="suggest__list">
            {items.slice(0, shown).map((s) => (
              <li key={s._id} className="suggest__item">
                <input type="checkbox" aria-label={`Apply to ${s.merchant}`} checked={isTicked(s)} onChange={() => toggle(s)} disabled={apply.isPending} />
                <span className="suggest__desc" title={s.example}>
                  {s.merchant}
                  <span className="suggest__meta">
                    {s.direction === 'debit' ? 'Money out' : 'Money in'} · {plural(s.rowCount, 'row')} · {s.example}
                  </span>
                </span>
                <CategorySelect
                  value={overrides[s._id] || s.category._id}
                  onChange={(category) => category && setOverrides((o) => ({ ...o, [s._id]: category }))}
                  aria-label={`Category for ${s.merchant}`}
                  title={`Category for “${s.merchant}”`}
                />
                <span className={`suggest__confidence is-${s.confidence}`}>{CONFIDENCE[s.confidence]}</span>
                <button
                  type="button"
                  className="suggest__dismiss"
                  aria-label={`Dismiss the suggestion for ${s.merchant}`}
                  title="Not right: dismiss (sort these by hand)"
                  onClick={() => dismiss.mutate(s._id)}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
          {items.length > shown && (
            <button type="button" className="link-button" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, items.length - shown)} more of {items.length - shown}
            </button>
          )}
        </>
      )}
    </section>
  );
}
