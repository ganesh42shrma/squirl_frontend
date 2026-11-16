// The command palette's plain logic, with no React, so it is easy to test in Node:
// which "go to" commands exist, how typed text ranks them, how a proposed capture action reads,
// and where a search result opens.
import { financePath, goalPath, settingsPath, tasksPath, APP, CUSTOMIZE_DASHBOARD_PATH } from '../../app/paths.js';
import { formatMoney } from '../../lib/format.js';

/** Every page you can jump to, built from the module registry so new pages appear on their own. */
export function navCommands(modules) {
  const commands = [{ id: 'nav:dashboard', label: 'Dashboard', hint: 'Go to', to: APP, keywords: 'home board widgets' }];
  for (const m of modules) {
    for (const tab of m.tabs) {
      commands.push({ id: `nav:${m.id}:${tab.path}`, label: tab.label, hint: m.label, to: `${m.base}/${tab.path}`, keywords: `${m.label} ${m.blurb || ''}` });
    }
    for (const q of m.quick || []) commands.push({ id: `quick:${m.id}:${q.label}`, label: q.label, hint: m.label, to: q.to, keywords: m.label });
  }
  commands.push(
    { id: 'nav:settings', label: 'Settings', hint: 'Go to', to: settingsPath(), keywords: 'preferences account' },
    { id: 'nav:notifications', label: 'Notification settings', hint: 'Settings', to: settingsPath('notifications'), keywords: 'push reminders alerts' },
    { id: 'nav:circle', label: 'Your circle', hint: 'Settings', to: settingsPath('people'), keywords: 'contacts family friends people import phone book' },
    { id: 'nav:customize', label: 'Customize dashboard', hint: 'Dashboard', to: CUSTOMIZE_DASHBOARD_PATH, keywords: 'widgets layout' },
  );
  return commands;
}

/**
 * 0 = no match. Higher is better: the label starting with the query beats a word starting with it,
 * which beats the query appearing anywhere, which beats the letters appearing in order ("ldg" → Ledger).
 */
export function scoreCommand(command, query) {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const label = command.label.toLowerCase();
  const all = `${label} ${(command.hint || '').toLowerCase()} ${(command.keywords || '').toLowerCase()}`;
  if (label.startsWith(q)) return 100 - label.length / 100;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 80;
  if (label.includes(q)) return 60;
  if (all.includes(q)) return 40;
  let i = 0;
  for (const ch of label) if (ch === q[i]) i += 1;
  return i === q.length && q.length >= 2 ? 20 : 0;
}

export function rankCommands(commands, query, limit = 6) {
  return commands
    .map((c) => ({ c, s: scoreCommand(c, query) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.c);
}

const shortDate = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "Today", "Tomorrow", "Fri 20 Nov" relative to the person's own today (YYYY-MM-DD). */
export function relativeDay(key, today) {
  if (!key) return '';
  const diff = Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const weekday = new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
  return diff > 1 && diff < 7 ? weekday : `${weekday} ${shortDate(key)}`;
}

/** One proposed action → { kind, title, detail } for the preview row. Amounts respect guest mode. */
export function describeAction(action, today) {
  const d = action.data || {};
  switch (action.type) {
    case 'transaction': {
      // `match` (set by the server) means the bank already recorded this payment: saving annotates that row.
      // A category the AI suggested is marked so it is never mistaken for one the person chose.
      const bits = [d.categoryName ? (action.aiCategory ? `${d.categoryName} (AI)` : d.categoryName) : 'Uncategorised', d.paymentMode?.toUpperCase(), d.date !== today ? relativeDay(d.date, today) : null,
        action.match ? 'Will be matched to your bank payment, not added twice' : null];
      return { kind: d.direction === 'credit' ? 'income' : 'expense', title: `${d.direction === 'credit' ? 'Income' : 'Expense'} ${formatMoney(d.amount)} · ${d.description}`, detail: bits.filter(Boolean).join(' · ') };
    }
    case 'task': {
      const due = [relativeDay(d.dueDate, today), d.dueTime].filter(Boolean).join(' at ');
      return { kind: 'task', title: `Task · ${d.title}`, detail: due ? `Due ${due}${d.dueTime ? ' · you’ll get a reminder' : ''}` : 'No due date' };
    }
    case 'habit': {
      const day = d.date && d.date !== today ? relativeDay(d.date, today).toLowerCase() : 'today'; // "yesterday"
      return { kind: 'habit', title: `Check in · ${d.name || 'Habit'}`, detail: d.quantity != null ? `${d.quantity} logged ${day}` : `Done for ${day}` };
    }
    default:
      return { kind: 'note', title: `Note · ${d.text}`, detail: 'Goes to your capture inbox to sort out later' };
  }
}

/** True when the rules left a payment without a category, so the AI category lookup is worth asking for. */
export const needsCategory = (proposal) => Boolean(proposal?.actions?.some((a) => a.type === 'transaction' && !a.data?.category));

/** Saved as an AI capture when the AI read the text, or when any category on it came from the AI. */
export const engineFor = (proposal, usedAi) => (usedAi || proposal?.actions?.some((a) => a.aiCategory) ? 'ai' : 'rules');

/** Only a capture that is still saved can be undone (a replayed save may already have been undone). */
export const canUndo = (result) => result?.capture?.status === 'done';

/** The toast after saving: "Saved expense ₹40 · Chai" or "Saved 3 items". A retry the server recognised says so. */
export function savedMessage({ created = [], inbox = [], capture, replayed }) {
  if (replayed) return capture?.status === 'undone' ? 'That was already saved, then undone' : 'Already saved';
  if (!created.length) return inbox.length > 1 ? `${inbox.length} notes saved to your inbox` : 'Saved to your inbox';
  if (created.length > 1 || inbox.length) return `Saved ${created.length + inbox.length} items`;
  const [item] = created;
  if (item.type === 'transaction' && item.matched) return `Matched to your bank payment · ${formatMoney(item.amount)} · ${item.label}`;
  if (item.type === 'transaction') return `Saved ${item.direction === 'credit' ? 'income' : 'expense'} ${formatMoney(item.amount)} · ${item.label}`;
  if (item.type === 'task') return `Task added · ${item.label}`;
  return `Checked in · ${item.label}`;
}

/**
 * Where a photo taken in the palette goes once the capture is saved: the payment it created or matched, else the
 * task, else the inbox note it became. A habit check-in can't hold photos, so that alone gives null.
 */
export function photoTarget({ created = [], inbox = [] } = {}) {
  const payment = created.find((item) => item.type === 'transaction');
  if (payment) return { ownerType: 'transaction', ownerId: payment.id };
  const task = created.find((item) => item.type === 'task');
  if (task) return { ownerType: 'task', ownerId: task.id };
  if (inbox[0]?._id) return { ownerType: 'capture', ownerId: inbox[0]._id };
  return null;
}

/** The toast after undo. Some things are deliberately left alone, and the person should know which. */
export function undoMessage(kept = []) {
  if (!kept.length) return 'Undone';
  const reasons = [
    kept.some((k) => k.type === 'task') && 'a completed task',
    kept.some((k) => k.type === 'transaction') && 'a payment your bank has confirmed',
    kept.some((k) => k.type === 'habit') && 'a check-in that is too old to change',
  ].filter(Boolean);
  return `Undone. Kept ${reasons.join(' and ')}.`;
}

/**
 * A random id for one save. If the connection drops after the server saved but before the answer arrived,
 * retrying with the SAME id makes the server hand back the first result instead of saving twice.
 */
export function newClientId(random = globalThis.crypto) {
  if (random?.randomUUID) return random.randomUUID();
  const bytes = new Uint8Array(16);
  if (random?.getRandomValues) random.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The same body as the last attempt is a retry (keep its id); anything else is a new submission. */
export function submissionFor(previous, body, make = newClientId) {
  const fingerprint = JSON.stringify(body);
  return previous?.fingerprint === fingerprint ? previous : { fingerprint, clientId: make() };
}

/** Where a search result opens. */
export function resultLink(result) {
  switch (result.kind) {
    case 'transaction': return financePath('ledger', `?preset=all&q=${encodeURIComponent(result.title.slice(0, 100))}`);
    case 'task': return tasksPath('lists');
    case 'habit': return tasksPath('habits');
    case 'goal': return goalPath(result.id);
    case 'person': return financePath('ledger', `?preset=all&person=${encodeURIComponent(result.id)}`);
    case 'commitment': return financePath('payments');
    default: return null;
  }
}

/** A search result → { kind, title, detail }. */
export function describeResult(result, today) {
  switch (result.kind) {
    case 'transaction': return { kind: result.direction === 'credit' ? 'income' : 'expense', title: result.title, detail: `${formatMoney(result.amount)} · ${shortDate(result.date)}` };
    case 'task': return { kind: 'task', title: result.title, detail: result.status === 'done' ? 'Done' : result.dueDate ? `Due ${relativeDay(result.dueDate, today)}` : 'Open task' };
    case 'habit': return { kind: 'habit', title: result.title, detail: result.streak ? `${result.streak}-day streak` : 'Habit' };
    case 'person': return { kind: 'person', title: result.title, detail: `Your circle${result.isFamily ? ' · Family' : ''} · Enter to see their payments` };
    case 'goal': return { kind: 'goal', title: result.title, detail: `Goal · ${result.status}` };
    case 'commitment': return { kind: 'bill', title: result.title, detail: result.amount ? `${formatMoney(result.amount)} · EMIs & bills` : 'EMIs & bills' };
    default: return { kind: 'note', title: result.title, detail: 'In your capture inbox' };
  }
}

export const EXAMPLES = ['chai 40 upi', 'salary 85k received', 'remind me to pay rent fri 10am', 'gym done', 'dentist tomorrow 5pm'];
