import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './features/landing/LandingPage';
import { LedgerPage } from './features/ledger/LedgerPage';
import { ImportsPage } from './features/imports/ImportsPage';
import { SortOutPage } from './features/sortout/SortOutPage';

// Insights pulls in the charting library, so it loads only when opened.
const InsightsPage = lazy(() =>
  import('./features/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<LedgerPage />} />
        <Route
          path="insights"
          element={
            <Suspense fallback={null}>
              <InsightsPage />
            </Suspense>
          }
        />
        <Route path="imports" element={<ImportsPage />} />
        <Route path="sort-out" element={<SortOutPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
