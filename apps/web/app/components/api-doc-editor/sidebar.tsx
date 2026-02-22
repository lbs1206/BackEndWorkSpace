import type { ApiDocPage, WorkspacePayload } from "../../store/types";
import type { FolderNode } from "./utils";

type ApiDocEditorSidebarProps = {
  workspace: WorkspacePayload;
  selectedPageId: string | null;
  ungroupedPages: ApiDocPage[];
  folderTree: FolderNode[];
  collapsedFolderIds: string[];
  onToggleFolder: (folderId: string) => void;
  onCreatePage: (folderId: string | null) => Promise<void>;
  onCreateFolder: (parentFolderId: string | null) => Promise<void>;
  onSelectPage: (page: ApiDocPage) => void;
};

export function ApiDocEditorSidebar({
  workspace,
  selectedPageId,
  ungroupedPages,
  folderTree,
  collapsedFolderIds,
  onToggleFolder,
  onCreatePage,
  onCreateFolder,
  onSelectPage,
}: ApiDocEditorSidebarProps) {
  const renderFolder = (node: FolderNode, depth = 0) => {
    const folderId = node.folder.id;
    const isCollapsed = collapsedFolderIds.includes(folderId);
    const pages = workspace.pages.filter((page) => page.folderId === folderId);
    return (
      <div key={folderId} className="api-doc-group" style={{ marginLeft: depth * 10 }}>
        <div className="api-doc-group-head">
          <button type="button" className="api-doc-folder-toggle" onClick={() => onToggleFolder(folderId)}>
            <span>{isCollapsed ? ">" : "v"}</span>
            <span className="api-doc-group-title">{node.folder.name}</span>
          </button>
          <div className="api-doc-inline-actions">
            <button type="button" className="api-doc-mini" onClick={() => void onCreatePage(folderId)}>+ Page</button>
            <button type="button" className="api-doc-mini" onClick={() => void onCreateFolder(folderId)}>+ Group</button>
          </div>
        </div>
        {!isCollapsed && (
          <>
            {pages.map((page) => (
              <div key={page.id} className="api-doc-project-row">
                <button
                  type="button"
                  className={`api-doc-project-item ${page.id === selectedPageId ? "active" : ""}`}
                  onClick={() => onSelectPage(page)}
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
    <aside className="api-doc-sidebar">
      <div className="api-doc-sidebar-actions">
        <button type="button" onClick={() => void onCreatePage(null)}>+ Page</button>
        <button type="button" onClick={() => void onCreateFolder(null)}>+ Root Group</button>
      </div>

      <div className="api-doc-group">
        <div className="api-doc-group-title">Ungrouped</div>
        {ungroupedPages.map((page) => (
          <div key={page.id} className="api-doc-project-row">
            <button
              type="button"
              className={`api-doc-project-item ${page.id === selectedPageId ? "active" : ""}`}
              onClick={() => onSelectPage(page)}
            >
              {page.title}
            </button>
          </div>
        ))}
      </div>

      {folderTree.map((node) => renderFolder(node))}
    </aside>
  );
}
