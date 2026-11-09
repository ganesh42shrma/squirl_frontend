import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './features/landing/LandingPage';
import { LedgerPage } from './features/ledger/LedgerPage';
import { ImportsPage } from './features/imports/ImportsPage';
import { SortOutPage } from './features/sortout/SortOutPage';
import { RedirectIfSignedIn, RequireAuth } from './features/auth/RequireAuth';
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { CommitmentsPage } from './features/commitments/CommitmentsPage';

// The dashboard and highlights pull in the charting library, so they load only when opened.
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const InsightsPage = lazy(() => import('./features/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })));
const ConfigureDashboardPage = lazy(() => import('./features/dashboard/ConfigureDashboardPage').then((m) => ({ default: m.ConfigureDashboardPage })));

const withSuspense = (element) => <Suspense fallback={null}>{element}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="highlights" element={withSuspense(<InsightsPage />)} />
        <Route path="insights" element={<Navigate to="/app/highlights" replace />} />
        <Route path="imports" element={<ImportsPage />} />
        <Route path="sort-out" element={<SortOutPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/dashboard" element={withSuspense(<ConfigureDashboardPage />)} />
        <Route path="payments" element={<CommitmentsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
