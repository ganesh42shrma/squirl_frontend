import { isGuestMode, maskFinancialText } from '../../lib/guestMode';
import { useState } from 'react';
import { CalendarCheck, CheckCircle, Clock, Plus, Warning } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { formatAccount, formatDate, formatMoney } from '../../lib/format';
import { CommitmentForm } from './CommitmentForm';
import { FREQUENCY_LABELS, KIND_LABELS, useCommitments, useDeleteCommitment, useDetectedRecurring, useSchedule } from './useCommitments';
import '../../components/layout/layout.css';
import './commitments.css';

const money = (n) => (n == null ? '—' : formatMoney(n));
const whole = (n) => (n == null ? '—' : formatMoney(Math.round(n), { rounded: true }));

function dueText(item) {
  if (item.status === 'ended') return 'Finished';
  if (item.status === 'paused') return 'Paused';
  if (!item.next) return '';
  const d = item.next.daysUntil;
  const when = d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
  return item.next.paid ? `Already paid for ${formatDate(item.next.date)}` : `Due ${when} · ${formatDate(item.next.date)}`;
}

// The latest due date, as the statements show it.
function LastPayment({ last }) {
  if (!last) return null;
  if (last.state === 'paid') {
    return (
      <span className="cm-state is-paid">
        <CheckCircle size={14} weight="fill" aria-hidden="true" /> Paid {formatDate(last.payment.date)} ({money(last.payment.amount)})
      </span>
    );
  }
  if (last.state === 'missed') {
    return (
      <span className="cm-state is-missed">
        <Warning size={14} weight="fill" aria-hidden="true" /> No payment found for {formatDate(last.date)}
      </span>
    );
  }
  if (last.state === 'awaiting') {
    return (
      <span className="cm-state">
        <Clock size={14} aria-hidden="true" /> {formatDate(last.date)}: import a newer statement to check it
      </span>
    );
  }
  return null;
}

function Schedule({ id }) {
  const { data, isLoading } = useSchedule(id, true);
  if (isLoading) return <p className="cm-hint">Working out the schedule…</p>;
  if (!data?.rows.length) return <p className="cm-hint">Add the loan amount and tenure, or your outstanding principal, to see the schedule.</p>;
  return (
    <div className="data-table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">EMI</th>
            <th scope="col">Due</th>
            <th scope="col">Interest</th>
            <th scope="col">Principal</th>
            <th scope="col">Left after</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.n}>
              <th scope="row">{r.n}</th>
              <td>{formatDate(r.date)}</td>
              <td className="num">{money(r.interest)}</td>
              <td className="num">{money(r.principal)}</td>
              <td className="num">{money(r.outstanding)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemActions({ item, onEdit }) {
  const remove = useDeleteCommitment();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="cm-actions">
      <button type="button" className="link-button" disabled={isGuestMode()} title={isGuestMode() ? 'Turn off guest mode to edit financial details' : undefined} onClick={() => onEdit(item)}>
        Edit
      </button>
      <button
        type="button"
        className="link-button cm-danger"
        onClick={() =>
          confirm ? remove.mutate(item._id, { onSuccess: () => toast(`Deleted ${maskFinancialText(item.name)}`), onError: (e) => toast(describeError(e), { tone: 'error' }) }) : setConfirm(true)
        }
        onBlur={() => setConfirm(false)}
      >
        {confirm ? 'Confirm delete' : 'Delete'}
      </button>
    </div>
  );
}

function LoanCard({ item, onEdit }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const loan = item.loan || {};
  return (
    <li className={`cm-card is-${item.status}`}>
      <div className="cm-card__head">
        <div>
          <h3>{maskFinancialText(item.name)}</h3>
          <p className="cm-muted">
            {[item.lender, item.account && formatAccount(item.account), item.interestRate != null && `${item.interestRate}% a year`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="cm-card__due">
          <p className="cm-amount">{money(item.amount)}</p>
          <p className={`cm-due is-${item.status}`}>{dueText(item)}</p>
        </div>
      </div>

      {loan.outstanding != null && (
        <>
          <div className="cm-progress" role="img" aria-label={`${loan.progress ?? 0}% of the principal repaid`}>
            <span style={{ width: `${Math.min(100, loan.progress ?? 0)}%` }} />
          </div>
          <dl className="cm-figures">
            <div>
              <dt>Outstanding</dt>
              <dd>{whole(loan.outstanding)}</dd>
            </div>
            <div>
              <dt>Principal paid</dt>
              <dd>{whole(loan.paidPrincipal)}</dd>
            </div>
            <div>
              <dt>Loan amount</dt>
              <dd>{whole(item.principal)}</dd>
            </div>
            <div>
              <dt>EMIs left</dt>
              <dd>{loan.emisLeft ?? '—'}</dd>
            </div>
            <div>
              <dt>Interest still to pay</dt>
              <dd>{whole(loan.interestLeft)}</dd>
            </div>
            <div>
              <dt>Ends</dt>
              <dd>{item.endDate ? formatDate(item.endDate) : '—'}</dd>
            </div>
          </dl>
          <p className="cm-hint">
            {loan.source === 'yours'
              ? `From the figures you entered (as of ${formatDate(item.balanceAsOf)}), moved forward by the EMIs due since.`
              : 'Worked out from the start date, rate and tenure. Enter your lender’s outstanding figure for exact numbers.'}
            {loan.emiMismatch && ` Your EMI differs from ${money(loan.expectedEmi)}, what this rate and tenure would give; check them.`}
          </p>
        </>
      )}
      {loan.neverEnds && <p className="cm-state is-missed">This EMI doesn’t cover the monthly interest, so the loan would never end. Check the figures.</p>}

      <div className="cm-card__foot">
        <LastPayment last={item.last} />
        {!item.linked && <span className="cm-muted">Not linked to statement payments</span>}
        <div className="cm-actions">
          {item.kind === 'loan' && (
            <button type="button" className="link-button" onClick={() => setShowSchedule((v) => !v)}>
              {showSchedule ? 'Hide schedule' : 'Schedule'}
            </button>
          )}
          <ItemActions item={item} onEdit={onEdit} />
        </div>
      </div>
      {showSchedule && <Schedule id={item._id} />}
    </li>
  );
}

function BillRow({ item, onEdit }) {
  return (
    <li className={`cm-row is-${item.status}`}>
      <div className="cm-row__main">
        <p className="cm-row__name">{maskFinancialText(item.name)}</p>
        <p className="cm-muted">
          {[KIND_LABELS[item.kind], FREQUENCY_LABELS[item.frequency], item.lender, item.account && formatAccount(item.account)].filter(Boolean).join(' · ')}
        </p>
        <LastPayment last={item.last} />
      </div>
      <div className="cm-card__due">
        <p className="cm-amount">{money(item.amount)}</p>
        <p className={`cm-due is-${item.status}`}>{dueText(item)}</p>
        <ItemActions item={item} onEdit={onEdit} />
      </div>
    </li>
  );
}

function Detected({ onAdd }) {
  const { data = [] } = useDetectedRecurring();
  if (!data.length) return null;
  return (
    <section className="cm-section-block" aria-labelledby="detected-title">
      <h2 id="detected-title">Looks recurring</h2>
      <p className="cm-muted">Payments that show up every month at a steady amount in your statements. Add the ones that are loans or bills.</p>
      <ul className="cm-detected">
        {data.map((d) => (
          <li key={d.matchKey}>
            <div>
              <p className="cm-row__name">{maskFinancialText(d.name)}</p>
              <p className="cm-muted">
                {money(d.amount)} around day {d.dueDay} · {d.months} months · last {formatDate(d.lastPaid)}
              </p>
            </div>
            <Button
              variant="quiet"
              size="small"
              disabled={isGuestMode()}
              onClick={() =>
                onAdd({ kind: d.kind, name: d.name, amount: d.amount, dueDay: d.dueDay, startDate: d.startDate, matchKey: d.matchKey, account: d.account })
              }
            >
              Add as {KIND_LABELS[d.kind].toLowerCase()}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CommitmentsPage() {
  const { data, isLoading, isError, error } = useCommitments();
  const [form, setForm] = useState(null); // null = closed; {} = new; item = edit/prefill
  const toast = useToast();

  if (isLoading) return <div className="insight-skeleton" />;
  if (isError) return <p className="import-error">{error.message}</p>;

  const items = data.items;
  const loans = items.filter((i) => i.kind === 'loan');
  const bills = items.filter((i) => i.kind !== 'loan');
  const upcoming = items
    .filter((i) => i.next && !i.next.paid && i.next.daysUntil <= 30 && i.active)
    .sort((a, b) => a.next.daysUntil - b.next.daysUntil);
  const missed = items.filter((i) => i.status === 'missed');

  return (
    <div className="commitments">
      <header className="page-head cm-head">
        <div>
          <h1>EMIs &amp; bills</h1>
          <p>Loans, subscriptions and auto-debits: what’s due, what’s paid, and what’s left on each loan. Squirl checks due dates against your statements.</p>
        </div>
        <Button disabled={isGuestMode()} onClick={() => setForm({})}>
          <Plus size={16} aria-hidden="true" /> Add
        </Button>
      </header>

      <dl className="cm-totals">
        <div>
          <dt>Every month</dt>
          <dd>{whole(data.totals.monthly)}</dd>
        </div>
        <div>
          <dt>Owed on loans</dt>
          <dd>{whole(data.totals.loansOutstanding)}</dd>
        </div>
        <div>
          <dt>Statements up to</dt>
          <dd>{data.statementsThrough ? formatDate(data.statementsThrough) : '—'}</dd>
        </div>
      </dl>

      {missed.length > 0 && (
        <ul className="cm-alerts">
          {missed.map((i) => (
            <li key={i._id}>
              <Warning size={18} weight="duotone" aria-hidden="true" />
              No payment found for <strong>{maskFinancialText(i.name)}</strong> due {formatDate(i.last.date)}, though your statements cover that date.
            </li>
          ))}
        </ul>
      )}

      {upcoming.length > 0 && (
        <section className="cm-section-block" aria-labelledby="upcoming-title">
          <h2 id="upcoming-title">
            <CalendarCheck size={20} weight="duotone" aria-hidden="true" /> Next 30 days
          </h2>
          <ul className="cm-upcoming">
            {upcoming.map((i) => (
              <li key={i._id} className={`is-${i.status}`}>
                <span className="cm-upcoming__date">{formatDate(i.next.date).replace(/ \d{4}$/, '')}</span>
                <span>{maskFinancialText(i.name)}</span>
                <span className="num">{money(i.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cm-section-block" aria-labelledby="loans-title">
        <h2 id="loans-title">Loans</h2>
        {loans.length ? (
          <ul className="cm-cards">
            {loans.map((i) => (
              <LoanCard key={i._id} item={i} onEdit={setForm} />
            ))}
          </ul>
        ) : (
          <p className="cm-muted">No loans yet. Add one with its amount, rate and tenure, and Squirl works out the rest.</p>
        )}
      </section>

      <section className="cm-section-block" aria-labelledby="bills-title">
        <h2 id="bills-title">Subscriptions &amp; auto-debits</h2>
        {bills.length ? (
          <ul className="cm-rows">
            {bills.map((i) => (
              <BillRow key={i._id} item={i} onEdit={setForm} />
            ))}
          </ul>
        ) : (
          <p className="cm-muted">Nothing yet. Netflix, insurance, SIPs, rent auto-debits… anything that repeats.</p>
        )}
      </section>

      <Detected onAdd={(prefill) => setForm(prefill)} />

      {form && !isGuestMode() && <CommitmentForm initial={form} onClose={() => setForm(null)} onSaved={(saved) => toast(`${saved.name} saved`)} />}
    </div>
  );
}
