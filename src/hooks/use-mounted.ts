"use client";

import { useSyncExternalStore } from "react";

// Returns false on the server and during the first client render, then true
// after hydration. Use to gate UI that would otherwise diverge between SSR
// and the first client render (e.g. session-dependent content) and would
// trigger React hydration error #418.
//
// Implemented with useSyncExternalStore so React's set-state-in-effect lint
// rule doesn't reject the older `useEffect(() => setState(true), [])` mount
// pattern. The store never updates — the difference between server and
// client snapshots is enough to flip the value after hydration.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
