import type { ApiDocFolder, ApiDocKeyValue, ApiDocResponse, AuthType, HttpMethod } from "../../store/types";

export type FolderNode = { folder: ApiDocFolder; children: FolderNode[] };
export type RowKind = "headers" | "params";

export const METHOD_OPTIONS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
export const AUTH_OPTIONS: AuthType[] = ["none", "bearer", "apiKey", "basic"];

export function buildFolderTree(folders: ApiDocFolder[]): FolderNode[] {
  const byParent = new Map<string | null, ApiDocFolder[]>();
  folders.forEach((folder) => {
    const key = folder.parentFolderId ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), folder]);
  });
  const build = (parentId: string | null): FolderNode[] =>
    (byParent.get(parentId) ?? []).map((folder) => ({ folder, children: build(folder.id) }));
  return build(null);
}

export function flattenFolderOptions(nodes: FolderNode[], depth = 0): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.folder.id, label: `${"  ".repeat(depth)}${node.folder.name}` },
    ...flattenFolderOptions(node.children, depth + 1),
  ]);
}

export function createRow(key = "", value = ""): ApiDocKeyValue {
  return { id: crypto.randomUUID(), key, value, enabled: true };
}

export function createResponse(statusCode = 200): ApiDocResponse {
  return {
    id: crypto.randomUUID(),
    statusCode,
    title: String(statusCode),
    description: "",
    bodyJson: "{\n  \n}",
  };
}
