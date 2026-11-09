import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export function useCommitments() {
  return useQuery({ queryKey: ['commitments'], queryFn: () => api('/commitments').then((r) => r.data) });
}

// Due soon and missed payments. Re-checked every 10 minutes for the reminders.
export function useCommitmentAlerts() {
  return useQuery({
    queryKey: ['commitments', 'alerts'],
    queryFn: () => api('/commitments/alerts').then((r) => r.data.alerts),
    refetchInterval: 10 * 60_000,
  });
}

export function useDetectedRecurring() {
  return useQuery({ queryKey: ['commitments', 'detected'], queryFn: () => api('/commitments/detected').then((r) => r.data.items) });
}

export function useMerchantSearch(search) {
  return useQuery({
    queryKey: ['commitments', 'merchants', search],
    queryFn: () => api('/commitments/merchants', { query: { search } }).then((r) => r.data.items),
    enabled: search.trim().length >= 2,
  });
}

export function useSchedule(id, enabled) {
  return useQuery({ queryKey: ['commitments', 'schedule', id], queryFn: () => api(`/commitments/${id}/schedule`).then((r) => r.data), enabled });
}

function useCommitmentMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commitments'] }) });
}

export const useSaveCommitment = () =>
  useCommitmentMutation(({ id, ...body }) =>
    (id ? api(`/commitments/${id}`, { method: 'PATCH', body }) : api('/commitments', { method: 'POST', body })).then((r) => r.data),
  );
export const useDeleteCommitment = () => useCommitmentMutation((id) => api(`/commitments/${id}`, { method: 'DELETE' }).then((r) => r.data));

// The EMI formula, for a live preview while typing (the server does the real calculation).
export function previewEmi(principal, rate, months) {
  const p = Number(principal);
  const n = Number(months);
  const i = Number(rate || 0) / 12 / 100;
  if (!p || !n) return null;
  if (!i) return p / n;
  const f = (1 + i) ** n;
  return (p * i * f) / (f - 1);
}

export const KIND_LABELS = { loan: 'Loan EMI', subscription: 'Subscription', auto_debit: 'Auto-debit' };
export const FREQUENCY_LABELS = { monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly' };
