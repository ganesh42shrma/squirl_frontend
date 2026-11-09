import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { AuthLayout, PasswordField } from './AuthLayout';
import { useRegister } from './useAuth';

export function SignupPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const tooShort = form.password.length > 0 && form.password.length < 10;

  const submit = (e) => {
    e.preventDefault();
    register.mutate(form, { onSuccess: () => navigate('/app', { replace: true }) });
  };

  return (
    <AuthLayout
      title="Create your ledger"
      intro="Your data stays on this computer’s encrypted drive, separate from every other account."
      footer={
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="auth__form" onSubmit={submit}>
        <label className="field">
          Your name
          <input className="input" value={form.name} onChange={(e) => set('name')(e.target.value)} autoComplete="name" autoFocus required maxLength={80} />
        </label>
        <label className="field">
          Email
          <input className="input" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} autoComplete="email" required />
        </label>
        <PasswordField
          label="Password"
          value={form.password}
          onChange={set('password')}
          autoComplete="new-password"
          hint={tooShort ? `${10 - form.password.length} more character${10 - form.password.length === 1 ? '' : 's'} to go` : 'At least 10 characters. A short sentence works well.'}
        />
        {register.isError && (
          <p className="import-error" role="alert">
            {describeError(register.error)}
            {register.error.code === 'EMAIL_TAKEN' && (
              <>
                {' '}
                <Link to="/login">Sign in instead</Link>
              </>
            )}
          </p>
        )}
        <Button type="submit" disabled={register.isPending || form.password.length < 10}>
          {register.isPending ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
