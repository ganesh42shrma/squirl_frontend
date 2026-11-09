import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkSimple, Clock, FilmSlate, MagnifyingGlass, Star, Trophy, X } from '@phosphor-icons/react';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { formatDate } from '../../lib/format';
import { useDebouncedValue } from '../../lib/hooks';
import { useCricket, useSetWatch, useTitleSearch, useTitles, useWatchlist } from './useLive';

const TABS = [
  { key: 'movies', label: 'Movies' },
  { key: 'shows', label: 'Shows' },
  { key: 'anime', label: 'Anime' },
  { key: 'mine', label: 'My list' },
];
const MINE_FILTERS = { all: 'Everything', starred: 'Starred', must_watch: 'Must watch', watch_later: 'Watch later' };

const settingsLink = <Link to="/app/profile#data-sources">Profile → Data sources</Link>;

/** One poster with its details and the three watchlist actions. */
function TitleCard({ title }) {
  const setWatch = useSetWatch();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const change = (patch, message) =>
    setWatch.mutate({ title, change: patch }, { onSuccess: () => message && toast(message), onError: (e) => toast(describeError(e), { tone: 'error' }) });
  const toggleList = (list, label) => change({ list: title.list === list ? null : list }, title.list === list ? `Removed from ${label}` : `Added to ${label}`);

  return (
    <li className="ent-card">
      <div className="ent-card__poster">
        {title.poster ? <img src={title.poster} alt="" loading="lazy" width="171" height="256" /> : <FilmSlate size={36} weight="duotone" aria-hidden="true" />}
        {title.rating != null && <span className="ent-card__rating">★ {title.rating.toFixed(1)}</span>}
      </div>
      <div className="ent-card__body">
        <h3>{title.title}</h3>
        <p className="live-muted ent-card__meta" title={(title.genres || []).join(', ')}>
          {[title.year, title.anime ? 'Anime' : title.mediaType === 'tv' ? 'Series' : 'Movie', ...(title.genres || []).slice(0, 2)].filter(Boolean).join(' · ')}
        </p>
        {title.overview && (
          <p className={`ent-card__overview${open ? ' is-open' : ''}`}>
            {title.overview}
          </p>
        )}
        {title.overview && title.overview.length > 140 && (
          <button type="button" className="link-button ent-card__more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? 'Less' : 'More'}
          </button>
        )}
      </div>
      <div className="ent-card__actions">
          <button type="button" className={`ent-action${title.starred ? ' is-on' : ''}`} aria-pressed={title.starred} onClick={() => change({ starred: !title.starred })} title={title.starred ? 'Unstar' : 'Star'}>
            <Star size={16} weight={title.starred ? 'fill' : 'regular'} aria-hidden="true" />
            <span className="visually-hidden">{title.starred ? 'Unstar' : 'Star'} {title.title}</span>
          </button>
          <button type="button" className={`ent-action${title.list === 'must_watch' ? ' is-on' : ''}`} aria-pressed={title.list === 'must_watch'} onClick={() => toggleList('must_watch', 'Must watch')}>
            <BookmarkSimple size={15} weight={title.list === 'must_watch' ? 'fill' : 'regular'} aria-hidden="true" /> Must watch
          </button>
          <button type="button" className={`ent-action${title.list === 'watch_later' ? ' is-on' : ''}`} aria-pressed={title.list === 'watch_later'} onClick={() => toggleList('watch_later', 'Watch later')}>
            <Clock size={15} weight={title.list === 'watch_later' ? 'fill' : 'regular'} aria-hidden="true" /> Later
          </button>
      </div>
    </li>
  );
}

function PopularList({ list }) {
  const q = useTitles(list);
  if (q.isLoading) return <p className="live-muted">Loading…</p>;
  if (q.isError) return <p className="import-error">{describeError(q.error)}</p>;
  if (q.data?.needsSetup) return <p className="live-muted">Add your free TMDB API key in {settingsLink} to see what’s popular.</p>;
  return (
    <>
      <ul className="ent-grid">
        {(q.data?.data || []).map((t) => <TitleCard key={`${t.mediaType}:${t.tmdbId}`} title={t} />)}
      </ul>
      {q.data?.stale && <p className="live-stale live-note">Couldn’t refresh; showing the last copy.</p>}
    </>
  );
}

function SearchResults({ term }) {
  const q = useTitleSearch(term);
  if (q.isLoading) return <p className="live-muted">Searching…</p>;
  if (q.isError) return <p className="import-error">{describeError(q.error)}</p>;
  if (q.data?.needsSetup) return <p className="live-muted">Add your free TMDB API key in {settingsLink} to search.</p>;
  const results = q.data?.data || [];
  return results.length ? (
    <ul className="ent-grid">
      {results.map((t) => <TitleCard key={`${t.mediaType}:${t.tmdbId}`} title={t} />)}
    </ul>
  ) : (
    <p className="live-muted">Nothing found for “{term}”.</p>
  );
}

function MyList() {
  const q = useWatchlist();
  const [filter, setFilter] = useState('all');
  const items = (q.data || []).filter((w) => filter === 'all' || (filter === 'starred' ? w.starred : w.list === filter));
  if (q.isLoading) return <p className="live-muted">Loading…</p>;
  return (
    <>
      <div className="ent-filters" role="group" aria-label="Show">
        {Object.entries(MINE_FILTERS).map(([key, label]) => (
          <button key={key} type="button" className={`ent-chip${filter === key ? ' is-on' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <span className="live-muted">{(q.data || []).filter((w) => key === 'all' || (key === 'starred' ? w.starred : w.list === key)).length}</span>
          </button>
        ))}
      </div>
      {items.length ? (
        <ul className="ent-grid">
          {items.map((t) => <TitleCard key={`${t.mediaType}:${t.tmdbId}`} title={t} />)}
        </ul>
      ) : (
        <p className="live-muted">{q.data?.length ? 'Nothing here yet.' : 'Star titles or add them to Must watch or Watch later, and they’ll appear here.'}</p>
      )}
    </>
  );
}

function CricketCard() {
  const q = useCricket();
  const c = q.data;
  return (
    <section className="live-card ent-cricket" aria-labelledby="live-cricket">
      <header className="live-card__head">
        <h2 id="live-cricket"><Trophy size={18} weight="duotone" aria-hidden="true" /> Cricket</h2>
      </header>
      {q.isLoading ? (
        <p className="live-muted">Loading…</p>
      ) : q.isError ? (
        <p className="import-error">{describeError(q.error)}</p>
      ) : c?.needsSetup ? (
        <p className="live-muted">Add your free CricketData.org API key in {settingsLink} for live scores.</p>
      ) : (
        <ul className="ent-matches">
          {(c?.data?.matches || []).map((m) => {
            const live = m.started && !m.ended;
            return (
              <li key={m.id}>
                <p className="ent-match__head">
                  {live && <span className="ent-live">Live</span>}
                  <span className="live-muted">{[m.type, m.date && formatDate(m.date)].filter(Boolean).join(' · ')}</span>
                </p>
                <p className="ent-match__name">{m.teams.length >= 2 ? m.teams.map((t) => t.short || t.name).join(' vs ') : m.name}</p>
                {m.score.length > 0 && (
                  <ul className="ent-match__score">
                    {m.score.map((s) => (
                      <li key={s.inning}>
                        <span>{s.inning}</span>
                        <span className="live-num">{s.runs}/{s.wickets} ({s.overs} ov)</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="live-muted">{m.status}</p>
              </li>
            );
          })}
          {c?.data?.matches?.length === 0 && <li className="live-muted">No current matches.</li>}
        </ul>
      )}
      {c?.source && !c.needsSetup && (
        <footer className="live-card__foot">
          {c.stale && <span className="live-stale">Couldn’t refresh; showing the last copy. </span>}
          <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener">{c.source}</a>
          {c.data?.hits?.limit ? <> · {c.data.hits.used} of {c.data.hits.limit} free calls used today</> : null}
          {' · updates every 15 min'}
        </footer>
      )}
    </section>
  );
}

/** Entertainment on the Live page: popular titles from TMDB with a personal list, and cricket. */
export function Entertainment({ enabled }) {
  const [tab, setTab] = useState(enabled.movies ? 'movies' : 'mine');
  const [query, setQuery] = useState('');
  const term = useDebouncedValue(query.trim(), 400);
  const searching = term.length >= 2;
  if (!enabled.movies && !enabled.cricket) return null;
  return (
    <section className="ent" aria-labelledby="ent-title">
      <h2 id="ent-title" className="ent__title">Entertainment</h2>
      <div className="ent__layout">
        {enabled.movies && (
          <section className="live-card ent-titles" aria-label="Movies, shows and anime">
            <div className="ent-toolbar">
              <div className="ent-tabs" role="tablist" aria-label="What to show">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={!searching && tab === t.key}
                    className={`ent-tab${!searching && tab === t.key ? ' is-on' : ''}`}
                    onClick={() => (setTab(t.key), setQuery(''))}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <label className="ent-search">
                <MagnifyingGlass size={16} aria-hidden="true" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search movies, shows, anime" aria-label="Search movies, shows and anime" />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </label>
            </div>
            <div role="tabpanel">{searching ? <SearchResults term={term} /> : tab === 'mine' ? <MyList /> : <PopularList list={tab} />}</div>
            <footer className="live-card__foot">
              What’s popular now (movies for India). Data and images from <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer noopener">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.
            </footer>
          </section>
        )}
        {enabled.cricket && <CricketCard />}
      </div>
    </section>
  );
}
