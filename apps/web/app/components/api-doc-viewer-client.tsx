"use client";

import { Alert } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setViewerSelectedEndpointId,
  setViewerSelectedPageId,
  setViewerStatus,
  setViewerWorkspace,
} from "../store/slices/api-doc-viewer-slice";
import type { ApiDocFolder, WorkspacePayload } from "../store/types";

const API_DOC_WORKSPACE_API = process.env.NEXT_PUBLIC_API_DOC_WORKSPACE_API ?? "/api/api-doc-workspace";

type FolderNode = { folder: ApiDocFolder; children: FolderNode[] };

function buildFolderTree(folders: ApiDocFolder[]): FolderNode[] {
  const byParent = new Map<string | null, ApiDocFolder[]>();
  folders.forEach((folder) => {
    const key = folder.parentFolderId ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), folder]);
  });
  const build = (parentId: string | null): FolderNode[] =>
    (byParent.get(parentId) ?? []).map((folder) => ({ folder, children: build(folder.id) }));
  return build(null);
}

export function ApiDocViewerClient() {
  const dispatch = useAppDispatch();
  const { workspace, selectedPageId, selectedEndpointId, status } = useAppSelector(
    (state) => state.apiDocViewer,
  );
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(API_DOC_WORKSPACE_API, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as Partial<WorkspacePayload>;
        const pages = Array.isArray(payload.pages) ? payload.pages : [];
        const folders = Array.isArray(payload.folders) ? payload.folders : [];
        dispatch(setViewerWorkspace({ pages, folders }));
        dispatch(setViewerSelectedPageId(pages[0]?.id ?? null));
        dispatch(setViewerSelectedEndpointId(pages[0]?.endpoints?.[0]?.id ?? null));
        dispatch(setViewerStatus("Viewer ready."));
      } catch {
        dispatch(setViewerStatus("Failed to load documents."));
      }
    };
    void load();
  }, [dispatch]);

  const selectedPage = useMemo(
    () => workspace.pages.find((page) => page.id === selectedPageId) ?? null,
    [workspace.pages, selectedPageId],
  );

  const selectedEndpoint = useMemo(
    () => selectedPage?.endpoints.find((api) => api.id === selectedEndpointId) ?? selectedPage?.endpoints[0] ?? null,
    [selectedPage, selectedEndpointId],
  );

  const folderTree = useMemo(() => buildFolderTree(workspace.folders), [workspace.folders]);
  const ungroupedPages = workspace.pages.filter((page) => page.folderId === null);

  const toggleFolder = (folderId: string) =>
    setCollapsedFolderIds((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]));

  const renderFolder = (node: FolderNode, depth = 0) => {
    const folderId = node.folder.id;
    const isCollapsed = collapsedFolderIds.includes(folderId);
    const pages = workspace.pages.filter((page) => page.folderId === folderId);
    return (
      <div key={folderId} className="api-doc-group" style={{ marginLeft: depth * 10 }}>
        <div className="api-doc-group-head">
          <button type="button" className="api-doc-folder-toggle" onClick={() => toggleFolder(folderId)}>
            <span>{isCollapsed ? ">" : "v"}</span>
            <span className="api-doc-group-title">{node.folder.name}</span>
          </button>
        </div>
        {!isCollapsed && (
          <>
            {pages.map((page) => (
              <div key={page.id} className="api-doc-project-row">
                <button
                  type="button"
                  className={`api-doc-project-item ${page.id === selectedPageId ? "active" : ""}`}
                  onClick={() => {
                    dispatch(setViewerSelectedPageId(page.id));
                    dispatch(setViewerSelectedEndpointId(page.endpoints[0]?.id ?? null));
                  }}
                >
                  {page.title}
                </button>
              </div>
            ))}
            {node.children.map((child) => renderFolder(child, depth + 1))}
          </>
        )}
      </div>
    );
  };

  return (
    <section className="api-doc-shell">
      <Alert severity="info" variant="outlined">{status}</Alert>
      <div className="api-doc-layout">
        <aside className="api-doc-sidebar">
          <div className="api-doc-group">
            <div className="api-doc-group-title">Ungrouped</div>
            {ungroupedPages.map((page) => (
              <div key={page.id} className="api-doc-project-row">
                <button
                  type="button"
                  className={`api-doc-project-item ${page.id === selectedPageId ? "active" : ""}`}
                  onClick={() => {
                    dispatch(setViewerSelectedPageId(page.id));
                    dispatch(setViewerSelectedEndpointId(page.endpoints[0]?.id ?? null));
                  }}
                >
                  {page.title}
                </button>
              </div>
            ))}
          </div>
          {folderTree.map((node) => renderFolder(node))}
        </aside>

        <div className="api-doc-main">
          <section className="api-doc-selected-api api-doc-interface-list-pane">
            <div className="api-doc-api-list-head">
              <h3>API Interfaces</h3>
            </div>
            {selectedPage ? (
              <div className="api-doc-api-list">
                {selectedPage.endpoints.map((api) => (
                  <button
                    key={api.id}
                    type="button"
                    className={`api-doc-project-item ${api.id === selectedEndpoint?.id ? "active" : ""}`}
                    onClick={() => dispatch(setViewerSelectedEndpointId(api.id))}
                  >
                    {api.method} {api.name}
                  </button>
                ))}
              </div>
            ) : (
              <section className="api-doc-empty">No document yet.</section>
            )}
          </section>

          <aside className="api-doc-preview-pane">
            {selectedPage && selectedEndpoint ? (
              <section className="api-doc-preview">
                <div className="spotlight-head">
                  <span className={`spotlight-method method-${selectedEndpoint.method.toLowerCase()}`}>
                    {selectedEndpoint.method}
                  </span>
                  <code>{selectedPage.baseUrl}{selectedEndpoint.urlPath}</code>
                  <span className="spotlight-status">{selectedPage.status}</span>
                </div>
                <h2>{selectedEndpoint.name}</h2>
                <p className="spotlight-purpose">{selectedPage.description || "-"}</p>

                <div className="spotlight-section">
                  <h3>Auth</h3>
                  <p>{selectedEndpoint.auth}</p>
                </div>

                <div className="spotlight-section">
                  <h3>Headers</h3>
                  <pre>
                    {selectedEndpoint.headers
                      .filter((row) => row.enabled)
                      .map((row) => `${row.key}: ${row.value}`)
                      .join("\n") || "-"}
                  </pre>
                </div>

                <div className="spotlight-section">
                  <h3>Params</h3>
                  <pre>
                    {selectedEndpoint.params
                      .filter((row) => row.enabled)
                      .map((row) => `${row.key}=${row.value}`)
                      .join("\n") || "-"}
                  </pre>
                </div>

                <div className="spotlight-section">
                  <h3>Body JSON</h3>
                  <pre>{selectedEndpoint.bodyJson || "-"}</pre>
                </div>

                <div className="spotlight-section">
                  <h3>Responses</h3>
                  <pre>
                    {selectedEndpoint.responses
                      .map((response) => `[${response.statusCode}] ${response.title}\n${response.bodyJson}`)
                      .join("\n\n") || "-"}
                  </pre>
                </div>

                <div className="spotlight-section">
                  <h3>Notes</h3>
                  <pre>{selectedEndpoint.notes || "-"}</pre>
                </div>
              </section>
            ) : selectedPage ? (
              <section className="api-doc-empty">이 페이지에 API Interface가 없습니다.</section>
            ) : (
              <section className="api-doc-empty">No document yet.</section>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
