import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { Check, Crown, Moon } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { tasksPath } from '../../app/paths';
import { QuestConfigurator } from './QuestConfigurator';
import { RankBadge, SystemWindow, XpBar } from './SystemWindow';
import { addDaysKey } from './taskUtils';
import { useClaimTrial, useHabits, useSaveTasksSettings, useTasksOverview, useTasksSettings, useXpSeries } from './useTasks';
import './tasks.css';

function StatRadar({ stats }) {
  const top = Math.max(10, ...stats.map((s) => s.value));
  const data = stats.map((s) => ({ stat: s.name.slice(0, 3).toUpperCase(), value: s.value, full: s.name }));
  return (
    <div className="stat-radar">
      <div className="stat-radar__chart" role="img" aria-label={`Stats: ${stats.map((s) => `${s.name} ${s.value}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="rgba(147,183,202,0.35)" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: '#d8f3ff', fontSize: 12 }} />
            <Radar dataKey="value" domain={[0, top]} stroke="#3ad4ff" fill="#3ad4ff" fillOpacity={0.28} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <dl className="stat-list">
        {stats.map((s) => <div key={s.id}><dt>{s.name}</dt><dd className="sys-num">{s.value}<span className="sys-muted"> · {s.xp} XP</span></dd></div>)}
      </dl>
    </div>
  );
}

// Twelve weeks of XP as a calendar heatmap, Monday-first columns.
export function XpHeatmap() {
  const series = useXpSeries({});
  const { cells, label } = useMemo(() => {
    if (!series.data) return { cells: [], label: '' };
    const byDay = new Map(series.data.days.map((d) => [d.date, d.xp]));
    const max = Math.max(1, ...series.data.days.map((d) => d.xp));
    const end = series.data.to;
    const start = series.data.from;
    const first = new Date(`${start}T00:00:00Z`);
    const lead = (first.getUTCDay() + 6) % 7; // blank cells so each column starts on Monday
    const out = Array.from({ length: lead }, (_, i) => ({ key: `lead-${i}`, blank: true }));
    for (let d = start; d <= end; d = addDaysKey(d, 1)) {
      const xp = byDay.get(d) || 0;
      out.push({ key: d, date: d, xp, level: xp === 0 ? 0 : Math.min(4, Math.ceil((xp / max) * 4)) });
    }
    return { cells: out, label: `${series.data.total} XP over the last 12 weeks` };
  }, [series.data]);
  if (series.isLoading) return <div className="insight-skeleton" />;
  if (series.isError) return <p className="import-error" role="alert">{describeError(series.error)}</p>;
  return (
    <div>
      <div className="xp-heat" role="img" aria-label={label}>
        {cells.map((c) => (c.blank ? <span key={c.key} className="xp-heat__cell is-blank" /> : <span key={c.key} className={`xp-heat__cell lvl-${c.level}`} title={`${c.date}: ${c.xp} XP`} />))}
      </div>
      <p className="sys-xp__label"><span>{label}</span><span>Less ▫ ▪ More</span></p>
    </div>
  );
}

function Trial({ trial }) {
  const claim = useClaimTrial();
  return (
    <SystemWindow title={`REASSESSMENT · ${trial.name.toUpperCase()}`} tone="violet">
      <p>You have reached level {trial.minLevel}. Complete these to be recognised as <strong>{trial.name}</strong>. Your XP and level keep growing in the meantime.</p>
      <ul className="trial-list" role="list">
        {trial.items.map((item) => (
          <li key={item.id} className={item.done ? 'is-done' : ''}>
            <span className="trial-list__mark" aria-hidden="true">{item.done ? <Check size={14} weight="bold" /> : null}</span>
            <span>{item.label}</span>
            <span className="sys-num sys-muted">{item.current}/{item.target}</span>
          </li>
        ))}
      </ul>
      <div className="quest-actions">
        <Button variant="accent" disabled={!trial.ready || claim.isPending} onClick={() => claim.mutate()}>{claim.isPending ? 'Claiming…' : trial.ready ? `Claim ${trial.name} · +${trial.rewardXp} XP` : 'Conditions not met yet'}</Button>
      </div>
      {claim.isError && <p className="quest-error" role="alert">{describeError(claim.error)}</p>}
    </SystemWindow>
  );
}

// The knobs: when the day turns over, the daily XP limit, the penalty, the quest lines, vacation.
function SettingsWindow({ settings }) {
  const save = useSaveTasksSettings();
  const [form, setForm] = useState(() => ({
    timezone: settings.timezone, dayStartHour: settings.dayStartHour, dailyCap: settings.dailyCap, vacationUntil: settings.vacationUntil || '',
  }));
  const [saved, setSaved] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const set = (key, number) => (e) => { setSaved(false); setForm((f) => ({ ...f, [key]: number ? Number(e.target.value) : e.target.value })); };
  const submit = (e) => {
    e.preventDefault();
    save.mutate({
      timezone: form.timezone.trim(), dayStartHour: form.dayStartHour, dailyCap: form.dailyCap, vacationUntil: form.vacationUntil || null,
    }, { onSuccess: () => setSaved(true) });
  };
  return (
    <SystemWindow title="SYSTEM SETTINGS" tone="muted" className="sys-settings">
      <details>
      <summary className="sys-settings__summary">Day, XP limit, Daily Quest and breaks</summary>
      <form className="settings-form" onSubmit={submit}>
        <label className="field">Timezone
          <input className="input" value={form.timezone} onChange={set('timezone')} list="timezones" maxLength={60} />
          <datalist id="timezones">{['Asia/Kolkata', 'UTC', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney'].map((z) => <option key={z} value={z} />)}</datalist>
        </label>
        <label className="field">The day starts at
          <select className="select" value={form.dayStartHour} onChange={set('dayStartHour', true)}>{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00{h === 4 ? ' (default)' : ''}</option>)}</select>
        </label>
        <label className="field">Daily XP soft cap
          <input className="input" type="number" min={100} max={5000} step={50} value={form.dailyCap} onChange={set('dailyCap', true)} />
        </label>
        <div className="settings-form__wide quest-settings-link">
          <p className="sys-muted">Daily Quest lines, the habits in it and the Penalty Quest live in the configurator.</p>
          <Button type="button" variant="quiet" size="small" onClick={() => setConfiguring(true)}>Configure Daily Quest</Button>
        </div>
        <label className="field settings-form__wide"><span><Moon size={14} aria-hidden="true" /> Break until</span>
          <input className="input" type="date" value={form.vacationUntil} onChange={set('vacationUntil')} />
          <span className="sys-muted">Pauses the Daily Quest and every streak until that day. Nothing is lost.</span>
        </label>
        <div className="quest-actions settings-form__wide">
          <Button type="submit" variant="accent" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</Button>
          {saved && <span role="status" className="sys-muted">Saved</span>}
        </div>
        {save.isError && <p className="quest-error settings-form__wide" role="alert">{describeError(save.error)}</p>}
      </form>
      </details>
      {configuring && <QuestConfigurator onClose={() => setConfiguring(false)} />}
    </SystemWindow>
  );
}

export function HunterPage() {
  const overview = useTasksOverview();
  const settings = useTasksSettings();
  const habits = useHabits();
  if (overview.isLoading || settings.isLoading) return <div className="insight-skeleton" />;
  if (overview.isError || settings.isError) return <p className="import-error" role="alert">{describeError(overview.error || settings.error)}</p>;
  const p = overview.data.profile;
  const echoes = (habits.data || []).filter((h) => h.echo);
  const next = p.nextRank;

  return (
    <div className="tasks-page">
      <header className="page-head"><h1>Hunter</h1><p>Your level, rank and stats. Finish quests and keep habits to grow them.</p></header>

      <SystemWindow title="STATUS" className="hunter-card">
        <div className="hunter-card__top">
          <RankBadge rank={p.rank.id} size={84} />
          <div className="hunter-card__id">
            <p className="hunter-card__level"><span className="sys-num">Lv. {p.level}</span></p>
            <p className="hunter-card__rank">{p.rank.name}{p.title ? ` · ${p.title.name}` : ''}</p>
            <p className="sys-muted">{p.totalXp.toLocaleString('en-IN')} XP in all{next ? ` · next rank ${next.name} at Lv. ${next.minLevel}` : ''}</p>
          </div>
          <dl className="hunter-card__facts">
            <div><dt>Daily chain</dt><dd className="sys-num">{p.chain}<span className="sys-muted"> best {p.longestChain}</span></dd></div>
            <div><dt>Echoes</dt><dd className="sys-num">{p.echoes}<span className="sys-muted"> +{p.echoBonusPct}% XP</span></dd></div>
            <div><dt>XP today</dt><dd className="sys-num">{overview.data.xpToday}<span className="sys-muted"> of {overview.data.dailyCap.cap}</span></dd></div>
          </dl>
        </div>
        <XpBar fraction={p.fraction} left={p.maxed ? 'Max level reached' : `${p.xpIntoLevel} / ${p.xpForLevel} XP to Lv. ${p.level + 1}`} right={p.maxed ? '' : `${p.xpToNext} to go`} label="Level progress" />
        {overview.data.dailyCap.used >= overview.data.dailyCap.cap && <p className="quest-error">You are past today’s soft cap, so XP is reduced until the day closes. Rest is part of training.</p>}
      </SystemWindow>

      {p.trial && <Trial trial={p.trial} />}
      {!p.trial && next && <p className="task-muted">The {next.name} Reassessment opens at level {next.minLevel}. Until then, rank-ups come from levelling.</p>}

      <div className="hunter-grid">
        <SystemWindow title="STATS"><StatRadar stats={p.stats} /><p className="sys-muted hunter-note">A stat is 1 point per 100 XP earned on tasks and habits tagged with it.</p></SystemWindow>
        <SystemWindow title="ACTIVITY"><XpHeatmap /></SystemWindow>
      </div>

      <SystemWindow title="ECHO ROSTER" tone="violet">
        {echoes.length ? (
          <ul className="echo-list" role="list">{echoes.map((h) => <li key={h._id}><Crown size={14} weight="fill" aria-hidden="true" /> <strong>{h.name}</strong> <span className="sys-muted">{h.echo.grade} · best {h.longestStreak}</span></li>)}</ul>
        ) : (
          <p className="sys-muted">No Echoes yet. Hold any habit for 66 periods and you can bind it: it stays bound for good and adds +1% XP. <Link to={tasksPath('habits')}>See your streaks</Link>.</p>
        )}
      </SystemWindow>

      <SettingsWindow settings={settings.data} />
    </div>
  );
}
