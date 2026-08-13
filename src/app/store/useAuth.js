/* eslint-disable no-unused-vars */
import { create } from "zustand";

const useAuthStore = create((set) => ({
  isLoading: false,
  toggleLoading: (loading) => {
    set((state) => ({
      isLoading: loading,
    }));
  },
}));

export default useAuthStore;
