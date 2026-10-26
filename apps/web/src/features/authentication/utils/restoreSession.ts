import { store } from "@app/store/store";
import { updateUserData } from "@app/store/slices/userSlice";
import { userEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import type { User } from "@/types/user";

export async function restoreSession(): Promise<void> {
  const previousUser = store.getState().user;
  if (!previousUser.isLoggedIn) return;

  try {
    const { user } = await fetcher<{ user: User }>(userEndpoints.profile);
    // Do not restore a session that was signed out while this request ran.
    if (store.getState().user === previousUser) {
      store.dispatch(updateUserData({ ...user, isLoggedIn: true }));
    }
  } catch {
    // Fetcher clears rejected sessions. Connectivity/server errors must
    // not sign the user out; the page can offer a retry instead.
  }
}
