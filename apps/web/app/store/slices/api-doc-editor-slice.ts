import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { WorkspacePayload } from "../types";

type ApiDocEditorState = {
  workspace: WorkspacePayload;
  selectedPageId: string | null;
  previewEndpointId: string | null;
  openEndpointIds: string[];
  status: string;
};

const initialState: ApiDocEditorState = {
  workspace: { pages: [], folders: [] },
  selectedPageId: null,
  previewEndpointId: null,
  openEndpointIds: [],
  status: "Loading API DOC workspace...",
};

export const apiDocEditorSlice = createSlice({
  name: "apiDocEditor",
  initialState,
  reducers: {
    setWorkspace(state, action: PayloadAction<WorkspacePayload>) {
      state.workspace = action.payload;
    },
    setSelectedPageId(state, action: PayloadAction<string | null>) {
      state.selectedPageId = action.payload;
    },
    setPreviewEndpointId(state, action: PayloadAction<string | null>) {
      state.previewEndpointId = action.payload;
    },
    setOpenEndpointIds(state, action: PayloadAction<string[]>) {
      state.openEndpointIds = action.payload;
    },
    setStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
    },
    resetApiDocEditor() {
      return initialState;
    },
  },
});

export const {
  setWorkspace,
  setSelectedPageId,
  setPreviewEndpointId,
  setOpenEndpointIds,
  setStatus,
  resetApiDocEditor,
} = apiDocEditorSlice.actions;
