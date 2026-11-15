// A tiny event bus between the Tasks API hooks and the System toasts. The server returns
// `events` (XP paid, level-ups, awards, streak changes) on any Tasks response; whoever reads a
// response passes them to emitSystemEvents and the toast layer, mounted once in the app shell,
// turns them into System windows.
const listeners = new Set();

export function emitSystemEvents(events) {
  if (!events?.length) return;
  listeners.forEach((listener) => listener(events));
}

export function subscribeSystemEvents(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// XP rows that are already described by their own notice (an award, a cleared quest...).
const BONUS_REASONS = new Set(['achievement', 'daily_quest', 'penalty_quest', 'streak_milestone', 'rank_trial']);

/**
 * One server response → the notices to show. Plain data, so it is easy to test:
 * { id, kind, title, body, tone, xp? } with kind one of xp / level / rank / award / streak / quest / warning.
 */
export function describeEvents(events = []) {
  const notices = [];
  const xpEvents = events.filter((e) => e.type === 'xp' && !BONUS_REASONS.has(e.reason));
  const net = xpEvents.reduce((n, e) => n + e.amount, 0);
  if (xpEvents.length) {
    const earned = xpEvents.filter((e) => e.amount > 0);
    const label = earned.length === 1 ? earned[0].label : null;
    if (net < 0) notices.push({ kind: 'xp', tone: 'muted', title: '[ XP REVERSED ]', body: `${net} XP`, xp: net });
    else if (net > 0) {
      const title = earned.some((e) => e.reason === 'habit') && !earned.some((e) => e.reason === 'task' || e.reason === 'subtask') ? '[ HABIT LOGGED ]' : earned.some((e) => e.reason === 'checklist') && earned.length === earned.filter((e) => e.reason === 'checklist').length ? '[ STEP DONE ]' : '[ QUEST CLEARED ]';
      const quick = earned.some((e) => e.notes?.includes('too_quick')) ? ' (finished within 2 minutes, so counted as Trivial)' : '';
      notices.push({ kind: 'xp', tone: 'cyan', title, body: `${label ? `${label} · ` : ''}+${net} XP${quick}`, xp: net });
    }
  }
  for (const e of events) {
    switch (e.type) {
      case 'level_up': notices.push({ kind: 'level', tone: 'gold', title: '[ LEVEL UP ]', body: `You are now Lv. ${e.level}.`, level: e.level }); break;
      case 'rank_trial_open': notices.push({ kind: 'quest', tone: 'violet', title: '[ GATE OPENED ]', body: `The ${e.name} Reassessment is available. Clear it on the Hunter page.` }); break;
      case 'rank_up': notices.push({ kind: 'rank', tone: 'gold', title: '[ RANK UP ]', body: `Reassessment complete. Rank: ${e.name}.`, rank: e.rank }); break;
      case 'achievement': notices.push({ kind: 'award', tone: 'violet', title: '[ TITLE ACQUIRED ]', body: `${e.name} · +${e.xp} XP` }); break;
      case 'daily_quest_cleared': notices.push({ kind: 'quest', tone: 'cyan', title: '[ DAILY QUEST CLEARED ]', body: `Chain extended to ${e.chain} day${e.chain === 1 ? '' : 's'} · +${e.xp} XP` }); break;
      case 'penalty_open': notices.push({ kind: 'quest', tone: 'red', title: '[ PENALTY QUEST ]', body: `Yesterday’s Daily Quest was left unfinished. Complete “${e.title}” before the day closes to keep your chain.` }); break;
      case 'penalty_cleared': notices.push({ kind: 'quest', tone: 'cyan', title: '[ PENALTY CLEARED ]', body: `${e.title} · +${e.xp} XP. Your chain is safe.` }); break;
      case 'daily_chain_broken': notices.push({ kind: 'quest', tone: 'red', title: '[ CHAIN BROKEN ]', body: `Your ${e.was}-day Daily Quest chain ended. Start again today; your XP and level are untouched.` }); break;
      case 'streak': if (e.milestone) notices.push({ kind: 'streak', tone: 'gold', title: '[ STREAK ]', body: `${e.name}: ${e.value} in a row.` }); break;
      case 'streak_protected': notices.push({ kind: 'streak', tone: 'cyan', title: '[ STREAK PROTECTED ]', body: `A Freeze absorbed a miss on ${e.name}. Freezes left: ${e.freezesLeft}.` }); break;
      case 'freeze_earned': notices.push({ kind: 'streak', tone: 'cyan', title: '[ FREEZE EARNED ]', body: `${e.name} earned a Freeze. You hold ${e.freezesHeld}.` }); break;
      case 'chain_broken': notices.push({ kind: 'streak', tone: 'red', title: '[ CHAIN BROKEN ]', body: `${e.name} stopped at ${e.was}. Begin again today.` }); break;
      case 'echo_bound': notices.push({ kind: 'award', tone: 'violet', title: '[ ECHO BOUND ]', body: `${e.name} answered your call (${e.grade}). Passive XP +1%.` }); break;
      case 'recurring': notices.push({ kind: 'quest', tone: 'muted', title: '[ REPEATING ]', body: `Next “${e.title}” is on your list.` }); break;
      case 'warning': if (e.code === 'daily_cap') notices.push({ kind: 'warning', tone: 'red', title: '[ WARNING ]', body: 'XP gains are reduced for the rest of today. Rest is part of training.' }); break;
      default: break;
    }
  }
  return notices.map((n, i) => ({ ...n, id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` }));
}
