const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const rupeesRounded = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

// ₹1,20,000 – Indian digit grouping.
export function formatMoney(amount, { rounded = false } = {}) {
  return (rounded ? rupeesRounded : rupees).format(amount || 0);
}

// "upi" → "UPI", "sbi" → "SBI", "cash" → "Cash"
export function formatAccount(account = '') {
  if (account.length <= 4 && account !== 'cash') return account.toUpperCase();
  return account.charAt(0).toUpperCase() + account.slice(1);
}

// "15 Oct"
export function formatDay(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// "October 2026"
export function formatMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// "October"
export function formatMonthName(monthKey) {
  return formatMonth(monthKey).split(' ')[0];
}

// "Oct"
export function formatMonthShort(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
}

// Local date as YYYY-MM-DD (not UTC, so late-night entries land on the right day).
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

export function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// { from: '2026-10-01', to: '2026-10-31' }
export function monthRange(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${monthKey}-01`, to: `${monthKey}-${String(last).padStart(2, '0')}` };
}

// Stored dates are UTC midnight; this gives back the YYYY-MM-DD the user typed.
export function toInputDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}
