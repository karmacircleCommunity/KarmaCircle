import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types/user";
import type { RootState } from "@app/store/store";

const initialState: User = { isLoggedIn: false };

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateUserData: (state, action: PayloadAction<Partial<User> | undefined>) => {
      return {
        ...state,
        ...action.payload,
      };
    },

    toggleUserLogin: (state) => {
      return {
        ...state,
        isLoggedIn: !state.isLoggedIn,
      };
    },

    resetUserData: () => {
      return initialState;
    },
  },
});

export const selectIsLoggedIn = (state: RootState) => state.user.isLoggedIn;
export const selectUser = (state: RootState) => state.user;

export const { updateUserData, resetUserData, toggleUserLogin } =
  userSlice.actions;
export default userSlice.reducer;
