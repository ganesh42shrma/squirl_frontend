import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowSquareOut, Sparkle } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { describeError } from '../../api/client';
import { formatAccount, formatDate, formatMoney, todayISO } from '../../lib/format';
import { useDebouncedValue } from '../../lib/hooks';
import { useInflation } from '../live/useLive';
import { GoalChart } from './GoalChart';
import { KIND_LABELS, SAVING_IN_LABELS, durationText, useAiSettings, useGoalAssist, useGoalOptions, usePlanPreview, useSaveGoal } from './useGoals';

const RETURN_DEFAULTS = { cash: 0, savings: 3, rd: 6.5, fd: 7, sip: 12, other: 0 };

const inYears = (n) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
};

const blank = {
  name: '', kind: 'other', price: '', plan: 'by_date', targetDate: inYears(3), monthly: '', opening: '',
  inflationRate: '6', savingIn: 'savings', returnRate: '3', startDate: todayISO(), autoDebit: '', watch: false, watchAccount: '', notes: '',
};

function fromGoal(goal) {
  if (!goal) return blank;
  return {
    ...blank,
    name: goal.name,
    kind: goal.kind,
    price: String(goal.price),
    plan: goal.plan,
    targetDate: goal.targetDate || inYears(3),
    monthly: goal.plan === 'by_amount' && goal.monthly ? String(goal.monthly) : '',
    opening: goal.opening ? String(goal.opening) : '',
    inflationRate: String(goal.inflationRate),
    savingIn: goal.savingIn,
    returnRate: String(goal.returnRate),
    startDate: goal.startDate,
    autoDebit: goal.autoDebit || '',
    watch: Boolean(goal.watchAccount),
    watchAccount: goal.watchAccount || '',
    notes: goal.notes || '',
  };
}

const num = (v) => (v === '' || v == null ? null : Number(v));

function toBody(f) {
  return {
    name: f.name.trim(),
    kind: f.kind,
    price: num(f.price),
    plan: f.plan,
    targetDate: f.plan === 'by_date' ? f.targetDate : null,
    monthly: f.plan === 'by_amount' ? num(f.monthly) : undefined,
    opening: num(f.opening) ?? 0,
    inflationRate: num(f.inflationRate) ?? 0,
    savingIn: f.savingIn,
    returnRate: num(f.returnRate) ?? 0,
    startDate: f.startDate,
    autoDebit: f.autoDebit || null,
    watchAccount: f.watch && f.watchAccount ? f.watchAccount : null,
    notes: f.notes.trim() || null,
  };
}

/** What the plan works out to, recalculated as you type. */
function PlanPreview({ f }) {
  const body = useMemo(() => {
    const price = num(f.price);
    if (!price || price <= 0) return null;
    if (f.plan === 'by_date' && (!f.targetDate || f.targetDate <= todayISO())) return null;
    if (f.plan === 'by_amount' && !(num(f.monthly) > 0)) return null;
    return {
      price,
      plan: f.plan,
      targetDate: f.plan === 'by_date' ? f.targetDate : undefined,
      monthly: f.plan === 'by_amount' ? num(f.monthly) : undefined,
      opening: num(f.opening) ?? 0,
      inflationRate: num(f.inflationRate) ?? 0,
      returnRate: num(f.returnRate) ?? 0,
    };
  }, [f.price, f.plan, f.targetDate, f.monthly, f.opening, f.inflationRate, f.returnRate]);
  const debounced = useDebouncedValue(body, 300);
  const plan = usePlanPreview(debounced);

  if (!body) return <p className="goal-preview goal-preview--empty">Enter the price and {f.plan === 'by_date' ? 'a date' : 'a monthly amount'} to see the plan.</p>;
  if (!plan.data) return <p className="goal-preview goal-preview--empty">Working it out…</p>;
  const p = plan.data;
  return (
    <section className="goal-preview" aria-live="polite" aria-label="Your plan">
      {f.plan === 'by_date' ? (
        <p className="goal-preview__headline">
          Save <strong>{formatMoney(Math.ceil(p.monthlyNeeded), { rounded: true })}</strong> a month to buy it on {formatDate(p.eta)}, when it will cost about{' '}
          <strong>{formatMoney(p.priceAtTarget, { rounded: true })}</strong>.
        </p>
      ) : p.never ? (
        <p className="goal-preview__headline is-warning">At this amount, the price rises faster than your savings grow. Save more each month, or expect a lower inflation rate.</p>
      ) : (
        <p className="goal-preview__headline">
          You can buy it in <strong>{durationText(p.monthsLeft)}</strong> ({formatDate(p.eta)}), when it will cost about{' '}
          <strong>{formatMoney(p.priceAtTarget, { rounded: true })}</strong>.
        </p>
      )}
      <GoalChart projection={p.projection} label="Planned savings against the price" />
    </section>
  );
}

/** A compact summary of what the model found: the price first, the rest one line each. */
function SetupHelp({ help, onAddExtras }) {
  const priced = help.extraCosts.filter((c) => c.approx);
  const extras = priced.reduce((sum, c) => sum + c.approx, 0);
  const noPrice = help.searchUnavailable === 'quota'
    ? 'Live price unavailable on this key’s plan right now. Enter the price.'
    : help.searchUnavailable === 'model'
      ? 'This model can’t look up prices. Enter the price.'
      : help.searched
        ? 'No current price found. Enter the price.'
        : 'Enter the price yourself.';
  return (
    <aside className="goal-help" aria-label="Suggested by your AI model" aria-live="polite">
      <p className="goal-help__price">
        {help.price ? (
          <>
            <strong>{formatMoney(help.price, { rounded: true })}</strong>
            <span>{[help.item, help.priceBasis].filter(Boolean).join(' · ')}</span>
          </>
        ) : (
          <span>{noPrice}</span>
        )}
      </p>
      <ul className="goal-help__facts">
        {help.inflationRate != null && <li>Prices rise about {help.inflationRate}% a year</li>}
        {help.savingIn && <li>Keep it in a {SAVING_IN_LABELS[help.savingIn].toLowerCase()}</li>}
        {extras > 0 && help.price && (
          <li>
            Extras ~{formatMoney(extras, { rounded: true })} ({priced.map((c) => c.item.toLowerCase()).join(', ')}){' '}
            <button type="button" className="link-button" onClick={() => onAddExtras(extras)}>
              Add to price
            </button>
          </li>
        )}
      </ul>
      {help.tip && <p className="goal-help__tip">{help.tip}</p>}
      <div className="goal-help__foot">
        {help.provider === 'local' ? 'Local model' : help.model} · Check prices before relying on them
        {help.sources.length > 0 && (
          <>
            {' · '}
            <details className="goal-help__sources">
              <summary>{help.sources.length} source{help.sources.length > 1 ? 's' : ''}</summary>
              <ul>
                {help.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer noopener">
                      {s.title} <ArrowSquareOut size={11} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * Official India CPI (MoSPI) for this kind of goal: the closest category, its division and all
 * items, each a click to use. A rate below zero (prices fell over the year) is used as 0%.
 */
function CpiHint({ kind, onPick }) {
  const { data } = useInflation();
  const cpi = data?.cpi;
  if (!cpi) return null;
  const options = [...(cpi.forKinds[kind] || []), { label: 'All items', inflation: cpi.data.general }];
  return (
    <span className="cm-optional goal-cpi">
      Official CPI, {cpi.data.month.slice(0, 3)} {cpi.data.year}:{' '}
      {options.map((o, i) => (
        <span key={o.label}>
          {i > 0 && ' · '}
          <button
            type="button"
            className="link-button"
            title={o.inflation < 0 ? 'Prices fell over the year; a goal uses 0% at the lowest' : `Use ${o.inflation}%`}
            onClick={() => onPick(Math.max(0, Math.round(o.inflation * 10) / 10))}
          >
            {o.label} {o.inflation.toFixed(1)}%
          </button>
        </span>
      ))}
    </span>
  );
}

const AUTOFILL_FIELDS = { kind: 'kind', price: 'price', inflationRate: 'yearly price rise', savingIn: 'where the money sits' };

export function GoalForm({ goal, onClose, onSaved }) {
  const editing = Boolean(goal?._id);
  const [f, setF] = useState(() => fromGoal(goal));
  const [help, setHelp] = useState(null);
  const touched = useRef(new Set(editing ? Object.keys(AUTOFILL_FIELDS) : [])); // fields the person typed in
  const asked = useRef(editing ? goal.name : '');
  const save = useSaveGoal();
  const assist = useGoalAssist();
  const options = useGoalOptions();
  const ai = useAiSettings();
  const set = (key) => (e) => {
    touched.current.add(key === 'returnRate' ? 'savingIn' : key);
    setF((prev) => ({ ...prev, [key]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  };

  const setSavingIn = (e) => {
    const savingIn = e.target.value;
    touched.current.add('savingIn');
    setF((prev) => ({ ...prev, savingIn, returnRate: String(RETURN_DEFAULTS[savingIn] ?? 0) }));
  };

  // Ask the model, then fill only the fields the person hasn't typed in themselves.
  const askForHelp = (name = f.name.trim()) => {
    asked.current = name;
    assist.mutate(
      { name, plan: f.plan, targetDate: f.plan === 'by_date' ? f.targetDate : undefined, monthly: f.plan === 'by_amount' ? num(f.monthly) : undefined, opening: num(f.opening) ?? 0 },
      {
        onSuccess: (h) => {
          if (asked.current !== name) return; // the name changed while it was answering
          const changes = {};
          if (!touched.current.has('kind') && h.kind) changes.kind = h.kind;
          if (!touched.current.has('price') && h.price) changes.price = String(h.price);
          if (!touched.current.has('inflationRate') && h.inflationRate != null) changes.inflationRate = String(h.inflationRate);
          if (!touched.current.has('savingIn') && h.savingIn) Object.assign(changes, { savingIn: h.savingIn, returnRate: String(RETURN_DEFAULTS[h.savingIn] ?? 0) });
          setHelp(h);
          setF((prev) => ({ ...prev, ...changes }));
        },
      },
    );
  };

  // With a cloud model, look it up on its own once the name stops changing for a moment.
  const autoFill = !editing && ai.data?.mode === 'api';
  const typedName = useDebouncedValue(f.name.trim(), 1500);
  useEffect(() => {
    if (!autoFill || typedName.length < 3 || typedName === asked.current || typedName !== f.name.trim()) return;
    askForHelp(typedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFill, typedName]);

  const submit = (e) => {
    e.preventDefault();
    save.mutate({ ...(editing && { id: goal._id }), ...toBody(f) }, { onSuccess: (saved) => (onSaved?.(saved), onClose()) });
  };

  const autoDebits = options.data?.autoDebits || [];
  const accounts = options.data?.accounts || [];
  const chosenDebit = autoDebits.find((d) => d._id === f.autoDebit);

  return (
    <Dialog
      title={editing ? `Edit ${goal.name}` : 'New goal'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="goal-form" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add goal'}
          </Button>
        </>
      }
    >
      <form id="goal-form" className="cm-form goal-form" onSubmit={submit}>
        <div className="goal-form__name">
          <label className="field">
            What do you want?
            <input className="input" value={f.name} onChange={set('name')} required maxLength={80} placeholder="Triumph Street Triple" autoFocus />
          </label>
          <Button variant="quiet" disabled={f.name.trim().length < 2 || assist.isPending} onClick={() => askForHelp()}>
            <Sparkle size={16} weight="duotone" aria-hidden="true" /> {assist.isPending ? 'Looking it up…' : help ? 'Look up again' : autoFill ? 'Look it up' : 'Suggest settings'}
          </Button>
        </div>
        {!help && !assist.isPending && autoFill && <p className="cm-optional">Type what you want and Squirl looks up its price and fills in the settings.</p>}
        {assist.isPending && <p className="cm-hint">Looking up {asked.current}{ai.data?.webSearch && ai.data?.mode === 'api' ? ' and its current price' : ''}…</p>}
        {assist.isError && <p className="import-error">{describeError(assist.error)}</p>}
        {help && (
          <SetupHelp
            help={help}
            onAddExtras={(extra) => {
              touched.current.add('price');
              setF((prev) => ({ ...prev, price: String(Math.round(Number(prev.price || 0) + extra)) }));
            }}
          />
        )}

        <div className="cm-grid">
          <label className="field">
            Kind
            <select className="select" value={f.kind} onChange={set('kind')}>
              {Object.entries(KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="field">
            What it costs today (₹)
            <input className="input" type="number" min="1" step="1" value={f.price} onChange={set('price')} required placeholder="1100000" />
            <span className="cm-optional">On-road, with the extras you’ll pay for</span>
          </label>
          <label className="field">
            Already saved (₹)
            <input className="input" type="number" min="0" step="1" value={f.opening} onChange={set('opening')} placeholder="0" />
          </label>
        </div>

        <fieldset className="cm-kinds">
          <legend className="visually-hidden">How do you want to plan it?</legend>
          {[['by_date', 'Buy it by a date'], ['by_amount', 'Save a fixed amount']].map(([value, label]) => (
            <label key={value} className={`cm-kind${f.plan === value ? ' is-active' : ''}`}>
              <input type="radio" name="plan" value={value} checked={f.plan === value} onChange={set('plan')} />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="cm-grid">
          {f.plan === 'by_date' ? (
            <label className="field">
              When do you want it?
              <input className="input" type="date" value={f.targetDate} onChange={set('targetDate')} min={todayISO()} required />
            </label>
          ) : (
            <label className="field">
              You can save each month (₹)
              <input className="input" type="number" min="1" step="1" value={f.monthly} onChange={set('monthly')} required placeholder="25000" />
            </label>
          )}
          <label className="field">
            Price rise a year (%)
            <input className="input" type="number" min="0" max="50" step="0.5" value={f.inflationRate} onChange={set('inflationRate')} />
            <CpiHint kind={f.kind} onPick={(rate) => set('inflationRate')(String(rate))} />
          </label>
          <label className="field">
            Where the money sits
            <select className="select" value={f.savingIn} onChange={setSavingIn}>
              {Object.entries(SAVING_IN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="field">
            Expected return a year (%)
            <input className="input" type="number" min="0" max="50" step="0.1" value={f.returnRate} onChange={set('returnRate')} />
            <span className="cm-optional">{f.savingIn === 'sip' ? 'Market returns vary; this is an assumption, not a promise' : 'Change it to your bank’s rate'}</span>
          </label>
        </div>

        <PlanPreview f={f} />

        <fieldset className="cm-section">
          <legend>Track the money automatically</legend>
          <div className="cm-grid">
            <label className="field">
              Auto-debit that funds it
              <select className="select" value={f.autoDebit} onChange={set('autoDebit')}>
                <option value="">None</option>
                {autoDebits.map((d) => (
                  <option key={d._id} value={d._id} disabled={Boolean(d.goal && d.goal._id !== goal?._id)}>
                    {d.name}{d.amount ? ` · ${formatMoney(d.amount)}` : ''}{d.goal && d.goal._id !== goal?._id ? ` (funds ${d.goal.name})` : ''}
                  </option>
                ))}
              </select>
              <span className="cm-optional">
                {chosenDebit && !chosenDebit.matched
                  ? 'This auto-debit isn’t matched to a statement merchant yet, so its payments can’t be found. Match it in EMIs & bills.'
                  : 'An RD or SIP from EMIs & bills. Each payment counts toward this goal. One auto-debit funds one goal.'}
              </span>
            </label>
            <label className="field">
              Count savings from
              <input className="input" type="date" value={f.startDate} onChange={set('startDate')} max={todayISO()} />
            </label>
          </div>
          <label className="goal-check">
            <input type="checkbox" checked={f.watch} onChange={set('watch')} />
            <span>
              I keep this money in a separate account
              <span className="cm-optional">Money in counts toward the goal, money out counts against it, interest included. Optional.</span>
            </span>
          </label>
          {f.watch && (
            <label className="field">
              Watch this account
              <select className="select" value={f.watchAccount} onChange={set('watchAccount')} required>
                <option value="">Choose an account</option>
                {accounts.map((a) => (
                  <option key={a.account} value={a.account}>
                    {formatAccount(a.account)} · {a.count} rows, last {formatDate(a.last)}
                  </option>
                ))}
              </select>
              <span className="cm-optional">Import that account’s statements so Squirl can see its money. An RD that isn’t imported is better linked as an auto-debit above.</span>
            </label>
          )}
        </fieldset>

        {save.isError && <p className="import-error">{describeError(save.error)}</p>}
      </form>
    </Dialog>
  );
}
