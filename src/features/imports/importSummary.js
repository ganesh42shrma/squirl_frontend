import { formatDate, todayISO } from '../../lib/format.js';

export function statementPeriod(batch) {
  if (!batch.periodFrom || !batch.periodTo) return 'Dates unavailable';
  return `${formatDate(batch.periodFrom)} to ${formatDate(batch.periodTo)}`;
}

export function importSummary({ stats }) {
  const parts = [`${stats.inserted} new`, `${stats.duplicates} already imported`];
  if (stats.skipped) parts.push(`${stats.skipped} skipped`);
  return `${stats.parsed} rows checked · ${parts.join(' · ')}.`;
}

export function coverageHint(batch, today = todayISO()) {
  if (batch.stats.skipped) return 'Some rows were unusable. Check the statement before relying on these totals.';
  const end = batch.periodTo?.slice(0, 10);
  if (batch.stats.inserted !== 0 || !end || end >= today) return '';
  return `For newer activity, upload a statement ending after ${formatDate(end)}.`;
}
