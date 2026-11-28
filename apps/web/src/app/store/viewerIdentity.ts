import type { User } from "@/types/user";

/** Who is looking: the signed-in account's email, or "" for a visitor. */
export const viewerIdentity = (user: User): string =>
  user.isLoggedIn ? (user.email ?? "signed-in") : "";

/**
 * Calls `onChange` whenever the signed-in identity changes: signing in or up,
 * signing out, a rejected session, or one account replacing another. It
 * watches the stored user instead of any one button, so every such path is
 * covered, including ones added later.
 *
 * It runs as a store subscriber, synchronously inside the dispatch, so it is
 * done before React renders anything for the new identity. Edits to the same
 * account (a new name, a refreshed profile) do not count.
 */
export function onViewerChange(
  store: {
    getState: () => { user: User };
    subscribe: (listener: () => void) => () => void;
  },
  onChange: () => void,
): () => void {
  let current = viewerIdentity(store.getState().user);
  return store.subscribe(() => {
    const next = viewerIdentity(store.getState().user);
    if (next === current) return;
    current = next;
    onChange();
  });
}
