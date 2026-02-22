"use client";

import { Alert } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setErdSelectedProjectId,
  setErdStatus,
  setErdWorkspace,
} from "../store/slices/erd-editor-slice";
import type { ErdFolder, ErdProject, ErdWorkspacePayload } from "../store/types";

const ERD_EDITOR_CDN_URL = "https://esm.sh/@dineug/erd-editor";
const SCRIPT_ID = "erd-editor-runtime";
const ERD_DOCUMENT_API = process.env.NEXT_PUBLIC_ERD_DOCUMENT_API ?? "http://localhost:8080/api/erd-document";

type FolderNode = {
  folder: ErdFolder;
  children: FolderNode[];
};

function ensureEditorScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "module";
    script.src = ERD_EDITOR_CDN_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load erd-editor runtime"));
    document.head.appendChild(script);
  });
}

function buildFolderTree(folders: ErdFolder[]): FolderNode[] {
  const byParent = new Map<string | null, ErdFolder[]>();
  for (const folder of folders) {
    const key = folder.parentFolderId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(folder);
    byParent.set(key, list);
  }

  const build = (parentFolderId: string | null): FolderNode[] => {
    const current = byParent.get(parentFolderId) ?? [];
    return current
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({
        folder,
        children: build(folder.id),
      }));
  };

  return build(null);
}

function flattenFolderOptions(nodes: FolderNode[], depth = 0): Array<{ id: string; label: string }> {
  const rows: Array<{ id: string; label: string }> = [];
  for (const node of nodes) {
    rows.push({ id: node.folder.id, label: `${"  ".repeat(depth)}${node.folder.name}` });
    rows.push(...flattenFolderOptions(node.children, depth + 1));
  }
  return rows;
}

export function ErdEditorClient() {
  const dispatch = useAppDispatch();
  const { workspace, selectedProjectId, status } = useAppSelector((state) => state.erdEditor);

  const editorRef = useRef<ErdEditorElement | null>(null);
  const contentSaveTimerRef = useRef<number | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const skipNextChangeRef = useRef(false);
  const selectedProjectIdRef = useRef<string | null>(null);
  const workspaceRef = useRef<ErdWorkspacePayload>(workspace);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<string[]>([]);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    setCollapsedFolderIds((prev) => prev.filter((id) => workspace.folders.some((folder) => folder.id === id)));
  }, [workspace.folders]);

  const applyWorkspace = (updater: (prev: ErdWorkspacePayload) => ErdWorkspacePayload) => {
    dispatch(setErdWorkspace(updater(workspaceRef.current)));
  };

  const selectedProject = workspace.projects.find((project) => project.id === selectedProjectId) ?? null;

  const folderTree = useMemo(() => buildFolderTree(workspace.folders), [workspace.folders]);
  const folderOptions = useMemo(() => flattenFolderOptions(folderTree), [folderTree]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await ensureEditorScript();
        const response = await fetch(ERD_DOCUMENT_API, { cache: "no-store" });
        if (!response.ok || !mounted) {
          if (mounted) dispatch(setErdStatus("Failed to load ERD workspace."));
          return;
        }

        const payload = (await response.json()) as Partial<ErdWorkspacePayload>;
        const projects = Array.isArray(payload.projects) ? payload.projects : [];
        const folders = Array.isArray(payload.folders) ? payload.folders : [];
        dispatch(setErdWorkspace({ projects, folders }));

        const firstProject = projects[0] ?? null;
        dispatch(setErdSelectedProjectId(firstProject?.id ?? null));

        if (firstProject && editorRef.current) {
          skipNextChangeRef.current = true;
          editorRef.current.value = firstProject.value ?? "";
        }

        dispatch(setErdStatus("Editor ready."));
      } catch {
        if (mounted) {
          dispatch(setErdStatus("Failed to initialize editor."));
        }
      }
    };

    void initialize();

    return () => {
      mounted = false;
      if (contentSaveTimerRef.current) {
        window.clearTimeout(contentSaveTimerRef.current);
      }
      if (titleSaveTimerRef.current) {
        window.clearTimeout(titleSaveTimerRef.current);
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (!editorRef.current || !selectedProjectId) return;
    const project = workspace.projects.find((item) => item.id === selectedProjectId);
    if (!project) return;

    skipNextChangeRef.current = true;
    editorRef.current.value = project.value ?? "";
  }, [selectedProjectId, workspace.projects]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleChange = () => {
      if (skipNextChangeRef.current) {
        skipNextChangeRef.current = false;
        return;
      }

      const projectId = selectedProjectIdRef.current;
      if (!projectId || !editorRef.current) return;
      const value = editorRef.current.value ?? "";

      applyWorkspace((prev) => ({
        ...prev,
        projects: prev.projects.map((project) =>
          project.id === projectId ? { ...project, value } : project,
        ),
      }));

      if (contentSaveTimerRef.current) {
        window.clearTimeout(contentSaveTimerRef.current);
      }

      dispatch(setErdStatus("Saving diagram..."));
      contentSaveTimerRef.current = window.setTimeout(async () => {
        try {
          await fetch(ERD_DOCUMENT_API, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "project-content", id: projectId, value }),
          });
          dispatch(setErdStatus("Saved."));
        } catch {
          dispatch(setErdStatus("Save failed."));
        }
      }, 800);
    };

    editor.addEventListener("change", handleChange);
    return () => {
      editor.removeEventListener("change", handleChange);
    };
  }, [dispatch]);

  const createProject = async (folderId: string | null = null) => {
    const input = window.prompt("New project title", "Untitled ERD");
    if (input === null) return;

    const title = input.trim() || "Untitled ERD";
    try {
      const response = await fetch(ERD_DOCUMENT_API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "project", title, folderId }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { project: ErdProject };
      applyWorkspace((prev) => ({ ...prev, projects: [...prev.projects, data.project] }));
      dispatch(setErdSelectedProjectId(data.project.id));
      dispatch(setErdStatus("Project created."));
    } catch {
      dispatch(setErdStatus("Failed to create project."));
    }
  };

  const deleteProject = async (projectId: string) => {
    const confirmed = window.confirm("Delete this ERD project?");
    if (!confirmed) return;
    try {
      const response = await fetch(ERD_DOCUMENT_API, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "project", id: projectId }),
      });
      if (!response.ok) throw new Error();

      applyWorkspace((prev) => {
        const remaining = prev.projects.filter((project) => project.id !== projectId);
        const fallback = remaining[0]?.id ?? null;
        if (selectedProjectIdRef.current === projectId) {
          dispatch(setErdSelectedProjectId(fallback));
        }
        return { ...prev, projects: remaining };
      });
      dispatch(setErdStatus("Project deleted."));
    } catch {
      dispatch(setErdStatus("Failed to delete project."));
    }
  };

  const createFolder = async (parentFolderId: string | null = null) => {
    const input = window.prompt("New folder name", "Database");
    if (input === null) return;
    const name = input.trim() || "Untitled Folder";
    try {
      const response = await fetch(ERD_DOCUMENT_API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "folder", name, parentFolderId }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { folder: ErdFolder };
      applyWorkspace((prev) => ({ ...prev, folders: [...prev.folders, data.folder] }));
      dispatch(setErdStatus("Folder created."));
    } catch {
      dispatch(setErdStatus("Failed to create folder."));
    }
  };

  const deleteFolder = async (folderId: string) => {
    const confirmed = window.confirm(
      "Delete this folder? Child folders will move to root and projects in this folder move to Ungrouped.",
    );
    if (!confirmed) return;
    try {
      const response = await fetch(ERD_DOCUMENT_API, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "folder", id: folderId }),
      });
      if (!response.ok) throw new Error();
      applyWorkspace((prev) => ({
        projects: prev.projects.map((project) =>
          project.folderId === folderId ? { ...project, folderId: null } : project,
        ),
        folders: prev.folders
          .filter((folder) => folder.id !== folderId)
          .map((folder) =>
            folder.parentFolderId === folderId ? { ...folder, parentFolderId: null } : folder,
          ),
      }));
      dispatch(setErdStatus("Folder deleted."));
    } catch {
      dispatch(setErdStatus("Failed to delete folder."));
    }
  };

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId],
    );
  };

  const changeProjectTitle = (title: string) => {
    if (!selectedProjectId) return;
    const currentProject = workspaceRef.current.projects.find((project) => project.id === selectedProjectId);
    applyWorkspace((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === selectedProjectId ? { ...project, title } : project,
      ),
    }));

    if (titleSaveTimerRef.current) {
      window.clearTimeout(titleSaveTimerRef.current);
    }

    titleSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch(ERD_DOCUMENT_API, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "project",
            id: selectedProjectId,
            title: title.trim() || "Untitled ERD",
            folderId: currentProject?.folderId ?? null,
          }),
        });
        dispatch(setErdStatus("Project title saved."));
      } catch {
        dispatch(setErdStatus("Failed to save project title."));
      }
    }, 500);
  };

  const changeProjectFolder = async (projectId: string, folderId: string) => {
    const nextFolderId = folderId.length > 0 ? folderId : null;
    applyWorkspace((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === projectId ? { ...project, folderId: nextFolderId } : project,
      ),
    }));

    try {
      await fetch(ERD_DOCUMENT_API, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "project",
          id: projectId,
          folderId: nextFolderId,
        }),
      });
      dispatch(setErdStatus("Project folder updated."));
    } catch {
      dispatch(setErdStatus("Failed to update folder."));
    }
  };

  const ungroupedProjects = workspace.projects.filter((project) => project.folderId === null);

  const renderFolderNode = (node: FolderNode, depth = 0) => {
    const folderId = node.folder.id;
    const isCollapsed = collapsedFolderIds.includes(folderId);
    const projects = workspace.projects.filter((project) => project.folderId === folderId);

    return (
      <div key={folderId} className="erd-group" style={{ marginLeft: depth * 10 }}>
        <div className="erd-group-head">
          <button type="button" className="erd-folder-toggle" onClick={() => toggleFolderCollapse(folderId)}>
            <span>{isCollapsed ? "▶" : "▼"}</span>
            <span className="erd-group-title">{node.folder.name}</span>
          </button>
          <div className="erd-inline-actions">
            <button type="button" className="erd-mini" onClick={() => createProject(folderId)}>
              + Project
            </button>
            <button type="button" className="erd-mini" onClick={() => createFolder(folderId)}>
              + Folder
            </button>
            <button type="button" className="erd-danger" onClick={() => deleteFolder(folderId)}>
              Delete
            </button>
          </div>
        </div>

        {!isCollapsed ? (
          <>
            {projects.map((project) => (
              <div key={project.id} className="erd-project-row">
                <button
                  type="button"
                  className={`erd-project-item ${project.id === selectedProjectId ? "active" : ""}`}
                  onClick={() => dispatch(setErdSelectedProjectId(project.id))}
                >
                  {project.title}
                </button>
                <button type="button" className="erd-danger" onClick={() => deleteProject(project.id)}>
                  Delete
                </button>
              </div>
            ))}
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <section className="erd-shell">
      <Alert severity="info" variant="outlined">{status}</Alert>
      <div className="erd-layout">
        <aside className="erd-sidebar">
          <div className="erd-sidebar-actions">
            <button type="button" onClick={() => createProject(null)}>
              + New Project
            </button>
            <button type="button" onClick={() => createFolder(null)}>
              + Root Folder
            </button>
          </div>

          <div className="erd-group">
            <div className="erd-group-title">Ungrouped</div>
            {ungroupedProjects.map((project) => (
              <div key={project.id} className="erd-project-row">
                <button
                  type="button"
                  className={`erd-project-item ${project.id === selectedProjectId ? "active" : ""}`}
                  onClick={() => dispatch(setErdSelectedProjectId(project.id))}
                >
                  {project.title}
                </button>
                <button type="button" className="erd-danger" onClick={() => deleteProject(project.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>

          {folderTree.map((node) => renderFolderNode(node))}
        </aside>

        <div className="erd-main">
          {selectedProject ? (
            <div className="erd-toolbar">
              <input
                className="erd-title-input"
                value={selectedProject.title}
                onChange={(event) => changeProjectTitle(event.target.value)}
                placeholder="Project title"
              />
              <select
                className="erd-folder-select"
                value={selectedProject.folderId ?? ""}
                onChange={(event) => changeProjectFolder(selectedProject.id, event.target.value)}
              >
                <option value="">Ungrouped</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <erd-editor ref={editorRef} className="erd-element" />
        </div>
      </div>
    </section>
  );
}

