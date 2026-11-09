import { Link } from 'react-router-dom';
import { useTransactions, useUnsortedCount } from '../ledger/useTransactions';
import { useBalances } from '../insights/useInsights';
import { useMe, useProfile } from '../auth/useAuth';
import { todayISO } from '../../lib/format';
import { DashboardLayout } from './DashboardLayout';
import { Welcome, greeting } from './DashboardParts';
import { getConfig } from './dashboardConfig';
import './dashboard.css';

export function DashboardPage() {
  const { data: me } = useMe();
  const profile = useProfile();
  const balances = useBalances();
  const recent = useTransactions({ limit: 6, sort: '-date' });
  const unsorted = useUnsortedCount();
  const rows = recent.data?.data || [];
  const month = rows[0]?.date.slice(0, 7) || todayISO().slice(0, 7);
  if (balances.isLoading || recent.isLoading || profile.isLoading) return <div className="insight-skeleton" />;
  if (balances.isError || recent.isError || profile.isError) return <p className="import-error">{(balances.error || recent.error || profile.error).message}</p>;
  return <div className="dashboard">
    <header className="dashboard-title-row">
      <div className="dash-head"><h1>{greeting()}{me?.name ? `, ${me.name.split(/\s+/)[0]}` : ''}</h1><p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <Link className="btn btn--quiet btn--small" to="/app/profile/dashboard">Configure dashboard</Link>
    </header>
    {!rows.length && <Welcome />}
    <DashboardLayout config={getConfig(profile.data?.dashboardConfig)} data={{ accounts: balances.data?.accounts || [], total: balances.data?.total, combined: balances.data?.combined || [], month, rows, unsorted: unsorted.data || 0 }} />
  </div>;
}
