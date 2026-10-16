import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { MONEY_TYPE_ORDER } from '../../lib/moneyTypes';

const byName = (a, b) => a.name.localeCompare(b.name);

// Flat list → lookups the UI needs: id → category, the type-ordered tree, and "Parent › Child" labels.
function indexCategories(categories) {
  const byId = new Map(categories.map((c) => [c._id, c]));

  const tree = categories
    .filter((c) => !c.parent)
    .sort((a, b) => MONEY_TYPE_ORDER.indexOf(a.type) - MONEY_TYPE_ORDER.indexOf(b.type) || byName(a, b))
    .map((parent) => ({
      ...parent,
      children: categories.filter((c) => c.parent === parent._id).sort(byName),
    }));

  const labelOf = (id) => {
    const category = byId.get(id);
    if (!category) return '';
    const parent = category.parent && byId.get(category.parent);
    return parent ? `${parent.name} › ${category.name}` : category.name;
  };

  return { byId, tree, labelOf };
}

export function useCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: () => api('/categories', { query: { view: 'flat' } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const index = useMemo(() => indexCategories(query.data || []), [query.data]);
  return { ...query, categories: query.data || [], ...index };
}

function useCategoryMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export const useCreateCategory = () =>
  useCategoryMutation((body) => api('/categories', { method: 'POST', body }).then((r) => r.data));

export const useUpdateCategory = () =>
  useCategoryMutation(({ id, ...body }) => api(`/categories/${id}`, { method: 'PATCH', body }).then((r) => r.data));

export const useDeleteCategory = () =>
  useCategoryMutation((id) => api(`/categories/${id}`, { method: 'DELETE' }));
