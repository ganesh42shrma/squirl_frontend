import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

// Balance history per account, read from the running balance on imported statement rows.
export function useBalances(range = {}) {
  return useQuery({
    queryKey: ['insights', 'balances', range],
    queryFn: () => api('/insights/balances', { query: range }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

// Month-by-month figures, highlights, top categories and largest rows for a date range.
export function useHistory(range = {}) {
  return useQuery({
    queryKey: ['insights', 'history', range],
    queryFn: () => api('/insights/history', { query: range }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

// Is a local model running? Checked once per visit; it's cheap and never throws.
export function useLlmStatus() {
  return useQuery({
    queryKey: ['insights', 'llm'],
    queryFn: () => api('/insights/llm').then((r) => r.data),
    staleTime: 60_000,
    // While the model is still loading into memory, check again every 15 s.
    refetchInterval: (query) => (query.state.data?.available && query.state.data.loaded === false ? 15_000 : false),
  });
}

// Asks the local model to write up a range. On demand, because it takes a few seconds.
export function useWriteSummary() {
  return useMutation({
    mutationFn: (range) => api('/insights/history/summary', { method: 'POST', body: range }).then((r) => r.data),
  });
}

// Category suggestions, worked out by a background job on the server. Polls while it's running.
export function useSuggestions() {
  return useQuery({
    queryKey: ['insights', 'suggestions'],
    queryFn: async () => {
      const first = (await api('/insights/suggestions', { query: { limit: 1000 } })).data;
      const suggestions = [...first.suggestions];
      while (suggestions.length < first.total) {
        const page = (await api('/insights/suggestions', { query: { limit: 1000, offset: suggestions.length } })).data;
        if (!page.suggestions.length) break;
        suggestions.push(...page.suggestions);
      }
      return { ...first, suggestions: [...new Map(suggestions.map((s) => [s._id, s])).values()] };
    },
    refetchInterval: (query) => (query.state.data?.status?.running ? 4000 : 30_000),
  });
}

function useSuggestionMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => ['insights', 'transactions', 'summary', 'rules'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  });
}

// items: [{ id, categoryId? }]; categoryId overrides the suggested one.
export const useApplySuggestions = () => useSuggestionMutation(async (items) => {
  let applied = 0;
  // The API accepts up to 2,000 merchants per request. Include every selected merchant.
  for (let offset = 0; offset < items.length; offset += 2000) {
    const result = await api('/insights/suggestions/apply', { method: 'POST', body: { items: items.slice(offset, offset + 2000) } });
    applied += result.data.applied;
  }
  return { applied };
});
export const useDismissSuggestion = () => useSuggestionMutation((id) => api(`/insights/suggestions/${id}/dismiss`, { method: 'POST' }).then((r) => r.data));
export const useRunSuggestions = () => useSuggestionMutation(() => api('/insights/suggestions/run', { method: 'POST' }).then((r) => r.data));

// Just the background job's status, for the notices shown on every screen.
export function useSuggestionStatus() {
  return useQuery({
    queryKey: ['insights', 'suggestions', 'status'],
    queryFn: () => api('/insights/suggestions', { query: { limit: 0 } }).then((r) => r.data.status),
    refetchInterval: (query) => (query.state.data?.running ? 4000 : 20_000),
  });
}
