import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export function useImports() {
  return useQuery({
    queryKey: ['imports'],
    queryFn: () => api('/imports', { query: { limit: 50 } }).then((r) => r.data),
  });
}

// An import or its undo changes the ledger, totals and tag counts too.
function useImportMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => {
      ['imports', 'transactions', 'summary', 'tags'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export const useCreateImport = () =>
  useImportMutation(({ file, bank, password }) => {
    const form = new FormData();
    form.append('file', file);
    form.append('bank', bank);
    if (password) form.append('password', password);
    return api('/imports', { method: 'POST', body: form }).then((r) => r.data);
  });

export const useDeleteImport = () =>
  useImportMutation((id) => api(`/imports/${id}`, { method: 'DELETE' }).then((r) => r.data));
