import { maskFinancialText } from '../../lib/guestMode';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useApplyRules, useDeleteRule, useRules } from '../rules/useRules';

/**
 * Merchant memory: every merchant you've categorised (on imported rows) and the category it maps to.
 * Future imports from these merchants arrive sorted; forgetting one stops that.
 */
export function LearnedMerchants() {
  const { data, isLoading } = useRules();
  const apply = useApplyRules();
  const remove = useDeleteRule();
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);

  const rules = data?.rules || [];
  const visible = showAll ? rules : rules.slice(0, 8);

  return (
    <section className="manager learned" aria-labelledby="learned-title">
      <div className="manager__head">
        <h2 id="learned-title">Learned merchants</h2>
        <p className="manager__muted">Saved categories for future payments.</p>
      </div>

      {data?.applicable > 0 && (
        <div className="learned__apply">
          <p>
            {data.applicable} unsorted row{data.applicable === 1 ? '' : 's'} match merchants you’ve already categorised.
          </p>
          <Button
            variant="accent"
            size="small"
            disabled={apply.isPending}
            onClick={() =>
              apply.mutate(undefined, {
                onSuccess: (r) => toast(`Sorted ${r.applied} row${r.applied === 1 ? '' : 's'}`),
                onError: (err) => toast(describeError(err), { tone: 'error' }),
              })
            }
          >
            Sort them
          </Button>
        </div>
      )}

      {isLoading ? null : rules.length === 0 ? (
        <p className="manager__muted">No saved merchants yet.</p>
      ) : (
        <>
          <ul className="learned__list">
            {visible.map((rule) => (
              <li key={rule._id}>
                <span className="learned__merchant" title={maskFinancialText(rule.example)}>
                  {maskFinancialText(rule.merchant)}
                  <span className="learned__meta">
                    {rule.direction === 'debit' ? 'Money out' : 'Money in'}
                    {rule.hits > 0 && ` · sorted ${rule.hits} row${rule.hits === 1 ? '' : 's'}`}
                  </span>
                </span>
                <span className="learned__category">{rule.category.label}</span>
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => remove.mutate(rule._id, { onSuccess: () => toast('Forgot that merchant') })}
                  aria-label={`Forget ${maskFinancialText(rule.merchant)}`}
                >
                  Forget
                </button>
              </li>
            ))}
          </ul>
          {rules.length > 8 && (
            <button type="button" className="link-button" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${rules.length}`}
            </button>
          )}
          <Link to="/app/ledger?view=auto" className="dash-link">
            Review rows sorted automatically
          </Link>
        </>
      )}
    </section>
  );
}
