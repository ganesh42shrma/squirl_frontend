import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { AuthLayout, PasswordField, safeNext } from './AuthLayout';
import { useLogin } from './useAuth';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate(safeNext(params), { replace: true }) });
  };

  return (
    <AuthLayout
      title="Welcome back"
      intro="Sign in to your ledger."
      footer={
        <p>
          New here? <Link to="/signup">Create an account</Link>
        </p>
      }
    >
      <form className="auth__form" onSubmit={submit}>
        <label className="field">
          Email
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
        </label>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <Link to="/forgot-password" className="auth__aside">
          Forgot your password?
        </Link>
        {login.isError && (
          <p className="import-error" role="alert">
            {describeError(login.error)}
          </p>
        )}
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
