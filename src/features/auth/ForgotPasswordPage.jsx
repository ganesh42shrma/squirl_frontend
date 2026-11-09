import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { AuthLayout } from './AuthLayout';
import { useForgotPassword } from './useAuth';

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');

  return (
    <AuthLayout
      title="Reset your password"
      intro="Enter your account’s email and we’ll send a link to choose a new password."
      footer={
        <p>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      }
    >
      {forgot.isSuccess ? (
        <div className="auth__done" role="status">
          <p className="auth__done-title">Check your email</p>
          <p>
            If <strong>{email}</strong> has an account, a reset link is on its way. It works once, for 30 minutes.
          </p>
          <p className="auth__hint">Running Squirl locally? Email isn’t set up yet, so the link is printed in the backend’s terminal.</p>
        </div>
      ) : (
        <form
          className="auth__form"
          onSubmit={(e) => {
            e.preventDefault();
            forgot.mutate({ email });
          }}
        >
          <label className="field">
            Email
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
          </label>
          {forgot.isError && (
            <p className="import-error" role="alert">
              {describeError(forgot.error)}
            </p>
          )}
          <Button type="submit" disabled={forgot.isPending}>
            {forgot.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
