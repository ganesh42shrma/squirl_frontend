import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Target } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { isGuestMode, maskFinancialText } from '../../lib/guestMode';
import { useGuestMode } from '../../lib/useGuestMode';
import { formatDate, formatMoney } from '../../lib/format';
import { GoalForm } from './GoalForm';
import { KIND_LABELS, TRACK_LABELS, durationText, useGoals } from './useGoals';
import '../../components/layout/layout.css';
import '../commitments/commitments.css';
import './goals.css';

const whole = (n) => (n == null ? '—' : formatMoney(Math.round(n), { rounded: true }));

export function GoalProgress({ goal }) {
  const pct = Math.min(100, goal.progress || 0);
  return (
    <div className="goal-progress">
      <div className="goal-progress__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${goal.name}: ${pct}% saved`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="goal-progress__label">
        <strong>{whole(goal.saved)}</strong> of {whole(goal.priceAtTarget ?? goal.priceNow)} · {pct}%
      </p>
    </div>
  );
}

export function TrackBadge({ status }) {
  return <span className={`goal-badge is-${status}`}>{TRACK_LABELS[status] || status}</span>;
}

function etaText(goal) {
  if (goal.status === 'achieved' || goal.track.status === 'reached') return 'Reached';
  if (goal.never) return 'Not reachable at this monthly amount';
  if (!goal.eta) return '';
  return `${goal.plan === 'by_date' ? 'Buy by' : 'Can buy around'} ${formatDate(goal.eta)} · ${durationText(goal.monthsLeft)}`;
}

function GoalCard({ goal }) {
  return (
    <li className={`cm-card goal-card is-${goal.status}`}>
      <div className="cm-card__head">
        <div>
          <h3>
            <Link to={`/app/goals/${goal._id}`} className="goal-card__link">{maskFinancialText(goal.name)}</Link>
          </h3>
          <p className="cm-muted">{[KIND_LABELS[goal.kind], goal.status === 'paused' && 'Paused'].filter(Boolean).join(' · ')}</p>
        </div>
        <TrackBadge status={goal.status === 'achieved' ? 'reached' : goal.track.status} />
      </div>
      <GoalProgress goal={goal} />
      <dl className="cm-figures">
        <div>
          <dt>{goal.plan === 'by_date' ? 'Needed each month' : 'Saving each month'}</dt>
          <dd>{whole(goal.monthlyNeeded)}</dd>
        </div>
        <div>
          <dt>Price today</dt>
          <dd>{whole(goal.priceNow)}</dd>
        </div>
        <div>
          <dt>Last 3 months</dt>
          <dd>{whole(goal.lastThreeMonths)}</dd>
        </div>
      </dl>
      <p className="cm-hint">{etaText(goal)}</p>
    </li>
  );
}

export function GoalsPage() {
  useGuestMode(); // re-render when amounts are hidden or shown
  const { data, isLoading, isError, error } = useGoals();
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  if (isLoading) return <div className="insight-skeleton" />;
  if (isError) return <p className="import-error">{error.message}</p>;

  const active = data.items.filter((g) => g.status !== 'achieved');
  const done = data.items.filter((g) => g.status === 'achieved');

  return (
    <div className="commitments goals">
      <header className="page-head cm-head">
        <div>
          <h1>Goals</h1>
          <p>Things you’re saving for. Squirl adds inflation to the price, works out the monthly saving, and tracks the money from your auto-debits, accounts and ledger.</p>
        </div>
        <Button disabled={isGuestMode()} title={isGuestMode() ? 'Turn off guest mode to add goals' : undefined} onClick={() => setCreating(true)}>
          <Plus size={16} aria-hidden="true" /> New goal
        </Button>
      </header>

      {data.items.length === 0 ? (
        <section className="goal-empty">
          <Target size={36} weight="duotone" aria-hidden="true" />
          <h2>What are you saving for?</h2>
          <p>A bike, a trip, a home deposit. Enter what it costs today and when you want it, and Squirl works out what to put away each month, adjusted for rising prices.</p>
          <Button disabled={isGuestMode()} onClick={() => setCreating(true)}>Set your first goal</Button>
        </section>
      ) : (
        <>
          <dl className="cm-totals">
            <div>
              <dt>Saved across goals</dt>
              <dd>{whole(data.totals.saved)}</dd>
            </div>
            <div>
              <dt>Needed each month</dt>
              <dd>{whole(data.totals.monthlyNeeded)}</dd>
            </div>
            <div>
              <dt>Active goals</dt>
              <dd>{data.totals.active}</dd>
            </div>
          </dl>
          <section className="cm-section-block" aria-labelledby="goals-active">
            <h2 id="goals-active">Saving for</h2>
            <ul className="cm-cards goal-cards">
              {active.map((g) => <GoalCard key={g._id} goal={g} />)}
            </ul>
          </section>
          {done.length > 0 && (
            <section className="cm-section-block" aria-labelledby="goals-done">
              <h2 id="goals-done">Reached</h2>
              <ul className="cm-cards goal-cards">
                {done.map((g) => <GoalCard key={g._id} goal={g} />)}
              </ul>
            </section>
          )}
        </>
      )}

      {creating && (
        <GoalForm
          onClose={() => setCreating(false)}
          onSaved={(goal) => {
            toast(`Added ${goal.name}`);
            navigate(`/app/goals/${goal._id}`);
          }}
        />
      )}
    </div>
  );
}
