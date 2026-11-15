import { useBalances } from '../insights/useInsights';
import { useGoals } from '../goals/useGoals';
import { formatAccount } from '../../lib/format';
import { METRICS, PERIODS } from './dashboardConfig';

// Renders a widget's settings schema: [{ key, type, label, default, options?, min?, max? }].
// Types: select, toggle, number, period, metric, account (from the user's statements), goal (their goals).
function AccountOptions({ value, onChange, id, label }) {
  const { data } = useBalances();
  const accounts = [...new Set(['all', ...(data?.accounts || []).map((a) => a.account), value])];
  return (
    <label className="field" htmlFor={id}>{label}
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {accounts.map((a) => <option key={a} value={a}>{a === 'all' ? 'All accounts' : formatAccount(a)}</option>)}
      </select>
    </label>
  );
}

function GoalOptions({ value, onChange, id, label }) {
  const { data } = useGoals();
  const goals = (data?.items || []).filter((g) => g.status !== 'achieved');
  return (
    <label className="field" htmlFor={id}>{label}
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">Show a few active goals</option>
        {goals.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
      </select>
    </label>
  );
}

export function SettingsForm({ schema, values, onChange, idPrefix }) {
  if (!schema.length) return <p className="member-hint">This widget has no settings.</p>;
  return (
    <div className="widget-settings-form">
      {schema.map((s) => {
        const id = `${idPrefix}-${s.key}`;
        const value = values[s.key] ?? s.default;
        const set = (next) => onChange({ ...values, [s.key]: next });
        switch (s.type) {
          case 'toggle':
            return <label key={s.key} className="check-row" htmlFor={id}><input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} /> {s.label}</label>;
          case 'number':
            return <label key={s.key} className="field" htmlFor={id}>{s.label}<input id={id} className="input" type="number" min={s.min} max={s.max} value={value} onChange={(e) => set(Math.min(s.max ?? Infinity, Math.max(s.min ?? -Infinity, Number(e.target.value) || s.default)))} /></label>;
          case 'account':
            return <AccountOptions key={s.key} id={id} label={s.label} value={value} onChange={set} />;
          case 'goal':
            return <GoalOptions key={s.key} id={id} label={s.label} value={value} onChange={set} />;
          default: {
            const options = s.type === 'period' ? Object.entries(PERIODS) : s.type === 'metric' ? Object.entries(METRICS) : (s.options || []).map((o) => (Array.isArray(o) ? o : [o, o]));
            return (
              <label key={s.key} className="field" htmlFor={id}>{s.label}
                <select id={id} className="select" value={value} onChange={(e) => set(typeof s.default === 'number' ? Number(e.target.value) : e.target.value)}>
                  {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
                </select>
              </label>
            );
          }
        }
      })}
    </div>
  );
}
