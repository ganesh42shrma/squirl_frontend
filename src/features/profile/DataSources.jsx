import { useState } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useDebouncedValue } from '../../lib/hooks';
import { useFeedSearch, useLiveSettings, useSaveLiveSettings } from '../live/useLive';

const SOURCES = [
  { key: 'weather', name: 'Weather and air quality', by: 'Open-Meteo', url: 'https://open-meteo.com/', note: 'No key needed' },
  { key: 'rates', name: 'Exchange rates', by: 'European Central Bank via Frankfurter', url: 'https://frankfurter.dev/', note: 'No key needed' },
  { key: 'inflation', name: 'Inflation in India', by: 'MoSPI (official CPI) and World Bank', url: 'https://esankhyiki.mospi.gov.in/', note: 'No key needed' },
  { key: 'funds', name: 'Mutual fund NAVs', by: 'AMFI data via mfapi.in', url: 'https://www.mfapi.in/', note: 'No key needed' },
  { key: 'stocks', name: 'Stock prices', by: 'Marketstack', url: 'https://marketstack.com/', note: 'Needs a key' },
  { key: 'crypto', name: 'Crypto prices', by: 'CoinGecko', url: 'https://www.coingecko.com/', note: 'Key optional' },
  { key: 'news', name: 'News', by: 'The Guardian', url: 'https://open-platform.theguardian.com/access/', note: 'Needs a free key' },
  { key: 'movies', name: 'Movies, shows and anime', by: 'TMDB', url: 'https://www.themoviedb.org/settings/api', note: 'Needs a free key' },
  { key: 'cricket', name: 'Cricket scores', by: 'CricketData.org', url: 'https://cricketdata.org/', note: 'Needs a free key' },
];

const NEWS_SECTIONS = { business: 'Business', money: 'Money', world: 'World', technology: 'Technology', all: 'Everything' };

function CityPicker({ location }) {
  const save = useSaveLiveSettings();
  const toast = useToast();
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term, 300);
  const results = useFeedSearch('places', debounced);
  return (
    <div className="ds-config">
      <p className="ds-config__now">City: <strong>{location?.name}</strong> <span className="cm-optional">{location?.region}</span></p>
      <div className="ds-search">
        <input className="input" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Change city" aria-label="Search a city" />
        {term.trim().length >= 2 && results.data?.length > 0 && (
          <ul className="ds-search__results">
            {results.data.map((p) => (
              <li key={`${p.latitude},${p.longitude}`}>
                <button
                  type="button"
                  onClick={() => save.mutate({ location: { name: p.name, region: p.region, latitude: p.latitude, longitude: p.longitude } }, { onSuccess: () => (setTerm(''), toast(`Weather for ${p.name}`)) })}
                >
                  <strong>{p.name}</strong> <span className="cm-optional">{p.region}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** A write-only key: shows whether one is saved, lets you replace or remove it. */
function KeyField({ name, label, placeholder, hint, saved }) {
  const save = useSaveLiveSettings();
  const toast = useToast();
  const [key, setKey] = useState('');
  const [replacing, setReplacing] = useState(false);
  if (saved.saved && !replacing) {
    return (
      <p className="ds-config__now">
        {label} saved, ending in <code>{saved.last4}</code>
        <button type="button" className="link-button" onClick={() => setReplacing(true)}>Replace</button>
        <button type="button" className="link-button" onClick={() => save.mutate({ keys: { [name]: null } }, { onSuccess: () => toast('Key removed') })}>Remove</button>
      </p>
    );
  }
  return (
    <form
      className="ds-key"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ keys: { [name]: key.trim() } }, { onSuccess: () => (setKey(''), setReplacing(false), toast('Key saved')), onError: (err) => toast(describeError(err), { tone: 'error' }) });
      }}
    >
      <label className="field">
        {label}
        <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} />
        {hint && <span className="cm-optional">{hint}</span>}
      </label>
      <div className="profile-form__actions">
        <Button type="submit" variant="quiet" size="small" disabled={key.trim().length < 8 || save.isPending}>Save key</Button>
        {replacing && <Button variant="quiet" size="small" onClick={() => (setReplacing(false), setKey(''))}>Cancel</Button>}
      </div>
    </form>
  );
}

function NewsDefaults({ news }) {
  const save = useSaveLiveSettings();
  const toast = useToast();
  const [query, setQuery] = useState(news.query);
  return (
    <form className="ds-news" onSubmit={(e) => (e.preventDefault(), save.mutate({ news: { query: query.trim() } }, { onSuccess: () => toast('News topic saved') }))}>
      <label className="field">
        Section
        <select className="select" value={news.section} onChange={(e) => save.mutate({ news: { section: e.target.value } })}>
          {Object.entries(NEWS_SECTIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="field">
        Topic
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} onBlur={() => query.trim() !== news.query && save.mutate({ news: { query: query.trim() } })} placeholder="India economy" maxLength={80} />
      </label>
    </form>
  );
}

/** The most Marketstack requests Squirl may use in a month; past it, Live shows the last prices. */
function StockBudget({ budget }) {
  const save = useSaveLiveSettings();
  const toast = useToast();
  const [value, setValue] = useState(String(budget));
  const commit = () => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 1 || n === budget) return setValue(String(budget));
    save.mutate({ stocks: { budget: n } }, { onSuccess: () => toast('Limit saved') });
  };
  return (
    <label className="field ds-budget">
      Monthly limit
      <input className="input" type="number" min="1" step="1" value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())} />
      <span className="cm-optional">Free plan: 100.</span>
    </label>
  );
}

/** Settings → Data sources: switch each public data source on or off and set it up. */
export function DataSources() {
  const { data: settings } = useLiveSettings();
  const save = useSaveLiveSettings();
  const toast = useToast();

  if (!settings) return null;
  const toggle = (key, name) => (e) =>
    save.mutate({ enabled: { [key]: e.target.checked } }, { onSuccess: (s) => toast(`${name} ${s.enabled[key] ? 'on' : 'off'}`) });

  return (
    <section className="profile-section" id="data-sources" aria-labelledby="ds-title">
      <div className="profile-section__head">
        <h2 id="ds-title">Data sources</h2>
        <p>Choose what shows on Live.</p>
      </div>
      <ul className="ds-list">
        {SOURCES.map((s) => {
          const on = settings.enabled[s.key];
          return (
            <li key={s.key} className={on ? '' : 'is-off'}>
              <label className="ds-toggle">
                <input type="checkbox" checked={on} disabled={save.isPending} onChange={toggle(s.key, s.name)} />
                <span>
                  <strong>{s.name}</strong>
                  <span className="cm-optional">
                    <a href={s.url} target="_blank" rel="noreferrer noopener">{s.by} <ArrowSquareOut size={11} aria-hidden="true" /></a> · {s.note}
                  </span>
                </span>
              </label>
              {on && s.key === 'weather' && <CityPicker location={settings.location} />}
              {on && s.key === 'stocks' && (
                <div className="ds-config">
                  <KeyField name="marketstack" label="Marketstack key" placeholder="Your access key" saved={settings.keys.marketstack} />
                  <StockBudget budget={settings.stocks?.budget ?? 100} />
                </div>
              )}
              {on && s.key === 'crypto' && (
                <div className="ds-config">
                  <KeyField name="coingecko" label="CoinGecko key (optional)" placeholder="CG-…" saved={settings.keys.coingecko} />
                </div>
              )}
              {on && s.key === 'movies' && (
                <div className="ds-config">
                  <KeyField
                    name="tmdb"
                    label="TMDB key"
                    placeholder="Your key"
                    saved={settings.keys.tmdb}
                    hint="Get one at themoviedb.org"
                  />
                </div>
              )}
              {on && s.key === 'cricket' && (
                <div className="ds-config">
                  <KeyField name="cricket" label="CricketData key" placeholder="Your free key" saved={settings.keys.cricket} hint="Get one at cricketdata.org" />
                </div>
              )}
              {on && s.key === 'news' && (
                <div className="ds-config">
                  <KeyField
                    name="guardian"
                    label="Guardian key"
                    placeholder="Your free key"
                    saved={settings.keys.guardian}
                    hint="Get one at open-platform.theguardian.com"
                  />
                  <NewsDefaults news={settings.news} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
