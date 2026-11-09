import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../api/client';

export function useTransactions(params) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api('/transactions', { query: params }),
    placeholderData: keepPreviousData,
  });
}

// One all-date count shared by Dashboard and Sort out, refreshed during background work.
export function useUnsortedCount() {
  return useQuery({
    queryKey: ['transactions', { category: 'none', limit: 1 }],
    queryFn: () => api('/transactions', { query: { category: 'none', limit: 1 } }),
    select: (r) => r.meta?.total || 0,
    refetchInterval: 20_000,
  });
}

export function useSummary(params) {
  return useQuery({
    queryKey: ['summary', params],
    queryFn: () => api('/transactions/summary', { query: params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

// Any change to a transaction can change lists, totals and tag counts.
function useTransactionMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export const useCreateTransaction = () =>
  useTransactionMutation((body) => api('/transactions', { method: 'POST', body }).then((r) => r.data));

export const useUpdateTransaction = () =>
  useTransactionMutation(({ id, ...body }) =>
    api(`/transactions/${id}`, { method: 'PATCH', body }).then((r) => r.data),
  );

export const useBulkUpdateTransactions = () =>
  useTransactionMutation(({ ids, set }) =>
    api('/transactions/bulk', { method: 'PATCH', body: { ids, set } }).then((r) => r.data),
  );

// The API deletes one row at a time, so a bulk delete is several requests.
export const useDeleteTransactions = () =>
  useTransactionMutation((ids) => Promise.all(ids.map((id) => api(`/transactions/${id}`, { method: 'DELETE' }))));
