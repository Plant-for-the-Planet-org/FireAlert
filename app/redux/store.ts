import {configureStore} from '@reduxjs/toolkit';

import {loginSlice, siteSlice, alertSlice} from './slices';

export const store = configureStore({
  reducer: {
    loginSlice,
    siteSlice,
    alertSlice,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
