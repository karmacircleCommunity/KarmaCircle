import axios from "axios";
import { store } from "@app/store/store";
import { resetUserData } from "@app/store/slices/userSlice";
import type { User } from "@/types/user";

export function clearRejectedSession(error: unknown, requestedUser: User) {
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    store.getState().user === requestedUser
  ) {
    store.dispatch(resetUserData());
  }
}
