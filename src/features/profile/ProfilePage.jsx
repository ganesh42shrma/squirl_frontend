import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { formatDate } from '../../lib/format';
import { PasswordField } from '../auth/AuthLayout';
import { Avatar } from './Avatar';
import { DEFAULT_MAX_UPLOAD_BYTES, ImageError, compressImage, validateImageFile } from '../media/imageTools';
import { useMediaStatus, useRemoveAvatar, useUploadAvatar } from '../media/useMedia';
import { useChangePassword, useDeleteAccount, useLogout, useProfile, useUpdateProfile } from '../auth/useAuth';
import '../../components/layout/layout.css';
import '../auth/auth.css';
import './profile.css';

const DETAIL_FIELDS = ['name', 'email', 'phone', 'birthday', 'city', 'currency', 'bio'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];
const formOf = (profile) => Object.fromEntries(DETAIL_FIELDS.map((k) => [k, profile[k] ?? '']));
const today = () => new Date().toISOString().slice(0, 10);

function Details({ profile }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [form, setForm] = useState(() => formOf(profile));
  useEffect(() => setForm(formOf(profile)), [profile]);
  const clean = (key, value) => (key === 'email' ? value.trim().toLowerCase() : value.trim());
  const dirty = DETAIL_FIELDS.filter((key) => clean(key, form[key]) !== (profile[key] ?? ''));
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const body = Object.fromEntries(dirty.map((key) => [key, key === 'name' || key === 'email' ? form[key] : clean(key, form[key])]));
    update.mutate(body, { onSuccess: () => toast('Profile saved') });
  };

  return (
    <section className="profile-section" aria-labelledby="details-title">
      <div className="profile-section__head">
        <h2 id="details-title">Your details</h2>
        <p>Only you can see these.</p>
      </div>
      <form className="profile-form" onSubmit={submit}>
        <label className="field">
          Name
          <input className="input" value={form.name} onChange={set('name')} required maxLength={80} autoComplete="name" />
        </label>
        <label className="field">
          Email
          <input className="input" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <div className="profile-form__row">
          <label className="field">
            Mobile number
            <input className="input" type="tel" value={form.phone} onChange={set('phone')} maxLength={32} autoComplete="tel" placeholder="+91 98765 43210" />
          </label>
          <label className="field">
            Date of birth
            <input className="input" type="date" value={form.birthday} onChange={set('birthday')} min="1900-01-01" max={today()} autoComplete="bday" />
          </label>
        </div>
        <div className="profile-form__row">
          <label className="field">
            City
            <input className="input" value={form.city} onChange={set('city')} maxLength={80} autoComplete="address-level2" />
          </label>
          <label className="field">
            Preferred currency
            <select className="input" value={form.currency} onChange={set('currency')}>
              <option value="">Not set</option>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          About you
          <textarea className="input" value={form.bio} onChange={set('bio')} maxLength={200} rows={3} />
          <span className="auth__hint">{form.bio.length}/200</span>
        </label>
        {update.isError && <p className="import-error">{describeError(update.error)}</p>}
        <div className="profile-form__actions">
          <Button type="submit" disabled={!dirty.length || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {dirty.length > 0 && (
            <Button variant="quiet" onClick={() => setForm(formOf(profile))}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

// Picture: pick a photo, it is cropped to a square and shrunk in the browser (which also strips location data),
// then replaces the old one. Hidden when the server has no photo storage set up.
function AvatarEditor({ profile }) {
  const status = useMediaStatus();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const toast = useToast();
  const input = useRef(null);
  const [error, setError] = useState('');
  const busy = upload.isPending || remove.isPending;
  const maxBytes = status.data?.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // picking the same file again should still fire
    if (!file) return;
    setError('');
    const problem = validateImageFile(file);
    if (problem) return setError(problem);
    try {
      const blob = await compressImage(file, { maxSide: 512, square: true });
      if (blob.size > maxBytes) return setError('That photo is still too big. Try a smaller one.');
      await upload.mutateAsync(blob);
      toast('Profile picture updated');
    } catch (err) {
      setError(err instanceof ImageError ? err.message : describeError(err));
    }
  };

  const clear = () => {
    setError('');
    remove.mutate(undefined, { onSuccess: () => toast('Profile picture removed'), onError: (err) => setError(describeError(err)) });
  };

  const enabled = status.data?.configured;
  return (
    <div className="avatar-edit">
      <Avatar name={profile.name} mediaId={profile.avatarMediaId} xl />
      {enabled && (
        <div>
          <div className="avatar-edit__actions">
            <input ref={input} className="avatar-edit__file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={choose} tabIndex={-1} aria-label="Choose a profile picture" />
            <Button variant="quiet" disabled={busy} onClick={() => input.current?.click()}>
              {upload.isPending ? 'Uploading…' : profile.avatarMediaId ? 'Change picture' : 'Upload picture'}
            </Button>
            {profile.avatarMediaId && <Button variant="quiet" disabled={busy} onClick={clear}>Remove</Button>}
          </div>
          {error && <p className="import-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
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
          toast('Password changed');
        },
      },
    );
  };

  return (
    <section className="profile-section" aria-labelledby="password-title">
      <div className="profile-section__head">
        <h2 id="password-title">Password</h2>
        <p>Signs you out on other devices.</p>
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
        <p>Deletes your account and all its data. This can’t be undone.</p>
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

// Settings → Profile: who you are, how you sign in, and leaving. Everything else has its own settings page.
export function ProfilePage() {
  const { data: profile, isLoading, isError, error } = useProfile();
  const logout = useLogout();
  const navigate = useNavigate();

  if (isLoading) return <div className="insight-skeleton" />;
  if (isError) return <p className="import-error">{error.message}</p>;

  return (
    <div className="profile">
      <header className="profile-head">
        <AvatarEditor profile={profile} />
        <div>
          <h2>{profile.name}</h2>
          <p>
            {profile.email} · member since {formatDate(profile.createdAt)}
          </p>
          {(profile.city || profile.bio) && (
            <p>{[profile.city, profile.bio].filter(Boolean).join(' · ')}</p>
          )}
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
      <ChangePassword />
      <DangerZone profile={profile} />
    </div>
  );
}
