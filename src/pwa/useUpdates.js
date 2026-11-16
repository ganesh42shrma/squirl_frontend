import { useSyncExternalStore } from 'react';
import { getUpdateState, subscribeUpdates } from './client';

/** The app's update status: { supported, ready, checking, current, next, checkedAt, error }. */
export const useUpdates = () => useSyncExternalStore(subscribeUpdates, getUpdateState, getUpdateState);

/** "16 Nov 2026" from a build's commit date, or '' when the build has none. */
export function buildDate(build) {
  const date = build?.at ? new Date(build.at) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

/** "1.0.0 · 16 Nov 2026 · build 3f2a1c9", leaving out whatever this build does not know. */
export const describeBuild = (build) => (build ? [build.v, buildDate(build), build.id && `build ${build.id}`].filter(Boolean).join(' · ') : '');
