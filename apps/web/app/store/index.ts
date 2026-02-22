import { configureStore } from "@reduxjs/toolkit";
import { apiDocEditorSlice } from "./slices/api-doc-editor-slice";
import { apiDocViewerSlice } from "./slices/api-doc-viewer-slice";
import { erdEditorSlice } from "./slices/erd-editor-slice";

export const store = configureStore({
  reducer: {
    apiDocEditor: apiDocEditorSlice.reducer,
    apiDocViewer: apiDocViewerSlice.reducer,
    erdEditor: erdEditorSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
