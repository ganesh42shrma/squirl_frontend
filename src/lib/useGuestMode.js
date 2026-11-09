import { useSyncExternalStore } from 'react';
import { isGuestMode, setGuestMode, subscribeGuestMode } from './guestMode';

export function useGuestMode() {
  const guestMode = useSyncExternalStore(subscribeGuestMode, isGuestMode, () => false);
  return { guestMode, setGuestMode, toggleGuestMode: () => setGuestMode(!isGuestMode()) };
}
