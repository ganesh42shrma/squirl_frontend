import { TotalBalance, AccountTiles, Attention, BalanceSection, MonthStats, MonthStatsView, WhereItWent, WhereItWentView, Recent, ComingUp, ComingUpView } from './DashboardParts';
import { ChartWidgetView, LiveChartWidget } from './ChartWidgets';
import { mockChartData } from './mockDashboard';
import { MagicBento } from '../../components/ui/MagicBento/MagicBento';

export function DashboardLayout({ config, data, preview = false }) {
  const { accounts, total, combined, month, rows, unsorted } = data;
  function render(widget) {
    switch (widget.id) {
      case 'overview': return total ? <div className="dash-top"><TotalBalance total={total} accounts={accounts} /><AccountTiles accounts={accounts} /></div> : <p className="insight-muted">Import a statement to see balances.</p>;
      case 'attention': return <Attention accounts={accounts} unsorted={unsorted} />;
      case 'balance': return <BalanceSection key={widget.period} combined={combined} since={total?.since} accounts={accounts} period={widget.period} />;
      case 'monthStats': return preview ? <MonthStatsView month={month} now={data.summary} before={data.previous} /> : <MonthStats month={month} />;
      case 'whereItWent': return preview ? <WhereItWentView month={month} data={data.categories} preview /> : <WhereItWent month={month} />;
      case 'comingUp': return preview ? <ComingUpView data={data.commitments} /> : <ComingUp />;
      case 'recent': return <Recent rows={rows} />;
      default: return preview ? <ChartWidgetView widget={widget} {...mockChartData(widget)} preview /> : <LiveChartWidget widget={widget} anchor={month} accounts={accounts} />;
    }
  }
  return <MagicBento items={config.widgets.filter((widget) => widget.enabled).map((widget) => ({
    id: widget.id, full: widget.width === 'full', content: render(widget),
  }))} />;
}
