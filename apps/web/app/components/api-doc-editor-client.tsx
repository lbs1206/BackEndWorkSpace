"use client";

import { Alert } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setOpenEndpointIds,
  setPreviewEndpointId,
  setSelectedPageId,
  setStatus,
  setWorkspace,
} from "../store/slices/api-doc-editor-slice";
import type {
  ApiDocEndpoint,
  ApiDocFolder,
  ApiDocKeyValue,
  ApiDocPage,
  ApiDocResponse,
  WorkspacePayload,
} from "../store/types";
import { ApiDocEditorPage } from "./api-doc-editor/page-editor";
import { ApiDocEditorPreview } from "./api-doc-editor/preview-pane";
import { ApiDocEditorSidebar } from "./api-doc-editor/sidebar";
import { buildFolderTree, flattenFolderOptions, type RowKind } from "./api-doc-editor/utils";

const API_DOC_WORKSPACE_API = process.env.NEXT_PUBLIC_API_DOC_WORKSPACE_API ?? "/api/api-doc-workspace";

export function ApiDocEditorClient() {
  const dispatch = useAppDispatch();
  const { workspace, selectedPageId, previewEndpointId, openEndpointIds, status } = useAppSelector(
    (state) => state.apiDocEditor,
  );
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<string[]>([]);
  const workspaceRef = useRef(workspace);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const selectedPage = useMemo(
    () => workspace.pages.find((page) => page.id === selectedPageId) ?? null,
    [workspace.pages, selectedPageId],
  );

  const previewEndpoint = useMemo(() => {
    if (!selectedPage) return null;
    return selectedPage.endpoints.find((endpoint) => endpoint.id === previewEndpointId) ?? selectedPage.endpoints[0] ?? null;
  }, [selectedPage, previewEndpointId]);

  const folderTree = useMemo(() => buildFolderTree(workspace.folders), [workspace.folders]);
  const folderOptions = useMemo(() => flattenFolderOptions(folderTree), [folderTree]);
  const ungroupedPages = workspace.pages.filter((page) => page.folderId === null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(API_DOC_WORKSPACE_API, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as Partial<WorkspacePayload>;
        const pages = Array.isArray(payload.pages) ? payload.pages : [];
        const folders = Array.isArray(payload.folders) ? payload.folders : [];
        const firstPageId = pages[0]?.id ?? null;
        const firstEndpointId = pages[0]?.endpoints?.[0]?.id ?? null;
        dispatch(setWorkspace({ pages, folders }));
        dispatch(setSelectedPageId(firstPageId));
        dispatch(setPreviewEndpointId(firstEndpointId));
        dispatch(setOpenEndpointIds(firstEndpointId ? [firstEndpointId] : []));
        dispatch(setStatus("API DOC editor ready."));
      } catch {
        dispatch(setStatus("Failed to load API DOC workspace."));
      }
    };
    void load();
  }, [dispatch]);

  useEffect(() => {
    if (!selectedPage) return;
    const endpointIds = selectedPage.endpoints.map((endpoint) => endpoint.id);
    if (endpointIds.length === 0) return;

    if (!previewEndpointId || !endpointIds.includes(previewEndpointId)) {
      dispatch(setPreviewEndpointId(endpointIds[0]));
    }

    const safeOpenIds = openEndpointIds.filter((id) => endpointIds.includes(id));
    if (safeOpenIds.length !== openEndpointIds.length) {
      dispatch(setOpenEndpointIds(safeOpenIds));
    }
  }, [dispatch, openEndpointIds, previewEndpointId, selectedPage]);

  const applyWorkspace = (updater: (prev: WorkspacePayload) => WorkspacePayload) => {
    dispatch(setWorkspace(updater(workspaceRef.current)));
  };

  const setPageSelection = (page: ApiDocPage) => {
    const firstEndpointId = page.endpoints[0]?.id ?? null;
    dispatch(setSelectedPageId(page.id));
    dispatch(setPreviewEndpointId(firstEndpointId));
    dispatch(setOpenEndpointIds(firstEndpointId ? [firstEndpointId] : []));
  };

  const createFolder = async (parentFolderId: string | null) => {
    const name = (window.prompt("New group name", "Group") ?? "").trim();
    if (!name) return;
    const response = await fetch(API_DOC_WORKSPACE_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "folder", name, parentFolderId }),
    });
    if (!response.ok) return dispatch(setStatus("Group create failed."));
    const data = (await response.json()) as { folder: ApiDocFolder };
    applyWorkspace((prev) => ({ ...prev, folders: [...prev.folders, data.folder] }));
  };

  const createPage = async (folderId: string | null) => {
    const title = (window.prompt("New page title", "API Page") ?? "").trim();
    if (!title) return;
    const response = await fetch(API_DOC_WORKSPACE_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "page", title, folderId }),
    });
    if (!response.ok) return dispatch(setStatus("Page create failed."));
    const data = (await response.json()) as { page: ApiDocPage };
    applyWorkspace((prev) => ({ ...prev, pages: [...prev.pages, data.page] }));
    setPageSelection(data.page);
  };

  const createEndpoint = async () => {
    if (!selectedPage) return;
    const name = (window.prompt("New API name", "New API") ?? "").trim();
    if (!name) return;

    const response = await fetch(API_DOC_WORKSPACE_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "endpoint", pageId: selectedPage.id, name }),
    });
    if (!response.ok) return dispatch(setStatus("API create failed."));

    const data = (await response.json()) as { endpoint: ApiDocEndpoint };
    applyWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((page) =>
        page.id === selectedPage.id ? { ...page, endpoints: [...page.endpoints, data.endpoint] } : page,
      ),
    }));
    dispatch(setPreviewEndpointId(data.endpoint.id));
    dispatch(setOpenEndpointIds([...openEndpointIds, data.endpoint.id]));
  };

  const patchSelectedPage = async (patch: Partial<Pick<ApiDocPage, "title" | "folderId" | "baseUrl" | "status" | "description">>) => {
    if (!selectedPage) return;
    const nextPage = { ...selectedPage, ...patch };
    applyWorkspace((prev) => ({ ...prev, pages: prev.pages.map((page) => (page.id === selectedPage.id ? nextPage : page)) }));

    await fetch(API_DOC_WORKSPACE_API, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "page",
        id: selectedPage.id,
        title: nextPage.title,
        folderId: nextPage.folderId,
        baseUrl: nextPage.baseUrl,
        status: nextPage.status,
        description: nextPage.description,
      }),
    });
  };

  const patchEndpoint = async (endpointId: string, patch: Partial<ApiDocEndpoint>) => {
    if (!selectedPage) return;
    const endpoint = selectedPage.endpoints.find((item) => item.id === endpointId);
    if (!endpoint) return;

    const nextEndpoint = { ...endpoint, ...patch };
    applyWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((page) =>
        page.id !== selectedPage.id
          ? page
          : {
              ...page,
              endpoints: page.endpoints.map((item) => (item.id === endpointId ? nextEndpoint : item)),
            },
      ),
    }));

    await fetch(API_DOC_WORKSPACE_API, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "endpoint", pageId: selectedPage.id, id: endpointId, ...patch }),
    });
  };

  const patchEndpointRows = async (endpointId: string, kind: RowKind, rows: ApiDocKeyValue[]) => {
    await patchEndpoint(endpointId, { [kind]: rows } as Pick<ApiDocEndpoint, RowKind>);
  };

  const patchEndpointResponses = async (endpointId: string, responses: ApiDocResponse[]) => {
    await patchEndpoint(endpointId, { responses });
  };

  const deleteEndpoint = async (endpointId: string) => {
    if (!selectedPage) return;
    const ok = window.confirm("이 API Interface를 삭제하시겠습니까?");
    if (!ok) return;

    const response = await fetch(API_DOC_WORKSPACE_API, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "endpoint", pageId: selectedPage.id, id: endpointId }),
    });
    if (!response.ok) {
      dispatch(setStatus("API delete failed."));
      return;
    }

    const reload = await fetch(API_DOC_WORKSPACE_API, { cache: "no-store" });
    if (!reload.ok) {
      dispatch(setStatus("API deleted, but failed to refresh workspace."));
      return;
    }
    const payload = (await reload.json()) as Partial<WorkspacePayload>;
    const pages = Array.isArray(payload.pages) ? payload.pages : [];
    const folders = Array.isArray(payload.folders) ? payload.folders : [];
    const currentPage = pages.find((page) => page.id === selectedPage.id) ?? pages[0] ?? null;
    const nextPreviewEndpointId = currentPage?.endpoints[0]?.id ?? null;
    dispatch(setWorkspace({ pages, folders }));
    dispatch(setSelectedPageId(currentPage?.id ?? null));
    dispatch(setPreviewEndpointId(nextPreviewEndpointId));
    dispatch(setOpenEndpointIds(nextPreviewEndpointId ? [nextPreviewEndpointId] : []));
    dispatch(setStatus("API deleted."));
  };

  const toggleFolder = (folderId: string) => {
    setCollapsedFolderIds((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]));
  };

  const toggleEndpointOpen = (endpointId: string) => {
    const nextOpenIds = openEndpointIds.includes(endpointId)
      ? openEndpointIds.filter((id) => id !== endpointId)
      : [...openEndpointIds, endpointId];
    dispatch(setOpenEndpointIds(nextOpenIds));
    dispatch(setPreviewEndpointId(endpointId));
  };

  const selectEndpointForPreview = (endpointId: string) => {
    dispatch(setPreviewEndpointId(endpointId));
    if (!openEndpointIds.includes(endpointId)) {
      dispatch(setOpenEndpointIds([...openEndpointIds, endpointId]));
    }
  };

  return (
    <section className="api-doc-shell">
      <Alert severity="info" variant="outlined">{status}</Alert>
      <div className="api-doc-layout">
        <ApiDocEditorSidebar
          workspace={workspace}
          selectedPageId={selectedPageId}
          ungroupedPages={ungroupedPages}
          folderTree={folderTree}
          collapsedFolderIds={collapsedFolderIds}
          onToggleFolder={toggleFolder}
          onCreatePage={createPage}
          onCreateFolder={createFolder}
          onSelectPage={setPageSelection}
        />

        <div className="api-doc-main">
          {selectedPage ? (
            <ApiDocEditorPage
              selectedPage={selectedPage}
              folderOptions={folderOptions}
              openEndpointIds={openEndpointIds}
              onPatchSelectedPage={patchSelectedPage}
              onCreateEndpoint={createEndpoint}
              onToggleEndpointOpen={toggleEndpointOpen}
              onSelectEndpointForPreview={selectEndpointForPreview}
              onPatchEndpoint={patchEndpoint}
              onPatchEndpointRows={patchEndpointRows}
              onPatchEndpointResponses={patchEndpointResponses}
              onDeleteEndpoint={deleteEndpoint}
            />
          ) : (
            <section className="api-doc-empty">Create a page and API to start editing.</section>
          )}

          <ApiDocEditorPreview
            selectedPage={selectedPage}
            previewEndpoint={previewEndpoint}
          />
        </div>
      </div>
    </section>
  );
}
