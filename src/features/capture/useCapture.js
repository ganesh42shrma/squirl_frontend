import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { emitSystemEvents } from '../tasks/systemEvents';

const KEY = 'capture';

/** Rules preview as you type (cheap, no AI). Empty text asks nothing. */
export const useCapturePreview = (text) =>
  useQuery({
    queryKey: [KEY, 'preview', text],
    queryFn: ({ signal }) => api('/capture/preview', { method: 'POST', body: { text }, signal }).then((r) => r.data),
    enabled: Boolean(text.trim()),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

/**
 * The same preview with an AI-suggested category for payments the rules couldn't file. Only asked once typing has
 * paused and only when something is uncategorised; for someone without a cloud model the server answers with the
 * rules' result straight away. A failure just means no suggestion, so it is never retried or shown.
 */
export const useAiCategories = (text, enabled) =>
  useQuery({
    queryKey: [KEY, 'categorise', text],
    queryFn: ({ signal }) => api('/capture/categorise', { method: 'POST', body: { text }, signal }).then((r) => r.data),
    enabled: enabled && Boolean(text.trim()),
    staleTime: 5 * 60_000,
    retry: false,
  });

export const useCaptureSearch = (q) =>
  useQuery({
    queryKey: [KEY, 'search', q],
    queryFn: ({ signal }) => api('/capture/search', { query: { q }, signal }).then((r) => r.data),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

export const useCaptureInbox = (enabled = true) =>
  useQuery({ queryKey: [KEY, 'inbox'], queryFn: () => api('/capture/inbox').then((r) => r.data), enabled, staleTime: 10_000 });

/** Asks the AI engine to read text the rules couldn't. Explicit, never automatic: it can be slow. */
export const useAiPreview = () => useMutation({ mutationFn: (text) => api('/capture/preview', { method: 'POST', body: { text, ai: true } }).then((r) => r.data) });

// A capture can touch the ledger, tasks, habits, XP and the inbox, so a save refreshes everything.
function useCaptureMutation(fn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars) => {
      const response = await fn(vars);
      emitSystemEvents(response.events);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export const useCommitCapture = () => useCaptureMutation((body) => api('/capture', { method: 'POST', body }));
export const useUndoCapture = () => useCaptureMutation((id) => api(`/capture/${id}/undo`, { method: 'POST' }));
export const useDismissCapture = () => useCaptureMutation((id) => api(`/capture/${id}/dismiss`, { method: 'POST' }));
