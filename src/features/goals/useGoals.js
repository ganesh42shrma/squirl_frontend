import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export const KIND_LABELS = {
  vehicle: 'Vehicle',
  home: 'Home',
  travel: 'Travel',
  education: 'Education',
  gadget: 'Gadget',
  wedding: 'Wedding',
  emergency: 'Emergency fund',
  retirement: 'Retirement',
  other: 'Something else',
};

export const SAVING_IN_LABELS = {
  savings: 'Savings account',
  rd: 'Recurring deposit',
  fd: 'Fixed deposit',
  sip: 'Mutual fund SIP',
  cash: 'Cash',
  other: 'Somewhere else',
};

export const TRACK_LABELS = { ahead: 'Ahead of plan', on_track: 'On track', behind: 'Behind plan', reached: 'Reached' };

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: () => api('/goals').then((r) => r.data) });
}

export function useGoal(id) {
  return useQuery({ queryKey: ['goals', id], queryFn: () => api(`/goals/${id}`).then((r) => r.data) });
}

export function useGoalOptions() {
  return useQuery({ queryKey: ['goals', 'options'], queryFn: () => api('/goals/options').then((r) => r.data), staleTime: 60_000 });
}

/** The live calculator: recalculates on the server as the (debounced) form changes. */
export function usePlanPreview(body) {
  return useQuery({
    queryKey: ['goals', 'plan', body],
    queryFn: () => api('/goals/plan', { method: 'POST', body }).then((r) => r.data),
    enabled: Boolean(body),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/** Which engine writes Squirl's words (Profile → AI): decides whether setup autofills as you type. */
export function useAiSettings() {
  return useQuery({ queryKey: ['ai', 'settings'], queryFn: () => api('/ai/settings').then((r) => r.data), staleTime: 60_000 });
}

export function useGoalAssist() {
  return useMutation({ mutationFn: (body) => api('/goals/assist', { method: 'POST', body }).then((r) => r.data) });
}

export function useLinkCandidates(id, search, enabled) {
  return useQuery({
    queryKey: ['goals', id, 'candidates', search],
    queryFn: () => api(`/goals/${id}/candidates`, { query: { search } }).then((r) => r.data.items),
    enabled,
    placeholderData: keepPreviousData,
  });
}

// The written plan check. While the background job is re-writing it, look again every 8 s.
export function useGoalAnalysis(id) {
  return useQuery({
    queryKey: ['goals', id, 'analysis'],
    queryFn: () => api(`/goals/${id}/analysis`).then((r) => r.data),
    refetchInterval: (query) => (query.state.data?.pending ? 8000 : false),
  });
}

export function useRefreshAnalysis(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/goals/${id}/analysis`, { method: 'POST' }).then((r) => r.data),
    onSuccess: (data) => queryClient.setQueryData(['goals', id, 'analysis'], data),
  });
}

function useGoalMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }) });
}

export const useSaveGoal = () =>
  useGoalMutation(({ id, ...body }) => (id ? api(`/goals/${id}`, { method: 'PATCH', body }) : api('/goals', { method: 'POST', body })).then((r) => r.data));
export const useDeleteGoal = () => useGoalMutation((id) => api(`/goals/${id}`, { method: 'DELETE' }).then((r) => r.data));
export const useAddContribution = (id) => useGoalMutation((body) => api(`/goals/${id}/contributions`, { method: 'POST', body }).then((r) => r.data));
export const useRemoveContribution = (id) => useGoalMutation((cid) => api(`/goals/${id}/contributions/${cid}`, { method: 'DELETE' }).then((r) => r.data));
export const useExcludeTransaction = (id) => useGoalMutation((transactionId) => api(`/goals/${id}/exclusions`, { method: 'POST', body: { transactionId } }).then((r) => r.data));

/** "3 years 2 months", "8 months". */
export function durationText(months) {
  if (months == null) return '—';
  if (months === 0) return 'now';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} year${y > 1 ? 's' : ''}`, m && `${m} month${m > 1 ? 's' : ''}`].filter(Boolean).join(' ');
}
