import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { formatDate } from '../../lib/format';
import { PasswordField } from '../auth/AuthLayout';
import { useChangePassword, useDeleteAccount, useLogout, useProfile, useUpdateProfile } from '../auth/useAuth';
import '../../components/layout/layout.css';
import '../auth/auth.css';
import './profile.css';
import { FamilyContacts } from './FamilyContacts';
import { ResetFinancialData } from './ResetFinancialData';
import { AiSettings } from './AiSettings';
import { DataSources } from './DataSources';
import '../commitments/commitments.css';

function Details({ profile }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [form, setForm] = useState({ name: profile.name, email: profile.email });
  useEffect(() => setForm({ name: profile.name, email: profile.email }), [profile.name, profile.email]);
  const changed = form.name.trim() !== profile.name || form.email.trim().toLowerCase() !== profile.email;

  const submit = (e) => {
    e.preventDefault();
    const body = {};
    if (form.name.trim() !== profile.name) body.name = form.name;
    if (form.email.trim().toLowerCase() !== profile.email) body.email = form.email;
    update.mutate(body, { onSuccess: () => toast('Profile saved') });
  };

  return (
    <section className="profile-section" aria-labelledby="details-title">
      <div className="profile-section__head">
        <h2 id="details-title">Your details</h2>
        <p>Your name appears on the dashboard. Your email is how you sign in.</p>
      </div>
      <form className="profile-form" onSubmit={submit}>
        <label className="field">
          Name
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={80} autoComplete="name" />
        </label>
        <label className="field">
          Email
          <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required autoComplete="email" />
        </label>
        {update.isError && <p className="import-error">{describeError(update.error)}</p>}
        <div className="profile-form__actions">
          <Button type="submit" disabled={!changed || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {changed && (
            <Button variant="quiet" onClick={() => setForm({ name: profile.name, email: profile.email })}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

function ChangePassword() {
  const change = useChangePassword();
  const toast = useToast();
  const empty = { current: '', next: '', confirm: '' };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const mismatch = form.confirm.length > 0 && form.confirm !== form.next;

  const openDialog = () => {
    change.reset();
    setForm(empty);
    setOpen(true);
  };
  const close = () => {
    if (change.isPending) return;
    setOpen(false);
    setForm(empty);
  };

  const submit = (e) => {
    e.preventDefault();
    change.mutate(
      { currentPassword: form.current, newPassword: form.next },
      {
        onSuccess: () => {
          setOpen(false);
          setForm(empty);
          toast('Password changed. Other devices have been signed out.');
        },
      },
    );
  };

  return (
    <section className="profile-section" aria-labelledby="password-title">
      <div className="profile-section__head">
        <h2 id="password-title">Password</h2>
        <p>Changing it signs out every other device. This one stays signed in.</p>
      </div>
      <div>
        <Button variant="quiet" onClick={openDialog}>Change password</Button>
      </div>
      {open && (
        <Dialog
          title="Change password"
          onClose={close}
          footer={
            <>
              <Button variant="quiet" disabled={change.isPending} onClick={close}>Cancel</Button>
              <Button
                type="submit"
                form="change-password-form"
                disabled={change.isPending || !form.current || form.next.length < 10 || form.next !== form.confirm}
              >
                {change.isPending ? 'Changing…' : 'Change password'}
              </Button>
            </>
          }
        >
          <form id="change-password-form" className="profile-form" onSubmit={submit}>
            <PasswordField label="Current password" value={form.current} onChange={set('current')} autoComplete="current-password" autoFocus />
            <PasswordField label="New password" value={form.next} onChange={set('next')} autoComplete="new-password" hint="At least 10 characters." />
            <PasswordField label="Type it again" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" hint={mismatch ? 'These don’t match yet.' : null} />
            {change.isError && <p className="import-error">{describeError(change.error)}</p>}
          </form>
        </Dialog>
      )}
    </section>
  );
}

function DangerZone({ profile }) {
  const remove = useDeleteAccount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');

  return (
    <section className="profile-section profile-section--danger" aria-labelledby="delete-title">
      <div className="profile-section__head">
        <h2 id="delete-title">Delete account</h2>
        <p>
          Permanently deletes this account and everything in it: {profile.stats.transactions} transactions, {profile.stats.imports} imports, your
          categories, tags and learned merchants. Other accounts on this computer aren’t affected. This can’t be undone.
        </p>
      </div>
      {!open ? (
        <div>
          <Button variant="danger" onClick={() => setOpen(true)}>
            Delete my account…
          </Button>
        </div>
      ) : (
        <form
          className="profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            remove.mutate({ password }, { onSuccess: () => navigate('/', { replace: true }) });
          }}
        >
          <PasswordField label="Your password" value={password} onChange={setPassword} autoComplete="current-password" autoFocus />
          <label className="field">
            Type DELETE to confirm
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          {remove.isError && <p className="import-error">{describeError(remove.error)}</p>}
          <div className="profile-form__actions">
            <Button type="submit" variant="danger" disabled={remove.isPending || !password || typed !== 'DELETE'}>
              {remove.isPending ? 'Deleting…' : 'Delete everything'}
            </Button>
            <Button variant="quiet" onClick={() => (setOpen(false), setPassword(''), setTyped(''))}>
              Keep my account
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

export function ProfilePage() {
  const { data: profile, isLoading, isError, error } = useProfile();
  const logout = useLogout();
  const navigate = useNavigate();

  if (isLoading) return <div className="insight-skeleton" />;
  if (isError) return <p className="import-error">{error.message}</p>;

  const initials = profile.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="profile">
      <header className="profile-head">
        <span className="avatar avatar--large" aria-hidden="true">
          {initials}
        </span>
        <div>
          <h1>{profile.name}</h1>
          <p>
            {profile.email} · member since {formatDate(profile.createdAt)}
          </p>
        </div>
        <Button variant="quiet" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })} disabled={logout.isPending}>
          Sign out
        </Button>
      </header>

      <dl className="profile-stats">
        <div>
          <dt>Transactions</dt>
          <dd>{profile.stats.transactions.toLocaleString('en-IN')}</dd>
        </div>
        <div>
          <dt>Statements imported</dt>
          <dd>{profile.stats.imports}</dd>
        </div>
        <div>
          <dt>Categories</dt>
          <dd>{profile.stats.categories}</dd>
        </div>
      </dl>

      <Details profile={profile} />
      <section className="profile-section" aria-labelledby="dashboard-title">
        <div className="profile-section__head"><h2 id="dashboard-title">Dashboard</h2><p>Choose widgets and data.</p></div>
        <div><Link className="btn btn--quiet" to="/app/profile/dashboard">Configure dashboard</Link></div>
      </section>
      <FamilyContacts profile={profile} />
      <ChangePassword />
      <AiSettings />
      <DataSources />
      <ResetFinancialData />
      <DangerZone profile={profile} />
    </div>
  );
}
