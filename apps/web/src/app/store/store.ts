import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { unload } from "swr";
import userReducer from "@app/store/slices/userSlice";
import { onViewerChange } from "@app/store/viewerIdentity";

const rootReducer = combineReducers({
  user: userReducer,
});

const persistConfig = {
  key: "root",
  storage,
  version: 1,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

// Cached API responses belong to whoever fetched them: some hold things only
// that account may see, such as an event's meeting link. When the signed-in
// identity changes, all of them are dropped and the pages on screen fetch
// again. This is the one place that does it.
onViewerChange(store, () => unload());

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
