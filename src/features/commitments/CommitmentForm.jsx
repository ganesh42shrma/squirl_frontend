import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { describeError } from '../../api/client';
import { formatMoney, todayISO } from '../../lib/format';
import { CategorySelect } from '../categories/CategorySelect';
import { FREQUENCY_LABELS, KIND_LABELS, previewEmi, useMerchantSearch, useSaveCommitment } from './useCommitments';

const blank = { kind: 'loan', name: '', lender: '', amount: '', frequency: 'monthly', dueDay: '5', startDate: todayISO(), endDate: '', principal: '', interestRate: '', tenureMonths: '', paidPrincipal: '', outstanding: '', balanceAsOf: '', account: '', category: null, matchKey: '', remindDays: '3', notes: '' };

// Form state is strings; the API wants numbers or null for empty fields.
function toBody(f) {
  const num = (v) => (v === '' || v == null ? null : Number(v));
  const text = (v) => (v && String(v).trim() ? String(v).trim() : null);
  const body = {
    kind: f.kind,
    name: f.name.trim(),
    lender: text(f.lender),
    amount: num(f.amount),
    frequency: f.kind === 'loan' ? 'monthly' : f.frequency,
    dueDay: Number(f.dueDay),
    startDate: f.startDate,
    endDate: f.endDate || null,
    account: text(f.account),
    category: f.category || null,
    matchKey: text(f.matchKey),
    remindDays: Number(f.remindDays || 0),
    notes: text(f.notes),
  };
  if (f.kind === 'loan') {
    Object.assign(body, {
      principal: num(f.principal),
      interestRate: num(f.interestRate),
      tenureMonths: num(f.tenureMonths),
      paidPrincipal: num(f.paidPrincipal),
      outstanding: num(f.outstanding),
      balanceAsOf: f.outstanding !== '' ? f.balanceAsOf || todayISO() : null,
    });
  }
  return body;
}

const fromItem = (item) =>
  Object.fromEntries(Object.entries({ ...blank, ...item }).map(([k, v]) => [k, v == null ? (k === 'category' ? null : '') : k === 'category' ? v : String(v)]));

/** Add or edit a loan, subscription or auto-debit. `initial` pre-fills (e.g. from a detected payment). */
export function CommitmentForm({ initial, onClose, onSaved }) {
  const editing = Boolean(initial?._id);
  const [f, setF] = useState(() => fromItem(initial || {}));
  const [merchantSearch, setMerchantSearch] = useState('');
  const save = useSaveCommitment();
  const merchants = useMerchantSearch(merchantSearch);
  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e?.target ? e.target.value : e }));
  const isLoan = f.kind === 'loan';
  const emi = isLoan ? previewEmi(f.principal, f.interestRate, f.tenureMonths) : null;

  const submit = (e) => {
    e.preventDefault();
    save.mutate({ ...(editing && { id: initial._id }), ...toBody(f) }, { onSuccess: (saved) => (onSaved?.(saved), onClose()) });
  };

  return (
    <Dialog
      title={editing ? `Edit ${initial.name}` : 'Add a loan, subscription or auto-debit'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="commitment-form" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="commitment-form" className="cm-form" onSubmit={submit}>
        <fieldset className="cm-kinds">
          <legend className="visually-hidden">Type</legend>
          {Object.entries(KIND_LABELS).map(([value, label]) => (
            <label key={value} className={`cm-kind${f.kind === value ? ' is-active' : ''}`}>
              <input type="radio" name="kind" value={value} checked={f.kind === value} onChange={set('kind')} />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="cm-grid">
          <label className="field">
            Name
            <input className="input" value={f.name} onChange={set('name')} required maxLength={80} placeholder={isLoan ? 'Car loan' : 'Netflix'} />
          </label>
          <label className="field">
            {isLoan ? 'Lender' : 'Paid to'}
            <input className="input" value={f.lender} onChange={set('lender')} maxLength={80} placeholder={isLoan ? 'Cars24 Financial' : 'Netflix India'} />
          </label>
          <label className="field">
            {isLoan ? 'EMI (₹)' : 'Amount (₹)'}
            <input className="input" type="number" min="0" step="0.01" value={f.amount} onChange={set('amount')} required={!isLoan} placeholder={emi ? `${Math.round(emi)} (worked out)` : ''} />
          </label>
          {!isLoan && (
            <label className="field">
              How often
              <select className="select" value={f.frequency} onChange={set('frequency')}>
                {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            Due on day
            <input className="input" type="number" min="1" max="31" value={f.dueDay} onChange={set('dueDay')} required />
          </label>
          <label className="field">
            {isLoan ? 'First EMI / loan start' : 'Started on'}
            <input className="input" type="date" value={f.startDate} onChange={set('startDate')} required />
          </label>
          <label className="field">
            Ends on
            <input className="input" type="date" value={f.endDate} onChange={set('endDate')} min={f.startDate} />
            <span className="cm-optional">{isLoan ? 'Worked out from the tenure if empty' : 'Optional'}</span>
          </label>
        </div>

        {isLoan && (
          <fieldset className="cm-section">
            <legend>Loan details</legend>
            <div className="cm-grid">
              <label className="field">
                Total loan amount (₹)
                <input className="input" type="number" min="0" step="0.01" value={f.principal} onChange={set('principal')} />
              </label>
              <label className="field">
                Interest rate (% a year)
                <input className="input" type="number" min="0" max="100" step="0.01" value={f.interestRate} onChange={set('interestRate')} />
              </label>
              <label className="field">
                Tenure (months)
                <input className="input" type="number" min="1" max="600" value={f.tenureMonths} onChange={set('tenureMonths')} />
              </label>
            </div>
            {emi && (
              <p className="cm-hint">
                EMI for these figures: <strong>{formatMoney(Math.round(emi * 100) / 100)}</strong>
                {f.amount && Math.abs(Number(f.amount) - emi) / emi > 0.02 && ' (different from the EMI you entered; the lender’s figure wins)'}
              </p>
            )}
            <p className="cm-hint">From your lender’s latest statement (optional, but more accurate than working it out):</p>
            <div className="cm-grid">
              <label className="field">
                Principal paid (₹)
                <input className="input" type="number" min="0" step="0.01" value={f.paidPrincipal} onChange={set('paidPrincipal')} />
              </label>
              <label className="field">
                Principal outstanding (₹)
                <input className="input" type="number" min="0" step="0.01" value={f.outstanding} onChange={set('outstanding')} />
              </label>
              <label className="field">
                As of
                <input className="input" type="date" value={f.balanceAsOf} onChange={set('balanceAsOf')} max={todayISO()} />
              </label>
            </div>
          </fieldset>
        )}

        <fieldset className="cm-section">
          <legend>Payments and reminders</legend>
          <div className="field">
            Match its payments in your statements
            {f.matchKey ? (
              <span className="cm-linked">
                <span>{f.matchKey}</span>
                <button type="button" className="link-button" onClick={() => setF((p) => ({ ...p, matchKey: '' }))}>
                  Unlink
                </button>
              </span>
            ) : (
              <>
                <input className="input" value={merchantSearch} onChange={(e) => setMerchantSearch(e.target.value)} placeholder="Search your statements, e.g. NACH, Netflix, loan" />
                {merchants.data?.length > 0 && (
                  <ul className="cm-merchants">
                    {merchants.data.map((m) => (
                      <li key={m.matchKey}>
                        <button type="button" onClick={() => (setF((p) => ({ ...p, matchKey: m.matchKey })), setMerchantSearch(''))}>
                          <span>{m.name}</span>
                          <span className="cm-optional">
                            {m.count}× · last {formatMoney(m.lastAmount)} on {m.lastDate}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <span className="cm-optional">Linked, Squirl checks each due date against your imported statements.</span>
              </>
            )}
          </div>
          <div className="cm-grid">
            <label className="field">
              Remind me (days before)
              <input className="input" type="number" min="0" max="30" value={f.remindDays} onChange={set('remindDays')} />
            </label>
            <label className="field">
              Paid from account
              <input className="input" value={f.account} onChange={set('account')} placeholder="sbi, kotak…" maxLength={30} />
            </label>
            <div className="field">
              Category
              <CategorySelect value={f.category} onChange={set('category')} placeholder="Optional" clearLabel="No category" aria-label="Category" />
            </div>
          </div>
          <label className="field">
            Notes
            <input className="input" value={f.notes} onChange={set('notes')} maxLength={500} />
          </label>
        </fieldset>

        {save.isError && <p className="import-error">{describeError(save.error)}</p>}
      </form>
    </Dialog>
  );
}
