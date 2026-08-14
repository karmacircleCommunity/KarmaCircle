import { create } from "zustand";

interface AuthState {
  isLoading: boolean;
  toggleLoading: (loading: boolean) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  isLoading: false,
  toggleLoading: (loading) => {
    set(() => ({
      isLoading: loading,
    }));
  },
}));

export default useAuthStore;
