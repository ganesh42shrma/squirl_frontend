import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

const get = (path, query) => api(path, { query }).then((r) => r.data);

export const useLiveSettings = () => useQuery({ queryKey: ['live', 'settings'], queryFn: () => get('/feeds/settings') });

// Cards refresh when the page is opened again after their cache window; the server caches too.
export const useWeather = () => useQuery({ queryKey: ['live', 'weather'], queryFn: () => get('/feeds/weather'), staleTime: 10 * 60_000 });
export const useRates = () => useQuery({ queryKey: ['live', 'rates'], queryFn: () => get('/feeds/rates'), staleTime: 60 * 60_000 });
export const useFunds = () => useQuery({ queryKey: ['live', 'funds'], queryFn: () => get('/feeds/funds'), staleTime: 60 * 60_000 });
export const useCoins = () => useQuery({ queryKey: ['live', 'crypto'], queryFn: () => get('/feeds/crypto'), staleTime: 2 * 60_000 });
export const useNews = () => useQuery({ queryKey: ['live', 'news'], queryFn: () => get('/feeds/news'), staleTime: 15 * 60_000 });
export const useInflation = () => useQuery({ queryKey: ['live', 'inflation'], queryFn: () => get('/feeds/inflation'), staleTime: 6 * 60 * 60_000 });
export const useCurrencies = () => useQuery({ queryKey: ['live', 'currencies'], queryFn: () => get('/feeds/currencies'), staleTime: Infinity });

/** Debounced search against a feeds search endpoint (places, funds, crypto). */
export function useFeedSearch(kind, term) {
  return useQuery({
    queryKey: ['live', 'search', kind, term],
    queryFn: () => get(`/feeds/${kind}`, { q: term }),
    enabled: term.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
  });
}

export function useSaveLiveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/feeds/settings', { method: 'PATCH', body }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['live', 'settings'], data);
      queryClient.invalidateQueries({ queryKey: ['live'], predicate: (q) => !['settings', 'search', 'currencies', 'inflation'].includes(q.queryKey[1]) });
    },
  });
}

// WMO weather codes (Open-Meteo) → words.
export function weatherText(code) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return '—';
}

// US AQI bands (what Open-Meteo reports).
export function aqiText(aqi) {
  if (aqi == null) return null;
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for sensitive groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

// --- Entertainment ---------------------------------------------------------------------------

export const useTitles = (list, enabled = true) =>
  useQuery({ queryKey: ['live', 'titles', list], queryFn: () => get(`/feeds/titles/${list}`), staleTime: 60 * 60_000, enabled });
export const useCricket = (enabled = true) =>
  useQuery({ queryKey: ['live', 'cricket'], queryFn: () => get('/feeds/cricket'), staleTime: 5 * 60_000, refetchInterval: 15 * 60_000, enabled });
export const useWatchlist = () => useQuery({ queryKey: ['live', 'watchlist'], queryFn: () => get('/feeds/watchlist').then((d) => d.items) });

/**
 * Star a title or move it between lists. The screen updates at once (the title's buttons and the
 * My list tab), then the server confirms; on failure everything goes back as it was.
 */
export function useSetWatch() {
  const queryClient = useQueryClient();
  const patchTitles = (title, change) =>
    queryClient.setQueriesData({ queryKey: ['live', 'titles'] }, (old) =>
      old?.data ? { ...old, data: old.data.map((t) => (t.tmdbId === title.tmdbId && t.mediaType === title.mediaType ? { ...t, ...change } : t)) } : old,
    );
  return useMutation({
    mutationFn: ({ title, change }) => api('/feeds/watchlist', { method: 'PUT', body: { ...title, ...change } }).then((r) => r.data),
    onMutate: async ({ title, change }) => {
      await queryClient.cancelQueries({ queryKey: ['live', 'watchlist'] });
      const before = { titles: queryClient.getQueriesData({ queryKey: ['live', 'titles'] }), watchlist: queryClient.getQueryData(['live', 'watchlist']) };
      patchTitles(title, change);
      queryClient.setQueryData(['live', 'watchlist'], (old = []) => {
        const rest = old.filter((w) => !(w.tmdbId === title.tmdbId && w.mediaType === title.mediaType));
        const current = old.find((w) => w.tmdbId === title.tmdbId && w.mediaType === title.mediaType) || title;
        const next = { ...current, ...change };
        return next.starred || next.list ? [next, ...rest] : rest;
      });
      return before;
    },
    onError: (_err, _vars, before) => {
      before?.titles.forEach(([key, value]) => queryClient.setQueryData(key, value));
      queryClient.setQueryData(['live', 'watchlist'], before?.watchlist);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['live', 'watchlist'] }),
  });
}

// --- Stocks (Marketstack: 100 requests a month on the free plan) ------------------------------

export const useStocks = () => useQuery({ queryKey: ['live', 'stocks'], queryFn: () => get('/feeds/stocks'), staleTime: 6 * 60 * 60_000 });

/** Explicit search (a button, not as-you-type): every new search term costs one request. */
export function useStockSearch() {
  return useMutation({ mutationFn: (q) => get('/feeds/stocks/search', { q }) });
}

// Search lives under ['live', 'titles', …] so starring a result updates it like any other list.
export const useTitleSearch = (term) =>
  useQuery({
    queryKey: ['live', 'titles', 'search', term],
    queryFn: () => get('/feeds/titles-search', { q: term }),
    enabled: term.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60 * 60_000,
  });
