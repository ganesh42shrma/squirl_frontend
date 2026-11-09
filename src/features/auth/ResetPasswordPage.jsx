import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { AuthLayout, PasswordField } from './AuthLayout';
import { useResetPassword } from './useAuth';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const reset = useResetPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && confirm !== password;

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthLayout title="This link doesn’t work" intro="It may be incomplete or already used.">
        <Link to="/forgot-password" className="btn btn--primary">
          Ask for a new link
        </Link>
      </AuthLayout>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    reset.mutate(
      { token, password },
      {
        onSuccess: () => {
          toast('Password updated. You’re signed in, and every other session was signed out.');
          navigate('/app', { replace: true });
        },
      },
    );
  };

  return (
    <AuthLayout title="Choose a new password" intro="Every device signed in to this account will be signed out.">
      <form className="auth__form" onSubmit={submit}>
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" autoFocus hint="At least 10 characters." />
        <PasswordField label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" hint={mismatch ? 'These don’t match yet.' : null} />
        {reset.isError && (
          <p className="import-error" role="alert">
            {describeError(reset.error)}
            {reset.error.code === 'INVALID_RESET_TOKEN' && (
              <>
                {' '}
                <Link to="/forgot-password">Get a new link</Link>
              </>
            )}
          </p>
        )}
        <Button type="submit" disabled={reset.isPending || password.length < 10 || password !== confirm}>
          {reset.isPending ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
