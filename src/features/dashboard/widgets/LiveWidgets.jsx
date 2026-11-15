// Compact versions of the Live cards. They use the same hooks as the Live page, so the data is
// shared and cached; settings (city, coins, currencies, the news key) are still changed in Profile.
import { Link } from 'react-router-dom';
import { ArrowRight, CloudSun, CurrencyCircleDollar, Newspaper } from '@phosphor-icons/react';
import { scoopPath } from '../../../app/paths';
import { useCoins, useNews, useRates, useWeather, weatherText } from '../../live/useLive';
import '../../live/live.css';
import { QueryState } from './FinanceWidgets';

const inr = (n, digits = 2) => (n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: digits }).format(n));
const pct = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`);

function Head({ title, icon: Icon, to, id }) {
  return (
    <div className="dash-section__head">
      <h2 id={id}><Icon size={18} weight="duotone" aria-hidden="true" /> {title}</h2>
      <Link to={to} className="dash-link">Daily Scoop <ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
  );
}
const LIVE = scoopPath('live');

// ── Weather ─────────────────────────────────────────────────────────────────────────
const MOCK_WEATHER = { location: { name: 'Bengaluru' }, data: { current: { temperature: 27, code: 2, feelsLike: 29 }, daily: [{ date: '2026-11-14', max: 29, min: 20 }, { date: '2026-11-15', max: 28, min: 20 }, { date: '2026-11-16', max: 30, min: 21 }] } };
function WeatherView({ w }) {
  if (!w?.data) return <p className="live-muted">Weather isn’t set up yet. Choose a city in <Link to="/app/profile#data-sources">Profile → Data sources</Link>.</p>;
  return (
    <>
      <p className="live-big">{Math.round(w.data.current.temperature)}°C</p>
      <p className="live-muted">{weatherText(w.data.current.code)} · feels {Math.round(w.data.current.feelsLike)}° · {w.location.name}</p>
      <ol className="live-forecast">
        {w.data.daily.slice(0, 3).map((d) => (
          <li key={d.date}><span>{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span><span>{Math.round(d.max)}° / {Math.round(d.min)}°</span></li>
        ))}
      </ol>
    </>
  );
}
export function WeatherWidget() {
  const q = useWeather();
  return <section className="dash-section" aria-labelledby="w-weather"><Head id="w-weather" title="Weather" icon={CloudSun} to={LIVE} /><QueryState query={q}><WeatherView w={q.data} /></QueryState></section>;
}
export const WeatherPreview = () => <section className="dash-section"><Head id="p-weather" title="Weather" icon={CloudSun} to={LIVE} /><WeatherView w={MOCK_WEATHER} /></section>;

// ── Exchange rates ──────────────────────────────────────────────────────────────────
const MOCK_RATES = [{ code: 'USD', inr: 84.1, change30d: 0.4 }, { code: 'EUR', inr: 91.6, change30d: -0.7 }, { code: 'GBP', inr: 108.3, change30d: 0.2 }, { code: 'AED', inr: 22.9, change30d: 0.4 }];
function RatesView({ rates }) {
  if (!rates.length) return <p className="live-muted">Pick currencies on the Live page to see them here.</p>;
  return (
    <ul className="live-list">
      {rates.map((r) => <li key={r.code}><span className="live-name"><strong>{r.code}</strong></span><span className="live-num">{inr(r.inr)}</span><span className="live-num live-muted" title="Change over 30 days">{pct(r.change30d)}</span></li>)}
    </ul>
  );
}
export function RatesWidget({ settings }) {
  const q = useRates();
  return <section className="dash-section" aria-labelledby="w-rates"><Head id="w-rates" title="Exchange rates" icon={CurrencyCircleDollar} to={LIVE} /><QueryState query={q}><RatesView rates={(q.data?.data?.rates || []).slice(0, Number(settings.count))} /></QueryState></section>;
}
export const RatesPreview = ({ settings }) => <section className="dash-section"><Head id="p-rates" title="Exchange rates" icon={CurrencyCircleDollar} to={LIVE} /><RatesView rates={MOCK_RATES.slice(0, Number(settings.count))} /></section>;

// ── Crypto ──────────────────────────────────────────────────────────────────────────
const MOCK_COINS = [{ id: 'btc', symbol: 'BTC', price: 5800000, change24h: 1.2 }, { id: 'eth', symbol: 'ETH', price: 290000, change24h: -0.8 }, { id: 'sol', symbol: 'SOL', price: 12400, change24h: 2.4 }];
function CoinsView({ coins }) {
  if (!coins.length) return <p className="live-muted">Add coins on the Live page.</p>;
  return (
    <ul className="live-list">
      {coins.map((c) => (
        <li key={c.id}><span className="live-name"><strong>{c.symbol}</strong></span><span className="live-num">{inr(c.price, c.price < 100 ? 4 : 0)}</span><span className={`live-num live-change ${c.change24h > 0 ? 'is-up' : c.change24h < 0 ? 'is-down' : ''}`} title="Change over 24 hours">{pct(c.change24h)}</span></li>
      ))}
    </ul>
  );
}
export function CryptoWidget({ settings }) {
  const q = useCoins();
  return <section className="dash-section" aria-labelledby="w-crypto"><Head id="w-crypto" title="Crypto" icon={CurrencyCircleDollar} to={LIVE} /><QueryState query={q}><CoinsView coins={(q.data?.data || []).slice(0, Number(settings.count))} /></QueryState></section>;
}
export const CryptoPreview = ({ settings }) => <section className="dash-section"><Head id="p-crypto" title="Crypto" icon={CurrencyCircleDollar} to={LIVE} /><CoinsView coins={MOCK_COINS.slice(0, Number(settings.count))} /></section>;

// ── News ────────────────────────────────────────────────────────────────────────────
const MOCK_NEWS = [{ id: '1', title: 'RBI keeps repo rate unchanged', section: 'Business', url: '#' }, { id: '2', title: 'Fuel prices steady ahead of festive season', section: 'Economy', url: '#' }, { id: '3', title: 'UPI volumes hit a new monthly record', section: 'Technology', url: '#' }];
function NewsView({ items, needsSetup }) {
  if (needsSetup) return <p className="live-muted">Headlines come from The Guardian’s free API. Add your key in <Link to="/app/profile#data-sources">Profile → Data sources</Link>.</p>;
  if (!items.length) return <p className="live-muted">No articles for this topic.</p>;
  return (
    <ul className="live-news">
      {items.map((a) => <li key={a.id}><a href={a.url} target="_blank" rel="noreferrer noopener">{a.title}</a><span className="live-muted">{a.section}</span></li>)}
    </ul>
  );
}
export function NewsWidget({ settings }) {
  const q = useNews();
  return <section className="dash-section" aria-labelledby="w-news"><Head id="w-news" title="News" icon={Newspaper} to={LIVE} /><QueryState query={q}><NewsView needsSetup={q.data?.needsSetup} items={(q.data?.data || []).slice(0, Number(settings.count))} /></QueryState></section>;
}
export const NewsPreview = ({ settings }) => <section className="dash-section"><Head id="p-news" title="News" icon={Newspaper} to={LIVE} /><NewsView items={MOCK_NEWS.slice(0, Number(settings.count))} /></section>;
