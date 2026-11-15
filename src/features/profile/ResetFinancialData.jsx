import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useResetFinancialData } from '../auth/useAuth';

export function ResetFinancialData() {
  const [open, setOpen] = useState(false);
  const reset = useResetFinancialData();
  const toast = useToast();
  return (
    <section className="profile-section" aria-labelledby="reset-title">
      <div className="profile-section__head">
        <h2 id="reset-title">Reset financial data</h2>
        <p>Clears your finances. Profile and people stay.</p>
      </div>
      <div>
        <Button variant="quiet" onClick={() => { reset.reset(); setOpen(true); }}>Reset financial data</Button>
      </div>
      {open && <Dialog title="Reset financial data?" onClose={() => !reset.isPending && setOpen(false)} footer={
        <>
          <Button variant="quiet" disabled={reset.isPending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" disabled={reset.isPending} onClick={() => reset.mutate(undefined, { onSuccess: () => {
            setOpen(false);
            toast('Financial data reset');
          } })}>{reset.isPending ? 'Resetting…' : 'Reset financial data'}</Button>
        </>
      }>
        <div className="profile-form">
          <p>Clears transactions, imports, EMIs and bills. Categories, tags and rules go back to defaults. Your profile and people stay.</p>
          {reset.isError && <p className="import-error">{describeError(reset.error)}</p>}
        </div>
      </Dialog>}
    </section>
  );
}
