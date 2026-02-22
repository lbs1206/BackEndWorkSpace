import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ErdWorkspacePayload } from "../types";

type ErdEditorState = {
  workspace: ErdWorkspacePayload;
  selectedProjectId: string | null;
  status: string;
};

const initialState: ErdEditorState = {
  workspace: { projects: [], folders: [] },
  selectedProjectId: null,
  status: "Loading editor...",
};

export const erdEditorSlice = createSlice({
  name: "erdEditor",
  initialState,
  reducers: {
    setErdWorkspace(state, action: PayloadAction<ErdWorkspacePayload>) {
      state.workspace = action.payload;
    },
    setErdSelectedProjectId(state, action: PayloadAction<string | null>) {
      state.selectedProjectId = action.payload;
    },
    setErdStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
    },
    resetErdEditor() {
      return initialState;
    },
  },
});

export const { setErdWorkspace, setErdSelectedProjectId, setErdStatus, resetErdEditor } =
  erdEditorSlice.actions;
