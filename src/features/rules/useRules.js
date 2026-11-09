import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

// What merchant memory has learned, plus how many unsorted rows it could sort right now.
export function useRules() {
  return useQuery({
    queryKey: ['rules'],
    queryFn: () => api('/rules').then((r) => r.data),
  });
}

function useRulesMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => ['rules', 'transactions', 'summary', 'insights'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  });
}

export const useApplyRules = () => useRulesMutation(() => api('/rules/apply', { method: 'POST' }).then((r) => r.data));
export const useDeleteRule = () => useRulesMutation((id) => api(`/rules/${id}`, { method: 'DELETE' }).then((r) => r.data));
