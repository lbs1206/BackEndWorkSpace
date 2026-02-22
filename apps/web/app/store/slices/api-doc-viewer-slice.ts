import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { WorkspacePayload } from "../types";

type ApiDocViewerState = {
  workspace: WorkspacePayload;
  selectedPageId: string | null;
  selectedEndpointId: string | null;
  status: string;
};

const initialState: ApiDocViewerState = {
  workspace: { pages: [], folders: [] },
  selectedPageId: null,
  selectedEndpointId: null,
  status: "Loading documents...",
};

export const apiDocViewerSlice = createSlice({
  name: "apiDocViewer",
  initialState,
  reducers: {
    setViewerWorkspace(state, action: PayloadAction<WorkspacePayload>) {
      state.workspace = action.payload;
    },
    setViewerSelectedPageId(state, action: PayloadAction<string | null>) {
      state.selectedPageId = action.payload;
    },
    setViewerSelectedEndpointId(state, action: PayloadAction<string | null>) {
      state.selectedEndpointId = action.payload;
    },
    setViewerStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
    },
    resetApiDocViewer() {
      return initialState;
    },
  },
});

export const {
  setViewerWorkspace,
  setViewerSelectedPageId,
  setViewerSelectedEndpointId,
  setViewerStatus,
  resetApiDocViewer,
} = apiDocViewerSlice.actions;
