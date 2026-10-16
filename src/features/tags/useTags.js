import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export function useTags() {
  const query = useQuery({
    queryKey: ['tags'],
    queryFn: () => api('/tags').then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const byName = useMemo(() => new Map((query.data || []).map((t) => [t.name, t])), [query.data]);
  return { ...query, tags: query.data || [], byName };
}

function useTagMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export const useCreateTag = () => useTagMutation((body) => api('/tags', { method: 'POST', body }).then((r) => r.data));

export const useUpdateTag = () =>
  useTagMutation(({ id, ...body }) => api(`/tags/${id}`, { method: 'PATCH', body }).then((r) => r.data));

export const useDeleteTag = () => useTagMutation((id) => api(`/tags/${id}`, { method: 'DELETE' }));

// Same rule as the backend: "Late Night" → "late-night".
export const normalizeTag = (tag) => tag.trim().toLowerCase().replace(/\s+/g, '-');
