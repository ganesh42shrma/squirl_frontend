import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export const useSmsAccounts = () => useQuery({ queryKey: ['sms', 'accounts'], queryFn: ({ signal }) => api('/sms/accounts', { signal }).then((r) => r.data.accounts), refetchOnWindowFocus: false });
export const useSmsDevices = () => useQuery({ queryKey: ['sms', 'devices'], queryFn: ({ signal }) => api('/sms/devices', { signal }).then((r) => r.data.devices) });
export const useSmsReview = (page) => useQuery({ queryKey: ['sms', 'review', page], queryFn: ({ signal }) => api('/sms/events', { query: { status: 'review', page, limit: 10 }, signal }).then((r) => ({ items: r.data.items, meta: r.meta })), refetchInterval: 30_000 });

function useSmsMutation(mutationFn) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => {
    for (const key of ['sms', 'transactions', 'summary', 'insights', 'commitments', 'goals', 'profile']) client.invalidateQueries({ queryKey: [key] });
  } });
}
export const useSaveSmsAccounts = () => useSmsMutation((body) => api('/sms/accounts', { method: 'PUT', body }).then((r) => r.data.accounts));
export const useRevokeSmsDevice = () => useSmsMutation((id) => api(`/sms/devices/${id}`, { method: 'DELETE' }));
// Takes a disconnected phone off the list. The server only hides it (its messages must stay), and refuses a connected one.
export const useRemoveSmsDevice = () => useSmsMutation((id) => api(`/sms/devices/${id}/remove`, { method: 'POST' }));
export const useResolveSms = () => useSmsMutation(({ id, fields }) => api(`/sms/events/${id}/${fields ? 'confirm' : 'dismiss'}`, { method: 'POST', body: fields }).then((r) => r.data));
