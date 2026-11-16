import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const mediaKeys = {
  status: ['media', 'status'],
  attachments: (ownerType, ownerId, day) => (day ? ['media', 'attachments', ownerType, ownerId, day] : ['media', 'attachments', ownerType, ownerId]),
};

/** Where a photo is shown from. Same-origin, so the session cookie authorises it; the URL carries no secret. */
export const mediaFileUrl = (mediaId) => `${BASE_URL}/api/media/${mediaId}/file`;

/** { configured, maxBytes, maxPerOwner }. A 503 from any media route also means "not set up". */
export const useMediaStatus = () => useQuery({
  queryKey: mediaKeys.status,
  queryFn: ({ signal }) => api('/media/status', { signal }).then((r) => r.data).catch((err) => {
    if (err?.status === 503 || err?.code === 'MEDIA_NOT_CONFIGURED') return { configured: false };
    throw err;
  }),
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
});

// Only metadata (ids, size) is ever cached. Image bytes and blob URLs never enter the query cache.
export const useAttachments = (ownerType, ownerId, { enabled = true, day } = {}) => useQuery({
  queryKey: mediaKeys.attachments(ownerType, ownerId, day),
  queryFn: ({ signal }) => api('/media/attachments', { query: { ownerType, ownerId, day }, signal }).then((r) => r.data.attachments),
  enabled: Boolean(enabled && ownerType && ownerId),
});

// A mutation remembers its variables, so the photo itself is handed over through this side table instead
// and forgotten as soon as the request ends: no image bytes end up in the mutation cache.
const pendingFiles = new Map();
let ticketCounter = 0;

export function useUploadAttachment() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ ownerType, ownerId, day, ticket }) => {
      const blob = pendingFiles.get(ticket);
      pendingFiles.delete(ticket);
      const form = new FormData();
      form.append('ownerType', ownerType);
      form.append('ownerId', ownerId);
      if (day) form.append('day', day);
      form.append('file', blob, 'receipt.jpg'); // a generic name: the real file name never leaves the phone
      return api('/media/upload', { method: 'POST', body: form }).then((r) => r.data.attachment);
    },
    // Every list of this item's photos, whatever day it was asked for, is stale now.
    onSuccess: (_attachment, { ownerType, ownerId }) => client.invalidateQueries({ queryKey: ['media', 'attachments', ownerType, ownerId] }),
  });
  const upload = (ownerType, ownerId, blob, day) => {
    ticketCounter += 1;
    const ticket = `upload-${ticketCounter}`;
    pendingFiles.set(ticket, blob);
    return mutation.mutateAsync({ ownerType, ownerId, day, ticket }).finally(() => pendingFiles.delete(ticket));
  };
  return { upload, isPending: mutation.isPending, error: mutation.error, reset: mutation.reset };
}

export function useRemoveAttachment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => api(`/media/attachments/${id}`, { method: 'DELETE' }),
    onSuccess: (_result, { ownerType, ownerId }) => client.invalidateQueries({ queryKey: ['media', 'attachments', ownerType, ownerId] }),
  });
}
