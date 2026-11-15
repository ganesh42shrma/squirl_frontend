import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RedirectIfSignedIn, RequireAuth } from './features/auth/RequireAuth';
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { LEGACY_REDIRECTS, MODULES } from './app/modules';
import { LegacyRedirect } from './app/LegacyRedirect';

// The landing page loads its own design kit (public/kit), so signed-in routes never download it.
const LandingPage = lazy(() => import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
// The dashboard pulls in the charting library, so it loads only when opened.
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));

const withSuspense = (element) => <Suspense fallback={null}>{element}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={withSuspense(<LandingPage />)} />
      <Route path="/login" element={<RedirectIfSignedIn><LoginPage /></RedirectIfSignedIn>} />
      <Route path="/signup" element={<RedirectIfSignedIn><SignupPage /></RedirectIfSignedIn>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={withSuspense(<DashboardPage />)} />
        <Route path="profile" element={<ProfilePage />} />
        {/* Every module's pages come from the registry in app/modules.js. */}
        {MODULES.map((module) => (
          <Route key={module.id} path={module.id}>
            <Route index element={<Navigate to={module.tabs[0].path} replace />} />
            {(module.redirects || []).map(({ from, to }) => <Route key={from} path={from} element={<LegacyRedirect to={to} />} />)}
            {module.tabs.flatMap((tab) => [tab, ...(tab.also || [])]).map(({ path, page: Page }) => (
              <Route key={path} path={path} element={withSuspense(<Page />)} />
            ))}
          </Route>
        ))}
        {/* The old top-level addresses (/app/ledger, /app/goals/:id ...) redirect to their module. */}
        {LEGACY_REDIRECTS.map(({ from, to }) => (
          <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
