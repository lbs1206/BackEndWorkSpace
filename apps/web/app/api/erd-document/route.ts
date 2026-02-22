import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type ErdProject = {
  id: string;
  title: string;
  folderId: string | null;
  value: string;
  createdAt: string;
  updatedAt: string;
};

type ErdFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ErdWorkspace = {
  version: 1;
  projects: ErdProject[];
  folders: ErdFolder[];
};

const DATA_DIR = path.join(process.cwd(), ".local-data");
const LEGACY_DOCUMENT_PATH = path.join(DATA_DIR, "erd-document.json");
const WORKSPACE_PATH = path.join(DATA_DIR, "erd-workspace.json");

type CreatePayload =
  | { type: "project"; title?: string; folderId?: string | null }
  | { type: "folder"; name?: string; parentFolderId?: string | null };

type UpdatePayload =
  | { type: "project"; id: string; title?: string; folderId?: string | null }
  | { type: "folder"; id: string; name?: string; parentFolderId?: string | null }
  | { type: "project-content"; id: string; value?: string };

type DeletePayload =
  | { type: "project"; id: string }
  | { type: "folder"; id: string };

function nowIso(): string {
  return new Date().toISOString();
}

function createDefaultProject(): ErdProject {
  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    title: "Untitled ERD",
    folderId: null,
    value: "",
    createdAt: now,
    updatedAt: now,
  };
}

function hasFolderCycle(
  folders: ErdFolder[],
  folderId: string,
  nextParentFolderId: string | null,
): boolean {
  if (!nextParentFolderId) return false;
  let cursor: string | null = nextParentFolderId;
  while (cursor) {
    if (cursor === folderId) return true;
    const parent = folders.find((folder) => folder.id === cursor);
    cursor = parent?.parentFolderId ?? null;
  }
  return false;
}

async function readLegacyDocument(): Promise<string | null> {
  try {
    const raw = await readFile(LEGACY_DOCUMENT_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<{ value: string }>;
    return typeof parsed.value === "string" ? parsed.value : "";
  } catch {
    return null;
  }
}

function sanitizeWorkspace(data: unknown): ErdWorkspace {
  const source = data as Partial<ErdWorkspace>;
  const projects = Array.isArray(source.projects) ? source.projects : [];
  const folders = Array.isArray(source.folders) ? source.folders : [];

  const mappedFolders = folders
    .map((folder) => {
      const item = folder as Partial<ErdFolder>;
      if (typeof item.id !== "string" || item.id.length === 0) return null;
      const timestamp = nowIso();
      return {
        id: item.id,
        name:
          typeof item.name === "string" && item.name.trim().length > 0
            ? item.name.trim()
            : "Untitled Folder",
        parentFolderId: null,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : timestamp,
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : timestamp,
      };
    });
  const safeFolders: ErdFolder[] = [];
  for (const folder of mappedFolders) {
    if (folder) safeFolders.push(folder);
  }

  const folderIds = new Set(safeFolders.map((folder) => folder.id));
  for (const folder of safeFolders) {
    const raw = folders.find((item) => (item as Partial<ErdFolder>).id === folder.id) as
      | Partial<ErdFolder>
      | undefined;
    const nextParentFolderId =
      typeof raw?.parentFolderId === "string" && folderIds.has(raw.parentFolderId)
        ? raw.parentFolderId
        : null;
    folder.parentFolderId =
      nextParentFolderId && !hasFolderCycle(safeFolders, folder.id, nextParentFolderId)
        ? nextParentFolderId
        : null;
  }
  const safeProjects: ErdProject[] = projects
    .map((project) => {
      const item = project as Partial<ErdProject>;
      if (typeof item.id !== "string" || item.id.length === 0) return null;
      const timestamp = nowIso();
      const folderId =
        typeof item.folderId === "string" && folderIds.has(item.folderId)
          ? item.folderId
          : null;
      return {
        id: item.id,
        title:
          typeof item.title === "string" && item.title.trim().length > 0
            ? item.title.trim()
            : "Untitled ERD",
        folderId,
        value: typeof item.value === "string" ? item.value : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : timestamp,
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : timestamp,
      };
    })
    .filter((item): item is ErdProject => item !== null);

  return {
    version: 1,
    folders: safeFolders,
    projects: safeProjects.length > 0 ? safeProjects : [createDefaultProject()],
  };
}

async function readWorkspace(): Promise<ErdWorkspace> {
  try {
    const raw = await readFile(WORKSPACE_PATH, "utf8");
    return sanitizeWorkspace(JSON.parse(raw));
  } catch {
    const legacyValue = await readLegacyDocument();
    const fallback = createDefaultProject();
    if (legacyValue !== null) {
      fallback.value = legacyValue;
    }
    return {
      version: 1,
      folders: [],
      projects: [fallback],
    };
  }
}

async function saveWorkspace(workspace: ErdWorkspace): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(WORKSPACE_PATH, JSON.stringify(workspace, null, 2), "utf8");
}

export async function GET() {
  const workspace = await readWorkspace();
  return NextResponse.json(workspace);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreatePayload>;
  const workspace = await readWorkspace();
  const timestamp = nowIso();

  if (body.type === "folder") {
    const name =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : "Untitled Folder";
    const created: ErdFolder = {
      id: crypto.randomUUID(),
      name,
      parentFolderId:
        typeof body.parentFolderId === "string" &&
        workspace.folders.some((folder) => folder.id === body.parentFolderId)
          ? body.parentFolderId
          : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    workspace.folders.push(created);
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true, folder: created });
  }

  if (body.type === "project") {
    const validFolderIds = new Set(workspace.folders.map((folder) => folder.id));
    const folderId =
      typeof body.folderId === "string" && validFolderIds.has(body.folderId)
        ? body.folderId
        : null;
    const title =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : "Untitled ERD";
    const created: ErdProject = {
      id: crypto.randomUUID(),
      title,
      folderId,
      value: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    workspace.projects.push(created);
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true, project: created });
  }

  return NextResponse.json({ ok: false, message: "Invalid request payload." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<UpdatePayload>;
  const workspace = await readWorkspace();
  const timestamp = nowIso();

  if (body.type === "folder" && typeof body.id === "string") {
    const folder = workspace.folders.find((item) => item.id === body.id);
    if (!folder) {
      return NextResponse.json({ ok: false, message: "Folder not found." }, { status: 404 });
    }

    folder.name =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : folder.name;
    if (body.parentFolderId === null) {
      folder.parentFolderId = null;
    } else if (typeof body.parentFolderId === "string") {
      const parentExists = workspace.folders.some((item) => item.id === body.parentFolderId);
      folder.parentFolderId =
        parentExists && !hasFolderCycle(workspace.folders, folder.id, body.parentFolderId)
          ? body.parentFolderId
          : null;
    }
    folder.updatedAt = timestamp;
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "project" && typeof body.id === "string") {
    const project = workspace.projects.find((item) => item.id === body.id);
    if (!project) {
      return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
    }

    if (typeof body.title === "string" && body.title.trim().length > 0) {
      project.title = body.title.trim();
    }

    if (body.folderId === null) {
      project.folderId = null;
    } else if (typeof body.folderId === "string") {
      const folderExists = workspace.folders.some((item) => item.id === body.folderId);
      project.folderId = folderExists ? body.folderId : null;
    }

    project.updatedAt = timestamp;
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "project-content" && typeof body.id === "string") {
    const project = workspace.projects.find((item) => item.id === body.id);
    if (!project) {
      return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
    }

    project.value = typeof body.value === "string" ? body.value : "";
    project.updatedAt = timestamp;
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "Invalid request payload." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as Partial<DeletePayload>;
  const workspace = await readWorkspace();

  if (body.type === "folder" && typeof body.id === "string") {
    const exists = workspace.folders.some((folder) => folder.id === body.id);
    if (!exists) {
      return NextResponse.json({ ok: false, message: "Folder not found." }, { status: 404 });
    }

    workspace.folders = workspace.folders.filter((folder) => folder.id !== body.id);
    workspace.folders = workspace.folders.map((folder) =>
      folder.parentFolderId === body.id ? { ...folder, parentFolderId: null } : folder,
    );
    workspace.projects = workspace.projects.map((project) =>
      project.folderId === body.id ? { ...project, folderId: null } : project,
    );
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "project" && typeof body.id === "string") {
    const remaining = workspace.projects.filter((project) => project.id !== body.id);
    workspace.projects = remaining.length > 0 ? remaining : [createDefaultProject()];
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "Invalid request payload." }, { status: 400 });
}
