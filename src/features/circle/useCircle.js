import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

// Marking someone as family (or editing a family person) re-sorts past payments, so those lists refresh too.
const FAMILY_KEYS = ['transactions', 'summary', 'insights', 'rules', 'categories', 'family-sync', 'commitments', 'goals'];

export function usePeople(params) {
  return useQuery({
    queryKey: ['people', 'list', params],
    queryFn: () => api('/people', { query: params }),
    placeholderData: keepPreviousData,
  });
}

export function usePerson(id) {
  return useQuery({ queryKey: ['people', 'one', id], queryFn: () => api(`/people/${id}`).then((r) => r.data), enabled: Boolean(id), staleTime: 60_000 });
}

function usePeopleMutation(mutationFn, { family = false } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      // Labels on the ledger come from the circle, so they refresh with it.
      ['transactions', 'summary'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      if (family) FAMILY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export const useCreatePerson = () => usePeopleMutation((body) => api('/people', { method: 'POST', body }).then((r) => r.data), { family: true });
export const useUpdatePerson = () => usePeopleMutation(({ id, ...body }) => api(`/people/${id}`, { method: 'PATCH', body }).then((r) => r.data), { family: true });
export const useRemovePerson = () => usePeopleMutation((id) => api(`/people/${id}`, { method: 'DELETE' }), { family: true });

export function useImportContacts() {
  return usePeopleMutation((file) => {
    const body = new FormData();
    body.append('file', file);
    return api('/people/import', { method: 'POST', body }).then((r) => r.data);
  });
}

/** "Who is this?" — personId null clears it. Resolves to the updated transaction. */
export const useLinkPerson = () => usePeopleMutation(({ id, personId }) => api(`/transactions/${id}/person`, { method: 'PUT', body: { personId } }).then((r) => r.data));
