import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { StatementSketch } from '../../components/illustrations/Sketches';
import { describeError } from '../../api/client';
import { formatDay } from '../../lib/format';
import { importSummary, coverageHint, statementPeriod } from './importSummary';
import { useCreateImport, useDeleteImport, useImports } from './useImports';
import '../../components/layout/layout.css';
import './imports.css';

const BANKS = [
  { value: 'auto', label: 'Detect' },
  { value: 'sbi', label: 'SBI' },
  { value: 'kotak', label: 'Kotak' },
];

// Turns API errors into a next step the person can take.
function importErrorMessage(error) {
  if (error.code === 'PARSER_UNAVAILABLE') {
    return 'The statement reader isn’t running. Start the parser service on port 8000, then try again.';
  }
  if (error.code === 'PARSER_ERROR') {
    return 'The statement reader hit an unexpected error. Nothing was imported. Try again, or check the parser logs.';
  }
  if (error.code === 'STATEMENT_PARSE_FAILED') {
    switch (error.details?.parserCode) {
      case 'PASSWORD_REQUIRED':
        return 'This PDF is password protected. Enter its password and try again.';
      case 'WRONG_PASSWORD':
        return 'That password didn’t open the PDF. Check it and try again.';
      case 'BANK_MISMATCH':
        return `${error.message}. Pick the matching bank, or Detect, and try again.`;
      case 'BANK_UNKNOWN':
        return 'Couldn’t tell which bank this statement is from. Pick SBI or Kotak and try again.';
      case 'NO_TEXT_LAYER':
        return `${error.message}.`;
      case 'UNSUPPORTED_LAYOUT':
      case 'RECONCILIATION_FAILED':
        return `${error.message}. Nothing was imported, so your ledger is unchanged.`;
      default:
        return `${error.message}. Check the password, or that the PDF is an SBI or Kotak statement.`;
    }
  }
  return describeError(error);
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

const period = statementPeriod;

const BANK_NAMES = { sbi: 'SBI', kotak: 'Kotak' };
const bankName = (bank) => BANK_NAMES[bank] || 'bank';

function ImportForm() {
  const [file, setFile] = useState(null);
  const [bank, setBank] = useState('auto');
  const [password, setPassword] = useState('');
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const createImport = useCreateImport();

  const pick = (candidate) => {
    setError(null);
    setResult(null);
    if (!candidate) return;
    if (candidate.type !== 'application/pdf') {
      setError('That file isn’t a PDF. Download the statement as a PDF from netbanking.');
      return;
    }
    setFile(candidate);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return inputRef.current?.click();
    setError(null);
    createImport.mutate(
      { file, bank, password },
      {
        onSuccess: (batch) => {
          setResult(batch);
          setFile(null);
          setPassword('');
          // Clear the native input too, or picking the same file again wouldn't fire a change.
          if (inputRef.current) inputRef.current.value = '';
        },
        onError: (err) => setError(importErrorMessage(err)),
      },
    );
  };

  return (
    <form className="import-form" onSubmit={handleSubmit}>
      <label
        className={`dropzone${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="visually-hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <StatementSketch size={110} />
        {file ? (
          <span className="dropzone__title">{file.name}</span>
        ) : (
          <span className="dropzone__title">Drop a statement PDF here, or choose a file</span>
        )}
        <span className="dropzone__hint">
          {file ? `${(file.size / 1024).toFixed(0)} KB. Choose a different file` : 'SBI and Kotak e-statements, up to 10 MB'}
        </span>
      </label>

      <fieldset className="bank-choice">
        <legend>Bank</legend>
        {BANKS.map((b) => (
          <label key={b.value} className={`bank-choice__option${bank === b.value ? ' is-active' : ''}`}>
            <input type="radio" name="bank" value={b.value} checked={bank === b.value} onChange={() => setBank(b.value)} />
            {b.label}
          </label>
        ))}
      </fieldset>

      <label className="field">
        PDF password
        <input
          className="input"
          type="password"
          autoComplete="off"
          placeholder="Leave empty if the PDF isn’t locked"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <Button type="submit" variant="primary" disabled={createImport.isPending} className="import-form__submit">
        {createImport.isPending ? 'Reading the statement…' : 'Import statement'}
      </Button>

      <AnimatePresence>
        {error && (
          <motion.p
            className="import-error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
        {result && (
          <motion.div
            className="import-result"
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="import-result__title">
              {bankName(result.bank)} statement, {period(result)}
            </p>
            <p>
              {importSummary(result)}
            </p>
            {coverageHint(result) && <p className="import-result__coverage">{coverageHint(result)}</p>}
            {result.stats.inserted > 0 && (
              <Link to={`/app/ledger?importId=${result._id}`} className="btn btn--accent btn--small">
                View new transactions
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function ImportHistoryItem({ batch }) {
  const [confirming, setConfirming] = useState(false);
  const deleteImport = useDeleteImport();
  const toast = useToast();

  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(id);
  }, [confirming]);

  const undo = () => {
    if (!confirming) return setConfirming(true);
    deleteImport.mutate(batch._id, {
      onSuccess: (r) => toast(`Import undone. Removed ${plural(r.transactionsDeleted, 'row')}.`),
      onError: (err) => toast(describeError(err), { tone: 'error' }),
    });
  };

  return (
    <li className="import-item">
      <div className="import-item__main">
        <p className="import-item__name">
          <span className={`import-status import-status--${batch.status}`}>
            {batch.status === 'completed' ? 'Imported' : batch.status === 'failed' ? 'Failed' : 'Reading'}
          </span>
          {batch.bank ? bankName(batch.bank) : 'Bank'} statement
        </p>
        <p className="import-item__meta">
          {batch.status === 'failed'
            ? `${batch.fileName}: ${batch.error}`
            : [
                batch.fileName,
                period(batch),
                `${plural(batch.stats.inserted, 'new row')}`,
                batch.newFrom ? `new from ${formatDay(batch.newFrom)}${batch.newTo !== batch.newFrom ? ` to ${formatDay(batch.newTo)}` : ''}` : null,
                batch.stats.duplicates ? `${batch.stats.duplicates} already logged` : null,
              ]
                .filter(Boolean)
                .join(', ')}
        </p>
      </div>
      <div className="import-item__actions">
        {batch.status === 'completed' && batch.stats.inserted > 0 && (
          <Link to={`/app/ledger?importId=${batch._id}`} className="btn btn--quiet btn--small">
            Review rows
          </Link>
        )}
        <Button variant="danger" size="small" onClick={undo} disabled={deleteImport.isPending}>
          {confirming ? 'Confirm undo' : batch.status === 'completed' ? 'Undo import' : 'Remove'}
        </Button>
      </div>
    </li>
  );
}

export function ImportsPage() {
  const { data: imports = [], isLoading, isError, error } = useImports();

  return (
    <div className="imports">
      <header className="page-head">
        <h1>Bring in a statement</h1>
        <p>
          Upload a PDF statement and its rows land in your ledger. Squirl works out the bank and skips every row it
          already has, so a three-month statement today and another tomorrow only add what’s new.
        </p>
      </header>

      <div className="imports__layout">
        <ImportForm />

        <section className="import-history" aria-labelledby="history-title">
          <h2 id="history-title">Past imports</h2>
          {isLoading && <p className="import-history__empty">Loading…</p>}
          {isError && <p className="import-error">{error.message}</p>}
          {!isLoading && !isError && imports.length === 0 && (
            <p className="import-history__empty">Imported statements show up here, and any of them can be undone.</p>
          )}
          <ul>
            {imports.map((batch) => (
              <ImportHistoryItem key={batch._id} batch={batch} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
