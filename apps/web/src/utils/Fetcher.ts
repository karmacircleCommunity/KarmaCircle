import axios from "axios";
import { store } from "@app/store/store";
import { clearRejectedSession } from "@utils/clearRejectedSession";

const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const requestedUser = store.getState().user;
  try {
    const { data } = await axios.get<T>(url, {
      withCredentials: true,
    });
    return data;
  } catch (error) {
    clearRejectedSession(error, requestedUser);
    throw error;
  }
};

export default fetcher;
