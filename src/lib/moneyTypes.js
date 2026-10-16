// The five category types from the backend.
// `color` is the soft UI accent, `ink` its text-safe shade, `viz` the validated chart colour.
export const MONEY_TYPES = {
  expense: { label: 'Spent', color: 'var(--clay)', ink: 'var(--clay-ink)', viz: 'var(--viz-expense)' },
  income: { label: 'Earned', color: 'var(--olive)', ink: 'var(--olive-ink)', viz: 'var(--viz-income)' },
  investment: { label: 'Invested', color: 'var(--sky)', ink: 'var(--sky-ink)', viz: 'var(--viz-investment)' },
  transfer: { label: 'Moved', color: 'var(--kraft)', ink: 'var(--kraft-ink)', viz: 'var(--viz-transfer)' },
  lending: { label: 'Lent & borrowed', color: 'var(--heather)', ink: 'var(--heather-ink)', viz: 'var(--viz-lending)' },
};

export const MONEY_TYPE_ORDER = ['expense', 'income', 'investment', 'transfer', 'lending'];

/**
 * Turns a `groupBy=categoryType` summary into the numbers people think in.
 * Rows not yet sorted into a category still count: debits as spending, credits as earnings.
 */
export function monthFigures(groups = []) {
  const get = (key) => groups.find((g) => g.key === key) || { debit: 0, credit: 0, count: 0 };
  const expense = get('expense');
  const income = get('income');
  const investment = get('investment');
  const transfer = get('transfer');
  const lending = get('lending');
  const unsorted = get('uncategorized');

  return {
    spent: Math.max(0, expense.debit - expense.credit + unsorted.debit),
    earned: Math.max(0, income.credit - income.debit + unsorted.credit),
    invested: investment.debit - investment.credit,
    moved: transfer.debit + transfer.credit,
    lentOut: lending.debit,
    lentBack: lending.credit,
    unsortedCount: unsorted.count,
  };
}
