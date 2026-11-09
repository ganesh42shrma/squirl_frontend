import { Navigate, useLocation } from 'react-router-dom';
import { useMe, useSignedOutListener } from './useAuth';

// Guards the app: signed-out visitors go to the sign-in page and come back where they were headed.
export function RequireAuth({ children }) {
  useSignedOutListener();
  const { data: me, isLoading, isError, error } = useMe();
  const location = useLocation();

  if (isLoading) return null;
  if (isError) return <p className="auth-fatal">{error.message}</p>;
  if (!me) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}

// For the sign-in pages: someone already signed in goes straight to the app.
export function RedirectIfSignedIn({ children }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return null;
  if (me) return <Navigate to="/app" replace />;
  return children;
}
