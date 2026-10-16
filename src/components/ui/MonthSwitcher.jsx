import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { currentMonthKey, formatMonth, shiftMonth } from '../../lib/format';
import './MonthSwitcher.css';

export function MonthSwitcher({ month, onChange }) {
  const isCurrent = month === currentMonthKey();

  return (
    <div className="month-switcher">
      <button
        type="button"
        className="month-switcher__step"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
      >
        <CaretLeft size={16} weight="bold" aria-hidden="true" />
      </button>
      <h1 className="month-switcher__label" aria-live="polite">
        {formatMonth(month)}
      </h1>
      <button
        type="button"
        className="month-switcher__step"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Next month"
      >
        <CaretRight size={16} weight="bold" aria-hidden="true" />
      </button>
      {!isCurrent && (
        <button type="button" className="month-switcher__today" onClick={() => onChange(currentMonthKey())}>
          Back to this month
        </button>
      )}
    </div>
  );
}
