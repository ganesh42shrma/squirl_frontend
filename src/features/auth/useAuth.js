import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, SIGNED_OUT_EVENT } from '../../api/client';

const ME = ['me'];

// Who's signed in: the user, null when nobody is, undefined while loading.
export function useMe() {
  return useQuery({
    queryKey: ME,
    queryFn: () =>
      api('/auth/me')
        .then((r) => r.data)
        .catch((err) => {
          if (err.status === 401) return null;
          throw err;
        }),
    staleTime: Infinity,
    retry: false,
  });
}

// Switching accounts must never show the previous account's cached data, so the whole cache
// is dropped whenever who's signed in changes.
function useSession(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(ME, user ?? null);
    },
  });
}

export const useLogin = () => useSession((body) => api('/auth/login', { method: 'POST', body }).then((r) => r.data));
export const useRegister = () => useSession((body) => api('/auth/register', { method: 'POST', body }).then((r) => r.data));
export const useResetPassword = () => useSession((body) => api('/auth/password/reset', { method: 'POST', body }).then((r) => r.data));
export const useLogout = () => useSession(() => api('/auth/logout', { method: 'POST' }).then(() => null));
export const useDeleteAccount = () => useSession((body) => api('/users/me', { method: 'DELETE', body }).then(() => null));

export const useForgotPassword = () =>
  useMutation({ mutationFn: (body) => api('/auth/password/forgot', { method: 'POST', body }).then((r) => r.message) });

// When any request finds the session gone, drop everything and treat the visitor as signed out.
export function useSignedOutListener() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const onSignedOut = () => {
      queryClient.clear();
      queryClient.setQueryData(ME, null);
    };
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  }, [queryClient]);
}

/* ── Profile ─────────────────────────────────────────── */

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: () => api('/users/me').then((r) => r.data) });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/users/me', { method: 'PATCH', body }).then((r) => r.data),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
      queryClient.setQueryData(ME, (me) => (me ? { ...me, name: profile.name, email: profile.email } : me));
      ['transactions', 'summary', 'insights', 'rules', 'categories', 'family-sync'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export const useChangePassword = () =>
  useMutation({ mutationFn: (body) => api('/users/me/password', { method: 'POST', body }).then((r) => r.message) });

export function useAddFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/users/me/family-contacts', { method: 'POST', body }).then((r) => r.data),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
      ['transactions', 'summary', 'insights', 'rules', 'categories', 'family-sync'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export function useResetFinancialData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api('/users/me/financial-data/reset', { method: 'POST', body: { confirmation: 'RESET' } }).then((r) => r.data),
    onSuccess: async () => {
      await queryClient.cancelQueries({ predicate: (q) => !['me', 'profile'].includes(q.queryKey[0]) });
      await Promise.all([
        queryClient.resetQueries({ predicate: (q) => !['me', 'profile'].includes(q.queryKey[0]) }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
    },
  });
}

export function useFamilySync() {
  return useQuery({
    queryKey: ['family-sync'],
    queryFn: () => api('/users/me/family-sync').then((r) => r.data),
    refetchInterval: (q) => ['pending', 'running'].includes(q.state.data?.status) ? 2000 : 30_000,
  });
}

// Mounted in the app shell so the ledger/reports refresh even after leaving Profile.
export function useWatchFamilySync() {
  const { data } = useFamilySync();
  const completed = useRef(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (data?.status !== 'completed' || completed.current === data.revision) return;
    completed.current = data.revision;
    ['transactions', 'summary', 'insights', 'rules', 'tags'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }, [data, queryClient]);
}
