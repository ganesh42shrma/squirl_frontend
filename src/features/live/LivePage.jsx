import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, CurrencyCircleDollar, Moon, Newspaper, Plus, Sun, TrendUp, Wind, X,
} from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { formatDate, formatMoney } from '../../lib/format';
import { useDebouncedValue } from '../../lib/hooks';
import { useGuestMode } from '../../lib/useGuestMode';
import {
  aqiText, useStockSearch, useStocks, useCoins, useCurrencies, useFeedSearch, useFunds, useInflation, useLiveSettings, useNews, useRates, useSaveLiveSettings, useWeather, weatherText,
} from './useLive';
import '../../components/layout/layout.css';
import { Entertainment } from './Entertainment';
import './live.css';

// Public prices aren't personal, so they stay visible in guest mode; holdings use formatMoney.
const inr = (n, digits = 2) => (n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: digits }).format(n));
const pct = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`);
const timeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`;
  return formatDate(iso);
};

/** Card frame: title, the data source (linked), when it was fetched, and a stale warning. */
function Card({ title, icon: Icon, meta, className = '', children, action }) {
  return (
    <section className={`live-card ${className}`} aria-labelledby={`live-${title}`}>
      <header className="live-card__head">
        <h2 id={`live-${title}`}>
          <Icon size={18} weight="duotone" aria-hidden="true" /> {title}
        </h2>
        {action}
      </header>
      {children}
      {meta?.source && (
        <footer className="live-card__foot">
          {meta.stale && <span className="live-stale">Couldn’t refresh; showing the last copy. </span>}
          <a href={meta.sourceUrl} target="_blank" rel="noreferrer noopener">{meta.source}</a>
          {meta.fetchedAt && <> · {timeAgo(meta.fetchedAt)}</>}
        </footer>
      )}
    </section>
  );
}

function Loading({ query, children }) {
  if (query.isLoading) return <p className="live-muted">Loading…</p>;
  if (query.isError) return <p className="import-error">{describeError(query.error)}</p>;
  return children;
}

function Search({ kind, placeholder, onPick, render }) {
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term, 300);
  const results = useFeedSearch(kind, debounced);
  return (
    <div className="live-search">
      <input className="input" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {term.trim().length >= 2 && results.data?.length > 0 && (
        <ul className="live-search__results">
          {results.data.map((r) => (
            <li key={r.code || r.id || `${r.latitude},${r.longitude}`}>
              <button type="button" onClick={() => (onPick(r), setTerm(''))}>{render(r)}</button>
            </li>
          ))}
        </ul>
      )}
      {term.trim().length >= 2 && results.isFetched && !results.data?.length && <p className="live-muted">No matches.</p>}
    </div>
  );
}

// --- Weather -------------------------------------------------------------------------------

function WeatherIcon({ code, isDay = true, size = 20 }) {
  const Icon = code === 0 || code === 1 ? (isDay ? Sun : Moon) : code === 2 ? CloudSun : code === 3 ? Cloud : code === 45 || code === 48 ? CloudFog : code >= 95 ? CloudLightning : code >= 71 && code <= 86 && code !== 80 && code !== 81 && code !== 82 ? CloudSnow : CloudRain;
  return <Icon size={size} weight="duotone" aria-hidden="true" />;
}

function WeatherCard() {
  const q = useWeather();
  const w = q.data;
  return (
    <Card title="Weather" icon={CloudSun} meta={w} action={<Link className="link-button" to="/app/profile#data-sources">Change city</Link>}>
      <Loading query={q}>
        {w?.data ? (
          <>
            <div className="live-weather__now">
              <WeatherIcon code={w.data.current.code} isDay={w.data.current.isDay} size={40} />
              <div>
                <p className="live-big">{Math.round(w.data.current.temperature)}°C</p>
                <p className="live-muted">{weatherText(w.data.current.code)} · feels {Math.round(w.data.current.feelsLike)}° · {w.location.name}</p>
              </div>
            </div>
            <p className="live-row">
              <span>Humidity {w.data.current.humidity}%</span>
              <span><Wind size={14} aria-hidden="true" /> {Math.round(w.data.current.wind)} km/h</span>
              {w.data.air && <span className={`live-aqi is-${Math.min(5, Math.floor((w.data.air.usAqi || 0) / 50))}`}>AQI {w.data.air.usAqi} · {aqiText(w.data.air.usAqi)}</span>}
            </p>
            <ol className="live-forecast">
              {w.data.daily.map((d) => (
                <li key={d.date}>
                  <span>{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <WeatherIcon code={d.code} />
                  <span>{Math.round(d.max)}° / {Math.round(d.min)}°</span>
                  {d.rainChance != null && d.rainChance >= 30 && <span className="live-muted">{d.rainChance}% rain</span>}
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </Loading>
    </Card>
  );
}

// --- Inflation -----------------------------------------------------------------------------

function InflationCard() {
  const q = useInflation();
  const cpi = q.data?.cpi;
  const history = q.data?.history?.data || [];
  const top = cpi ? [...cpi.data.divisions].sort((a, b) => b.inflation - a.inflation).slice(0, 7) : [];
  const max = Math.max(1, ...top.map((d) => Math.abs(d.inflation)), ...history.map((h) => Math.abs(h.inflation)));
  return (
    <Card title="Inflation in India" icon={TrendUp} meta={cpi || q.data?.history} className="live-card--wide">
      <Loading query={q}>
        {cpi ? (
          <>
            <p className="live-big">{cpi.data.general.toFixed(2)}%</p>
            <p className="live-muted">Retail prices (CPI), {cpi.data.month} {cpi.data.year}, compared with a year earlier. Highest categories:</p>
            <ul className="live-bars" aria-label="Inflation by category">
              {top.map((d) => (
                <li key={d.name}>
                  <span className="live-bars__label">{d.name}</span>
                  <span className="live-bars__track"><span className={d.inflation < 0 ? 'is-negative' : ''} style={{ width: `${(Math.abs(d.inflation) / max) * 100}%` }} /></span>
                  <span className="live-bars__value">{d.inflation.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="live-muted">Official monthly figures are unavailable right now{q.data?.cpiError ? ` (${q.data.cpiError})` : ''}.</p>
        )}
        {history.length > 0 && (
          <div className="live-history">
            <p className="live-muted">Yearly inflation, World Bank</p>
            <ol aria-label="Yearly inflation">
              {history.map((h) => (
                <li key={h.year} title={`${h.year}: ${h.inflation}%`}>
                  <span className="live-history__bar" style={{ height: `${(Math.max(h.inflation, 0) / max) * 64 + 2}px` }} />
                  <span className="live-history__value">{h.inflation.toFixed(1)}</span>
                  <span className="live-history__year">’{String(h.year).slice(2)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Loading>
    </Card>
  );
}

// --- Exchange rates --------------------------------------------------------------------------

function Sparkline({ values }) {
  const pts = values.filter((v) => v != null);
  if (pts.length < 2) return null;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 80).toFixed(1)},${(22 - ((v - min) / (max - min || 1)) * 20).toFixed(1)}`).join(' ');
  return (
    <svg className="live-spark" viewBox="0 0 80 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function RatesCard() {
  const q = useRates();
  const settings = useLiveSettings();
  const currencies = useCurrencies();
  const save = useSaveLiveSettings();
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('');
  const selected = settings.data?.currencies || [];
  const rates = q.data?.data?.rates || [];
  const fromRate = rates.find((r) => r.code === (from || rates[0]?.code));
  const options = Object.entries(currencies.data || {}).filter(([code]) => code !== 'INR' && !selected.includes(code));

  return (
    <Card title="Exchange rates" icon={CurrencyCircleDollar} meta={q.data}>
      <Loading query={q}>
        <ul className="live-list">
          {rates.map((r) => (
            <li key={r.code}>
              <span className="live-name"><strong>{r.code}</strong> <span className="live-muted">{q.data.names?.[r.code]}</span></span>
              <Sparkline values={r.trend} />
              <span className="live-num">{inr(r.inr)}</span>
              <span className="live-num live-muted" title="Change in ₹ per unit over 30 days">{pct(r.change30d)}</span>
              <button type="button" className="live-remove" aria-label={`Remove ${r.code}`} onClick={() => save.mutate({ currencies: selected.filter((c) => c !== r.code) })}><X size={12} /></button>
            </li>
          ))}
        </ul>
        {rates.length > 0 && (
          <div className="live-convert">
            <input className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount to convert" />
            <select className="select" value={from || rates[0]?.code} onChange={(e) => setFrom(e.target.value)} aria-label="Currency">
              {rates.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
            </select>
            <span>= <strong>{fromRate ? inr(Number(amount || 0) * fromRate.inr) : '—'}</strong></span>
          </div>
        )}
        {selected.length < 8 && options.length > 0 && (
          <select className="select live-add" value="" onChange={(e) => e.target.value && save.mutate({ currencies: [...selected, e.target.value] })} aria-label="Add a currency">
            <option value="">+ Add a currency</option>
            {options.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
          </select>
        )}
        <p className="live-muted live-note">₹ per one unit, with the change over 30 days. European Central Bank reference rates, updated each working day.</p>
      </Loading>
    </Card>
  );
}

// --- Mutual funds ----------------------------------------------------------------------------

function FundsCard() {
  const q = useFunds();
  const settings = useLiveSettings();
  const save = useSaveLiveSettings();
  const toast = useToast();
  const [pending, setPending] = useState(null); // a picked scheme waiting for its units
  const [units, setUnits] = useState('');
  const holdings = settings.data?.funds || [];
  const items = q.data?.data?.items || [];

  const add = (e) => {
    e.preventDefault();
    save.mutate(
      { funds: [...holdings.filter((h) => h.code !== pending.code), { code: pending.code, name: pending.name, units: units === '' ? null : Number(units) }] },
      { onSuccess: () => (setPending(null), setUnits(''), toast('Fund added')), onError: (err) => toast(describeError(err), { tone: 'error' }) },
    );
  };

  return (
    <Card title="Mutual funds" icon={TrendUp} meta={q.data} className="live-card--wide">
      <Loading query={q}>
        {items.length > 0 && (
          <>
            {q.data.data.total != null && (
              <p><span className="live-big">{formatMoney(q.data.data.total, { rounded: true })}</span> <span className="live-muted">across the units you entered</span></p>
            )}
            <ul className="live-list live-funds">
              {items.map((f) => (
                <li key={f.code}>
                  <span className="live-funds__name">
                    {f.name}
                    <span className="live-muted">{f.error ? f.error : `NAV ${inr(f.nav, 4)} on ${formatDate(f.date)}${f.units ? ` · ${f.units} units` : ''}`}</span>
                  </span>
                  <span className={`live-num live-change ${f.return1y > 0 ? 'is-up' : f.return1y < 0 ? 'is-down' : ''}`} title="Change in NAV over a year">{f.return1y == null ? '' : `1y ${pct(f.return1y)}`}</span>
                  <span className="live-num">{f.value != null ? formatMoney(f.value, { rounded: true }) : ''}</span>
                  <button type="button" className="live-remove" aria-label={`Remove ${f.name}`} onClick={() => save.mutate({ funds: holdings.filter((h) => h.code !== f.code) })}><X size={12} /></button>
                </li>
              ))}
            </ul>
          </>
        )}
        {pending ? (
          <form className="live-pending" onSubmit={add}>
            <p><strong>{pending.name}</strong></p>
            <label className="field">
              Units you hold (optional)
              <input className="input" type="number" min="0" step="0.001" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="From your statement" autoFocus />
            </label>
            <div className="live-row">
              <Button type="submit" size="small" disabled={save.isPending}><Plus size={14} aria-hidden="true" /> Add</Button>
              <Button variant="quiet" size="small" onClick={() => setPending(null)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Search kind="funds/search" placeholder={items.length ? 'Add another fund' : 'Search a mutual fund, e.g. Parag Parikh Flexi Cap Direct'} onPick={(f) => setPending(f)} render={(f) => f.name} />
        )}
        <p className="live-muted live-note">NAVs from AMFI, published each evening. Enter units to see what your holding is worth.</p>
      </Loading>
    </Card>
  );
}

// --- Stocks ---------------------------------------------------------------------------------

const money = (n, currency) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(n);

function StocksCard() {
  const q = useStocks();
  const settings = useLiveSettings();
  const save = useSaveLiveSettings();
  const search = useStockSearch();
  const toast = useToast();
  const [term, setTerm] = useState('');
  const [pending, setPending] = useState(null);
  const [units, setUnits] = useState('');
  const symbols = settings.data?.stocks?.symbols || [];
  const s = q.data;

  const add = (e) => {
    e.preventDefault();
    const entry = { symbol: pending.symbol, name: pending.name, exchange: pending.exchange, currency: pending.currency || null, units: units === '' ? null : Number(units) };
    save.mutate(
      { stocks: { symbols: [...symbols.filter((x) => x.symbol !== pending.symbol), entry] } },
      { onSuccess: () => (setPending(null), setUnits(''), search.reset(), setTerm(''), toast(`Added ${pending.symbol}`)), onError: (err) => toast(describeError(err), { tone: 'error' }) },
    );
  };

  return (
    <Card title="Stocks" icon={TrendUp} meta={s?.needsSetup ? null : s} className="live-card--wide">
      <Loading query={q}>
        {s?.needsSetup ? (
          <p className="live-muted">Add your Marketstack API key in <Link to="/app/profile#data-sources">Profile → Data sources</Link> for end-of-day stock prices.</p>
        ) : (
          <>
            {s?.data?.items?.length > 0 ? (
              <ul className="live-list live-stocks">
                {s.data.items.map((i) => (
                  <li key={i.symbol}>
                    <span className="live-funds__name">
                      <span><strong>{i.symbol}</strong> <span className="live-muted">{i.name}</span></span>
                      <span className="live-muted">{i.error ? i.error : `Close on ${formatDate(i.date)}${i.units ? ` · ${i.units} shares` : ''}`}</span>
                    </span>
                    <Sparkline values={i.trend || []} />
                    <span className="live-num">{money(i.close, i.currency)}</span>
                    <span className={`live-num live-change ${i.change > 0 ? 'is-up' : i.change < 0 ? 'is-down' : ''}`} title="Change from the previous close">{pct(i.change)}</span>
                    <span className="live-num">{i.value != null ? (i.currency === 'INR' ? formatMoney(i.value, { rounded: true }) : money(i.value, i.currency)) : ''}</span>
                    <button type="button" className="live-remove" aria-label={`Remove ${i.symbol}`} onClick={() => save.mutate({ stocks: { symbols: symbols.filter((x) => x.symbol !== i.symbol) } })}><X size={12} /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="live-muted">Search a company or symbol to follow it, e.g. Reliance or AAPL.</p>
            )}
            {pending ? (
              <form className="live-pending" onSubmit={add}>
                <p><strong>{pending.symbol}</strong> {pending.name} <span className="live-muted">{pending.exchange}</span></p>
                <label className="field">
                  Shares you hold (optional)
                  <input className="input" type="number" min="0" step="any" value={units} onChange={(e) => setUnits(e.target.value)} autoFocus />
                </label>
                <div className="live-row">
                  <Button type="submit" size="small" disabled={save.isPending}><Plus size={14} aria-hidden="true" /> Add</Button>
                  <Button variant="quiet" size="small" onClick={() => setPending(null)}>Cancel</Button>
                </div>
              </form>
            ) : symbols.length < 5 ? (
              <form className="live-search" onSubmit={(e) => (e.preventDefault(), term.trim().length >= 2 && search.mutate(term.trim()))}>
                <div className="live-row">
                  <input className="input" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Company or symbol" aria-label="Search stocks" />
                  <Button type="submit" size="small" variant="quiet" disabled={term.trim().length < 2 || search.isPending}>{search.isPending ? 'Searching…' : 'Search'}</Button>
                </div>
                {search.isError && <p className="import-error">{describeError(search.error)}</p>}
                {search.data && (
                  search.data.length ? (
                    <ul className="live-search__results live-search__results--static">
                      {search.data.map((r) => (
                        <li key={r.symbol}>
                          <button type="button" onClick={() => setPending(r)}><strong>{r.symbol}</strong> {r.name} <span className="live-muted">{[r.exchange, r.country].filter(Boolean).join(' · ')}</span></button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="live-muted">No matches.</p>
                )}
              </form>
            ) : null}
          </>
        )}
      </Loading>
    </Card>
  );
}

// --- Crypto ----------------------------------------------------------------------------------

function CryptoCard() {
  const q = useCoins();
  const settings = useLiveSettings();
  const save = useSaveLiveSettings();
  const ids = settings.data?.coins || [];
  return (
    <Card title="Crypto" icon={CurrencyCircleDollar} meta={q.data}>
      <Loading query={q}>
        <ul className="live-list">
          {(q.data?.data || []).map((c) => (
            <li key={c.id}>
              <span className="live-coin">{c.image && <img src={c.image} alt="" width="20" height="20" loading="lazy" />}<strong>{c.symbol}</strong> <span className="live-muted">{c.name}</span></span>
              <span className="live-num">{inr(c.price, c.price < 100 ? 4 : 0)}</span>
              <span className={`live-num live-change ${c.change24h > 0 ? 'is-up' : c.change24h < 0 ? 'is-down' : ''}`} title="Change over 24 hours">{pct(c.change24h)}</span>
              <button type="button" className="live-remove" aria-label={`Remove ${c.name}`} onClick={() => save.mutate({ coins: ids.filter((id) => id !== c.id) })}><X size={12} /></button>
            </li>
          ))}
        </ul>
        {ids.length < 12 && (
          <Search kind="crypto/search" placeholder="Add a coin" onPick={(c) => save.mutate({ coins: [...ids, c.id] })} render={(c) => <><strong>{c.symbol}</strong> {c.name}{c.rank ? <span className="live-muted"> · #{c.rank}</span> : null}</>} />
        )}
      </Loading>
    </Card>
  );
}

// --- News ------------------------------------------------------------------------------------

function NewsCard() {
  const q = useNews();
  const n = q.data;
  return (
    <Card title="News" icon={Newspaper} meta={n} className="live-card--wide" action={<Link className="link-button" to="/app/profile#data-sources">Settings</Link>}>
      <Loading query={q}>
        {n?.needsSetup ? (
          <p className="live-muted">
            Headlines come from The Guardian’s free API. Add your key in <Link to="/app/profile#data-sources">Profile → Data sources</Link>.
          </p>
        ) : (
          <>
            <p className="live-muted">{n?.news?.query ? `“${n.news.query}”` : 'Latest'}{n?.news?.section && n.news.section !== 'all' ? ` in ${n.news.section}` : ''}</p>
            <ul className="live-news">
              {(n?.data || []).map((a) => (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noreferrer noopener">{a.title}</a>
                  {a.summary && <p>{a.summary}</p>}
                  <span className="live-muted">{a.section} · {timeAgo(a.published)}</span>
                </li>
              ))}
              {n?.data?.length === 0 && <li className="live-muted">No articles for this topic.</li>}
            </ul>
          </>
        )}
      </Loading>
    </Card>
  );
}

const CARDS = [
  ['weather', WeatherCard],
  ['rates', RatesCard],
  ['inflation', InflationCard],
  ['funds', FundsCard],
  ['stocks', StocksCard],
  ['crypto', CryptoCard],
  ['news', NewsCard],
];

export function LivePage() {
  useGuestMode(); // holding values hide in guest mode
  const settings = useLiveSettings();
  const enabled = settings.data?.enabled;
  const cards = enabled ? CARDS.filter(([key]) => enabled[key]) : [];
  const entertainment = Boolean(enabled && (enabled.movies || enabled.cricket));
  return (
    <div className="live">
      <header className="page-head">
        <h1>Live</h1>
        <p>Weather, inflation, exchange rates, fund NAVs, crypto and news from free, trusted public sources.</p>
      </header>
      {settings.isLoading ? (
        <div className="insight-skeleton" />
      ) : cards.length || entertainment ? (
        <>
          {cards.length > 0 && (
            <div className="live-grid">
              {cards.map(([key, Component]) => <Component key={key} />)}
            </div>
          )}
          {entertainment && <Entertainment enabled={enabled} />}
        </>
      ) : (
        <p className="live-muted">All data sources are off. Turn some on in <Link to="/app/profile#data-sources">Profile → Data sources</Link>.</p>
      )}
    </div>
  );
}
