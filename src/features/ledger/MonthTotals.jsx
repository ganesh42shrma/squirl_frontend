import { useCallback } from 'react';
import { CountUp } from '../../components/fx/CountUp';
import { formatMoney } from '../../lib/format';
import { monthFigures } from '../../lib/moneyTypes';
import { useSummary } from './useTransactions';

export function MonthTotals({ from, to }) {
  const { data, isError } = useSummary({ from, to, groupBy: 'categoryType' });
  const format = useCallback((n) => formatMoney(Math.round(n), { rounded: true }), []);

  if (isError) return null;
  const { spent, earned, invested } = monthFigures(data?.groups);

  return (
    <p className="month-totals">
      You spent <CountUp value={spent} format={format} className="month-totals__value amount-debit num" /> and
      earned <CountUp value={earned} format={format} className="month-totals__value amount-credit num" />
      {invested > 0 && (
        <>
          , and put <CountUp value={invested} format={format} className="month-totals__value month-totals__invested num" /> to
          work
        </>
      )}
      .
    </p>
  );
}
