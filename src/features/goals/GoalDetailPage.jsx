import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowsClockwise, LinkSimple, Plus, Sparkle } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { isGuestMode, maskFinancialText } from '../../lib/guestMode';
import { useGuestMode } from '../../lib/useGuestMode';
import { formatAccount, formatDate, formatMoney, todayISO } from '../../lib/format';
import { useDebouncedValue } from '../../lib/hooks';
import { GoalChart } from './GoalChart';
import { GoalForm } from './GoalForm';
import { GoalProgress, TrackBadge } from './GoalsPage';
import {
  KIND_LABELS, SAVING_IN_LABELS, durationText, useAddContribution, useDeleteGoal, useExcludeTransaction, useGoal, useGoalAnalysis,
  useLinkCandidates, useRefreshAnalysis, useRemoveContribution, useSaveGoal,
} from './useGoals';
import '../../components/layout/layout.css';
import '../commitments/commitments.css';
import './goals.css';

const whole = (n) => (n == null ? '—' : formatMoney(Math.round(n), { rounded: true }));
const SOURCE_LABELS = { manual: 'Added by you', transaction: 'Linked', auto_debit: 'Auto-debit', account: 'Watched account' };
const VERDICT_LABELS = { comfortable: 'Comfortable', stretch: 'A stretch', hard: 'Hard to fit', unclear: 'Not enough data' };

function Analysis({ goalId }) {
  const { data, isLoading } = useGoalAnalysis(goalId);
  const refresh = useRefreshAnalysis(goalId);
  const a = data?.analysis;
  const busy = refresh.isPending || data?.pending;

  return (
    <section className="goal-ai" aria-labelledby="goal-ai-title" aria-busy={busy}>
      <div className="goal-ai__head">
        <h2 id="goal-ai-title">
          <Sparkle size={18} weight="duotone" aria-hidden="true" /> Plan check
        </h2>
        <Button variant="quiet" size="small" disabled={busy} onClick={() => refresh.mutate()}>
          <ArrowsClockwise size={14} aria-hidden="true" /> {busy ? 'Checking…' : a ? 'Check again' : 'Check my plan'}
        </Button>
      </div>
      {isLoading ? (
        <p className="cm-hint">Loading…</p>
      ) : a ? (
        <>
          <p className="goal-ai__headline">
            <span className={`goal-verdict is-${a.verdict}`}>{VERDICT_LABELS[a.verdict]}</span> {maskFinancialText(a.headline)}
          </p>
          <p>{maskFinancialText(a.summary)}</p>
          {a.actions?.length > 0 && (
            <ol className="goal-ai__actions">
              {a.actions.map((x) => <li key={x}>{maskFinancialText(x)}</li>)}
            </ol>
          )}
          <p className="cm-optional">
            {data.stale && !busy && 'Your figures have changed since this was written. '}
            {a.check && !a.check.ok && 'Some numbers in this couldn’t be matched to your figures; trust the figures above. '}
            Words from {a.engine === 'local' ? 'your local model' : a.model}, {formatDate(a.generatedAt)}. Every number is computed by Squirl.
          </p>
        </>
      ) : (
        <p className="cm-hint">
          {busy
            ? 'Your AI model is looking at this goal against your recent cash flow…'
            : 'Ask your AI model whether this goal fits your recent cash flow, and what would help. It runs again on its own when your figures change, if the model is available.'}
        </p>
      )}
      {refresh.isError && <p className="import-error">{describeError(refresh.error)}</p>}
    </section>
  );
}

function AddMoneyDialog({ goalId, onClose }) {
  const add = useAddContribution(goalId);
  const toast = useToast();
  const [f, setF] = useState({ amount: '', date: todayISO(), note: '', out: false });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const amount = Number(f.amount) * (f.out ? -1 : 1);
    add.mutate({ amount, date: f.date, note: f.note.trim() || undefined }, { onSuccess: () => (toast(f.out ? 'Withdrawal recorded' : 'Added'), onClose()) });
  };
  return (
    <Dialog
      title="Add money to this goal"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="goal-money" disabled={add.isPending || !(Number(f.amount) > 0)}>{add.isPending ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      <form id="goal-money" className="cm-form" onSubmit={submit}>
        <p className="cm-hint">For money your statements don’t show: cash, or an account you don’t import.</p>
        <div className="cm-grid">
          <label className="field">
            Amount (₹)
            <input className="input" type="number" min="1" step="0.01" value={f.amount} onChange={set('amount')} required autoFocus />
          </label>
          <label className="field">
            Date
            <input className="input" type="date" value={f.date} onChange={set('date')} max={todayISO()} required />
          </label>
          <label className="field">
            Note
            <input className="input" value={f.note} onChange={set('note')} maxLength={120} placeholder="Diwali bonus" />
          </label>
        </div>
        <label className="goal-check">
          <input type="checkbox" checked={f.out} onChange={set('out')} />
          <span>I took this money out of the goal</span>
        </label>
        {add.isError && <p className="import-error">{describeError(add.error)}</p>}
      </form>
    </Dialog>
  );
}

function LinkDialog({ goalId, onClose }) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 250);
  const candidates = useLinkCandidates(goalId, debounced, true);
  const add = useAddContribution(goalId);
  const toast = useToast();
  return (
    <Dialog title="Link a transaction" onClose={onClose} wide>
      <div className="cm-form">
        <label className="field">
          Search your ledger (last 12 months)
          <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="RD, transfer, bonus" autoFocus />
        </label>
        {candidates.isLoading ? (
          <p className="cm-hint">Loading…</p>
        ) : candidates.data?.length ? (
          <ul className="goal-candidates">
            {candidates.data.map((t) => (
              <li key={t._id}>
                <div>
                  <p className="cm-row__name">{maskFinancialText(t.description)}</p>
                  <p className="cm-muted">{formatDate(t.date)} · {formatAccount(t.account)} · {t.type === 'debit' ? 'Money out' : 'Money in'}</p>
                </div>
                <span className="cm-amount goal-candidates__amount">{formatMoney(t.amount)}</span>
                <Button size="small" variant="quiet" disabled={add.isPending} onClick={() => add.mutate({ transactionId: t._id }, { onSuccess: () => toast('Linked to this goal') })}>
                  <LinkSimple size={14} aria-hidden="true" /> Link
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cm-hint">No matching transactions.</p>
        )}
        {add.isError && <p className="import-error">{describeError(add.error)}</p>}
      </div>
    </Dialog>
  );
}

function Contributions({ goal }) {
  const remove = useRemoveContribution(goal._id);
  const exclude = useExcludeTransaction(goal._id);
  const toast = useToast();
  const guest = isGuestMode();
  const onError = (e) => toast(describeError(e), { tone: 'error' });
  if (!goal.contributions.length) {
    return <p className="cm-hint">Nothing counted yet. Link an auto-debit or account in Edit, link a transaction, or add money yourself.</p>;
  }
  return (
    <ul className="cm-rows goal-money">
      {goal.contributions.map((c) => (
        <li key={c._id} className="cm-row">
          <div className="cm-row__main">
            <p className="cm-row__name">{maskFinancialText(c.description)}</p>
            <p className="cm-muted">{[formatDate(c.date), SOURCE_LABELS[c.source], c.account && formatAccount(c.account)].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="cm-card__due">
            <p className={`cm-amount${c.amount < 0 ? ' is-out' : ''}`}>{c.amount < 0 ? '−' : '+'}{formatMoney(Math.abs(c.amount))}</p>
            {c.removable && (
              <button type="button" className="link-button" disabled={guest} onClick={() => remove.mutate(c._id, { onError })}>
                {c.source === 'manual' ? 'Remove' : 'Unlink'}
              </button>
            )}
            {c.excludable && (
              <button type="button" className="link-button" disabled={guest} onClick={() => exclude.mutate(c.transactionId, { onSuccess: () => toast('Left out of this goal'), onError })}>
                Not for this goal
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GoalDetailPage() {
  useGuestMode();
  const { id } = useParams();
  const { data: goal, isLoading, isError, error } = useGoal(id);
  const [dialog, setDialog] = useState(null); // 'edit' | 'money' | 'link'
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveGoal();
  const remove = useDeleteGoal();
  const toast = useToast();
  const navigate = useNavigate();
  const guest = isGuestMode();

  if (isLoading) return <div className="insight-skeleton" />;
  if (isError) return <p className="import-error">{error.message}</p>;

  const status = goal.status === 'achieved' ? 'reached' : goal.track.status;
  const setStatus = (next, message) => save.mutate({ id: goal._id, status: next }, { onSuccess: () => toast(message), onError: (e) => toast(describeError(e), { tone: 'error' }) });

  return (
    <div className="commitments goals goal-detail">
      <Link to="/app/goals" className="goal-back">
        <ArrowLeft size={14} aria-hidden="true" /> All goals
      </Link>
      <header className="page-head cm-head">
        <div>
          <h1>{maskFinancialText(goal.name)}</h1>
          <p>
            {[KIND_LABELS[goal.kind], `${goal.inflationRate}% price rise a year`, `${SAVING_IN_LABELS[goal.savingIn]} at ${goal.returnRate}%`].join(' · ')}
          </p>
        </div>
        <TrackBadge status={status} />
      </header>

      <section className="goal-summary" aria-label="Progress">
        <GoalProgress goal={goal} />
        <dl className="cm-figures goal-figures">
          <div>
            <dt>Saved</dt>
            <dd>{whole(goal.saved)}</dd>
          </div>
          <div>
            <dt>Price today</dt>
            <dd>{whole(goal.priceNow)}</dd>
          </div>
          <div>
            <dt>{goal.eta ? `Price on ${formatDate(goal.eta)}` : 'Price then'}</dt>
            <dd>{goal.never ? 'Out of reach' : whole(goal.priceAtTarget)}</dd>
          </div>
          <div>
            <dt>{goal.plan === 'by_date' ? 'Needed each month from now' : 'Saving each month'}</dt>
            <dd>{whole(goal.monthlyNeeded)}</dd>
          </div>
          <div>
            <dt>Time left</dt>
            <dd>{goal.never ? '—' : durationText(goal.monthsLeft)}</dd>
          </div>
          <div>
            <dt>Against the plan so far</dt>
            <dd className={goal.track.status === 'behind' ? 'is-behind' : ''}>
              {goal.track.difference === 0 ? 'Even' : `${whole(Math.abs(goal.track.difference))} ${goal.track.difference < 0 ? 'behind' : 'ahead'}`}
            </dd>
          </div>
        </dl>
        {goal.plan === 'by_date' && goal.plannedMonthly && Math.abs(goal.plannedMonthly - goal.monthlyNeeded) > 1 && (
          <p className="cm-hint">
            Your plan started at {whole(goal.plannedMonthly)} a month. From what’s saved today, {whole(goal.monthlyNeeded)} a month gets you there on {formatDate(goal.eta)}.
          </p>
        )}
        {goal.never && <p className="cm-state is-missed">At {whole(goal.plannedMonthly)} a month the price rises faster than your savings grow. Save more each month or switch to a date.</p>}
      </section>

      <GoalChart history={goal.history} projection={goal.projection} label={`${goal.name}: savings against the price`} />

      <Analysis goalId={goal._id} />

      <section className="cm-section-block" aria-labelledby="goal-money-title">
        <div className="goal-section-head">
          <h2 id="goal-money-title">Money counted</h2>
          <div className="cm-actions">
            <Button variant="quiet" size="small" disabled={guest} onClick={() => setDialog('link')}>
              <LinkSimple size={14} aria-hidden="true" /> Link a transaction
            </Button>
            <Button variant="quiet" size="small" disabled={guest} onClick={() => setDialog('money')}>
              <Plus size={14} aria-hidden="true" /> Add money
            </Button>
          </div>
        </div>
        <p className="cm-muted">
          {[
            goal.opening ? `${whole(goal.opening)} saved before ${formatDate(goal.startDate)}` : null,
            goal.autoDebit ? `Auto-debit: ${goal.autoDebitName || 'linked'}` : null,
            goal.watchAccount ? `Watching ${formatAccount(goal.watchAccount)}` : null,
            `Counting from ${formatDate(goal.startDate)}`,
          ].filter(Boolean).join(' · ')}
        </p>
        <Contributions goal={goal} />
      </section>

      <footer className="goal-detail__foot">
        <Button variant="quiet" disabled={guest} onClick={() => setDialog('edit')}>Edit goal</Button>
        {goal.status === 'active' && <Button variant="quiet" disabled={guest} onClick={() => setStatus('paused', 'Paused')}>Pause</Button>}
        {goal.status === 'paused' && <Button variant="quiet" disabled={guest} onClick={() => setStatus('active', 'Resumed')}>Resume</Button>}
        {goal.status !== 'achieved' && <Button variant="quiet" disabled={guest} onClick={() => setStatus('achieved', 'Marked as reached. Well done!')}>Mark as reached</Button>}
        {goal.status === 'achieved' && <Button variant="quiet" disabled={guest} onClick={() => setStatus('active', 'Back to saving')}>Not reached yet</Button>}
        <Button
          variant={confirmDelete ? 'danger' : 'quiet'}
          disabled={guest || remove.isPending}
          onBlur={() => setConfirmDelete(false)}
          onClick={() => (confirmDelete ? remove.mutate(goal._id, { onSuccess: () => (toast(`Deleted ${goal.name}`), navigate('/app/goals')) }) : setConfirmDelete(true))}
        >
          {confirmDelete ? 'Confirm delete' : 'Delete goal'}
        </Button>
      </footer>

      {dialog === 'edit' && <GoalForm goal={goal} onClose={() => setDialog(null)} onSaved={() => toast('Saved')} />}
      {dialog === 'money' && <AddMoneyDialog goalId={goal._id} onClose={() => setDialog(null)} />}
      {dialog === 'link' && <LinkDialog goalId={goal._id} onClose={() => setDialog(null)} />}
    </div>
  );
}
