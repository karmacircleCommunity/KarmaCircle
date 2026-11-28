import { configureStore } from "@reduxjs/toolkit";
import { mutate, unload } from "swr";
import { cache } from "swr/_internal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userReducer, {
  resetUserData,
  toggleUserLogin,
  updateUserData,
} from "./slices/userSlice";
import { onViewerChange, viewerIdentity } from "./viewerIdentity";

const makeStore = () => configureStore({ reducer: { user: userReducer } });
const asha = { email: "asha@example.com", isLoggedIn: true };
const ben = { email: "ben@example.com", isLoggedIn: true };

describe("viewerIdentity", () => {
  it("is empty for a visitor, whatever else is stored", () => {
    expect(viewerIdentity({ isLoggedIn: false })).toBe("");
    expect(viewerIdentity({ ...asha, isLoggedIn: false })).toBe("");
  });

  it("is the account for a signed-in person", () => {
    expect(viewerIdentity(asha)).toBe("asha@example.com");
    expect(viewerIdentity({ isLoggedIn: true })).toBe("signed-in");
  });
});

describe("onViewerChange", () => {
  it("fires on sign-in, account change and sign-out", () => {
    const store = makeStore();
    const changed = vi.fn();
    onViewerChange(store, changed);

    store.dispatch(updateUserData(asha));
    expect(changed).toHaveBeenCalledTimes(1);
    store.dispatch(updateUserData(ben));
    expect(changed).toHaveBeenCalledTimes(2);
    store.dispatch(resetUserData());
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it("fires once for the two-step Google sign-in", () => {
    const store = makeStore();
    const changed = vi.fn();
    onViewerChange(store, changed);

    store.dispatch(updateUserData({ email: asha.email }));
    expect(changed).not.toHaveBeenCalled();
    store.dispatch(toggleUserLogin());
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("stays quiet while the same account is refreshed or signed out twice", () => {
    const store = makeStore();
    store.dispatch(updateUserData(asha));
    const changed = vi.fn();
    onViewerChange(store, changed);

    store.dispatch(updateUserData({ ...asha, name: "Asha R" }));
    expect(changed).not.toHaveBeenCalled();
    store.dispatch(resetUserData());
    store.dispatch(resetUserData());
    expect(changed).toHaveBeenCalledTimes(1);
  });
});

describe("clearing cached responses with it", () => {
  // The keys the pages use: a plain one, and the special one a "load more"
  // list keeps, which a key filter cannot reach.
  const keys = ["/events?uid=a", "$inf$/events/mine?page=1"];
  const store = makeStore();
  onViewerChange(store, () => unload());

  beforeEach(async () => {
    store.dispatch(updateUserData(asha));
    await mutate(
      keys[0],
      { platformLink: "https://zoom.example.com/j/1" },
      false,
    );
    cache.set(keys[1], { data: ["asha's list"] });
  });

  it.each([
    ["signing out", resetUserData()],
    ["another account signing in", updateUserData(ben)],
  ])("leaves nothing behind after %s", (_, action) => {
    expect(cache.get(keys[0])?.data).toBeDefined();

    store.dispatch(action);

    for (const key of keys) expect(cache.get(key)?.data).toBeUndefined();
  });
});
