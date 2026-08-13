import { createSlice } from "@reduxjs/toolkit";

const initialState = { isLoggedIn: false };

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateUserData: (state, action) => {
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

export const selectIsLoggedIn = (state) => state.user.isLoggedIn;
export const selectUser = (state) => state.user;

export const { updateUserData, resetUserData, toggleUserLogin } =
  userSlice.actions;
export default userSlice.reducer;
