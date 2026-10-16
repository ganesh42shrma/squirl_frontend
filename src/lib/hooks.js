import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { currentMonthKey } from './format';

export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// The selected month lives in the URL (?month=2026-10) so it survives reloads and can be shared.
export function useMonthParam() {
  const [params, setParams] = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('month') || '') ? params.get('month') : currentMonthKey();

  const setMonth = (next) =>
    setParams(
      (prev) => {
        const copy = new URLSearchParams(prev);
        copy.set('month', next);
        return copy;
      },
      { replace: true },
    );

  return [month, setMonth];
}
