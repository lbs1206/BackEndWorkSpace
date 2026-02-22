import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
type AuthType = "none" | "bearer" | "apiKey" | "basic";

type ApiDocKeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

type ApiDocResponse = {
  id: string;
  statusCode: number;
  title: string;
  description: string;
  bodyJson: string;
};

type ApiDocEndpoint = {
  id: string;
  name: string;
  method: HttpMethod;
  urlPath: string;
  auth: AuthType;
  headers: ApiDocKeyValue[];
  params: ApiDocKeyValue[];
  bodyJson: string;
  responses: ApiDocResponse[];
  notes: string;
};

type ApiDocPage = {
  id: string;
  title: string;
  folderId: string | null;
  baseUrl: string;
  status: "draft" | "review" | "approved" | "deprecated";
  description: string;
  endpoints: ApiDocEndpoint[];
  createdAt: string;
  updatedAt: string;
};

type ApiDocFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiDocWorkspace = {
  version: 2;
  pages: ApiDocPage[];
  folders: ApiDocFolder[];
};

type CreatePayload =
  | { type: "folder"; name?: string; parentFolderId?: string | null }
  | { type: "page"; title?: string; folderId?: string | null }
  | { type: "endpoint"; pageId: string; name?: string };

type UpdatePayload =
  | { type: "folder"; id: string; name?: string; parentFolderId?: string | null }
  | {
      type: "page";
      id: string;
      title?: string;
      folderId?: string | null;
      baseUrl?: string;
      status?: ApiDocPage["status"];
      description?: string;
    }
  | {
      type: "endpoint";
      pageId: string;
      id: string;
      name?: string;
      method?: HttpMethod;
      urlPath?: string;
      auth?: AuthType;
      headers?: ApiDocKeyValue[];
      params?: ApiDocKeyValue[];
      bodyJson?: string;
      responses?: ApiDocResponse[];
      notes?: string;
    };

type DeletePayload =
  | { type: "folder"; id: string }
  | { type: "page"; id: string }
  | { type: "endpoint"; pageId: string; id: string };

type LegacyTemplate = {
  purpose?: string;
  auth?: "none" | "bearer" | "apiKey";
  pathParams?: string;
  queryParams?: string;
  requestHeaders?: string;
  requestBodyExample?: string;
  successResponseExample?: string;
  errorResponseExample?: string;
  frontendNotes?: string;
};

type LegacyProject = {
  id?: string;
  title?: string;
  folderId?: string | null;
  method?: HttpMethod;
  endpointPath?: string;
  status?: ApiDocPage["status"];
  template?: LegacyTemplate;
  createdAt?: string;
  updatedAt?: string;
};

const DATA_DIR = path.join(process.cwd(), ".local-data");
const WORKSPACE_PATH = path.join(DATA_DIR, "api-doc-workspace.json");

function nowIso(): string {
  return new Date().toISOString();
}

function createDefaultRow(key = "", value = ""): ApiDocKeyValue {
  return {
    id: crypto.randomUUID(),
    key,
    value,
    enabled: true,
  };
}

function createDefaultResponse(statusCode = 200): ApiDocResponse {
  return {
    id: crypto.randomUUID(),
    statusCode,
    title: String(statusCode),
    description: "",
    bodyJson: "{\n  \n}",
  };
}

function createDefaultEndpoint(name = "New API"): ApiDocEndpoint {
  return {
    id: crypto.randomUUID(),
    name,
    method: "GET",
    urlPath: "/resource",
    auth: "bearer",
    headers: [createDefaultRow("Content-Type", "application/json")],
    params: [createDefaultRow()],
    bodyJson: "{\n  \n}",
    responses: [createDefaultResponse(200), createDefaultResponse(400)],
    notes: "",
  };
}

function createDefaultPage(): ApiDocPage {
  const timestamp = nowIso();
  return {
    id: crypto.randomUUID(),
    title: "Untitled API Page",
    folderId: null,
    baseUrl: "https://api.example.com",
    status: "draft",
    description: "",
    endpoints: [createDefaultEndpoint("Untitled API")],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function hasFolderCycle(
  folders: ApiDocFolder[],
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

function sanitizeMethod(method: unknown): HttpMethod {
  return method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE" ||
    method === "HEAD" ||
    method === "OPTIONS"
    ? method
    : "GET";
}

function sanitizeAuth(auth: unknown): AuthType {
  return auth === "none" || auth === "apiKey" || auth === "basic" ? auth : "bearer";
}

function sanitizeStatus(status: unknown): ApiDocPage["status"] {
  return status === "review" || status === "approved" || status === "deprecated"
    ? status
    : "draft";
}

function sanitizeRows(rows: unknown): ApiDocKeyValue[] {
  if (!Array.isArray(rows)) return [createDefaultRow()];
  const safeRows = rows
    .map((row) => {
      const item = row as Partial<ApiDocKeyValue>;
      return {
        id: typeof item.id === "string" && item.id.length > 0 ? item.id : crypto.randomUUID(),
        key: typeof item.key === "string" ? item.key : "",
        value: typeof item.value === "string" ? item.value : "",
        enabled: item.enabled !== false,
      };
    })
    .filter((row) => row.key.length > 0 || row.value.length > 0 || row.enabled);
  return safeRows.length > 0 ? safeRows : [createDefaultRow()];
}

function sanitizeResponses(responses: unknown): ApiDocResponse[] {
  if (!Array.isArray(responses)) return [createDefaultResponse(200), createDefaultResponse(400)];
  const safeResponses = responses
    .map((response) => {
      const item = response as Partial<ApiDocResponse>;
      const statusCode =
        typeof item.statusCode === "number" && item.statusCode >= 100 && item.statusCode <= 599
          ? Math.floor(item.statusCode)
          : 200;
      return {
        id: typeof item.id === "string" && item.id.length > 0 ? item.id : crypto.randomUUID(),
        statusCode,
        title: typeof item.title === "string" ? item.title : String(statusCode),
        description: typeof item.description === "string" ? item.description : "",
        bodyJson: typeof item.bodyJson === "string" ? item.bodyJson : "{\n  \n}",
      };
    })
    .filter((item) => item.statusCode >= 100 && item.statusCode <= 599);
  return safeResponses.length > 0
    ? safeResponses
    : [createDefaultResponse(200), createDefaultResponse(400)];
}

function sanitizeEndpoint(data: unknown): ApiDocEndpoint {
  const item = (data ?? {}) as Partial<ApiDocEndpoint>;
  return {
    id: typeof item.id === "string" && item.id.length > 0 ? item.id : crypto.randomUUID(),
    name: typeof item.name === "string" && item.name.trim().length > 0 ? item.name.trim() : "API",
    method: sanitizeMethod(item.method),
    urlPath:
      typeof item.urlPath === "string" && item.urlPath.trim().length > 0
        ? item.urlPath.trim()
        : "/resource",
    auth: sanitizeAuth(item.auth),
    headers: sanitizeRows(item.headers),
    params: sanitizeRows(item.params),
    bodyJson: typeof item.bodyJson === "string" ? item.bodyJson : "{\n  \n}",
    responses: sanitizeResponses(item.responses),
    notes: typeof item.notes === "string" ? item.notes : "",
  };
}

function sanitizeWorkspace(data: unknown): ApiDocWorkspace {
  const source = data as Partial<ApiDocWorkspace> & { projects?: LegacyProject[] };
  const folders = Array.isArray(source.folders) ? source.folders : [];
  const pagesRaw = Array.isArray(source.pages)
    ? source.pages
    : Array.isArray(source.projects)
      ? source.projects.map((project) => {
          const item = project as LegacyProject;
          const template = (item.template ?? {}) as LegacyTemplate;
          const endpoint = createDefaultEndpoint(
            typeof item.title === "string" && item.title.trim().length > 0
              ? item.title.trim()
              : "API",
          );
          endpoint.method = sanitizeMethod(item.method);
          endpoint.urlPath =
            typeof item.endpointPath === "string" && item.endpointPath.trim().length > 0
              ? item.endpointPath.trim()
              : endpoint.urlPath;
          endpoint.auth = sanitizeAuth(template.auth);
          endpoint.bodyJson =
            typeof template.requestBodyExample === "string"
              ? template.requestBodyExample
              : endpoint.bodyJson;
          endpoint.responses = [
            {
              ...createDefaultResponse(200),
              bodyJson:
                typeof template.successResponseExample === "string"
                  ? template.successResponseExample
                  : "{\n  \n}",
            },
            {
              ...createDefaultResponse(400),
              bodyJson:
                typeof template.errorResponseExample === "string"
                  ? template.errorResponseExample
                  : "{\n  \n}",
            },
          ];
          endpoint.notes = [
            typeof template.purpose === "string" ? template.purpose : "",
            typeof template.pathParams === "string" ? `Path Params:\n${template.pathParams}` : "",
            typeof template.queryParams === "string"
              ? `Query Params:\n${template.queryParams}`
              : "",
            typeof template.requestHeaders === "string"
              ? `Request Headers:\n${template.requestHeaders}`
              : "",
            typeof template.frontendNotes === "string"
              ? `Frontend Notes:\n${template.frontendNotes}`
              : "",
          ]
            .filter((chunk) => chunk.length > 0)
            .join("\n\n");

          return {
            id: item.id,
            title: item.title,
            folderId: item.folderId,
            baseUrl: "https://api.example.com",
            status: item.status,
            description: typeof template.purpose === "string" ? template.purpose : "",
            endpoints: [endpoint],
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        })
      : [];

  const mappedFolders = folders
    .map((folder) => {
      const item = folder as Partial<ApiDocFolder>;
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
  const safeFolders: ApiDocFolder[] = [];
  for (const folder of mappedFolders) {
    if (folder) safeFolders.push(folder);
  }

  const folderIds = new Set(safeFolders.map((folder) => folder.id));
  for (const folder of safeFolders) {
    const raw = folders.find((item) => (item as Partial<ApiDocFolder>).id === folder.id) as
      | Partial<ApiDocFolder>
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
  const safePages: ApiDocPage[] = pagesRaw
    .map((page) => {
      const item = page as Partial<ApiDocPage>;
      if (typeof item.id !== "string" || item.id.length === 0) return null;
      const timestamp = nowIso();
      return {
        id: item.id,
        title:
          typeof item.title === "string" && item.title.trim().length > 0
            ? item.title.trim()
            : "Untitled API Page",
        folderId:
          typeof item.folderId === "string" && folderIds.has(item.folderId) ? item.folderId : null,
        baseUrl:
          typeof item.baseUrl === "string" && item.baseUrl.trim().length > 0
            ? item.baseUrl.trim()
            : "https://api.example.com",
        status: sanitizeStatus(item.status),
        description: typeof item.description === "string" ? item.description : "",
        endpoints: Array.isArray(item.endpoints)
          ? item.endpoints.map(sanitizeEndpoint)
          : [createDefaultEndpoint("Untitled API")],
        createdAt: typeof item.createdAt === "string" ? item.createdAt : timestamp,
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : timestamp,
      };
    })
    .filter((item): item is ApiDocPage => item !== null);

  return {
    version: 2,
    folders: safeFolders,
    pages: safePages.length > 0 ? safePages : [createDefaultPage()],
  };
}

async function readWorkspace(): Promise<ApiDocWorkspace> {
  try {
    const raw = await readFile(WORKSPACE_PATH, "utf8");
    return sanitizeWorkspace(JSON.parse(raw));
  } catch {
    return { version: 2, folders: [], pages: [createDefaultPage()] };
  }
}

async function saveWorkspace(workspace: ApiDocWorkspace): Promise<void> {
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
    const created: ApiDocFolder = {
      id: crypto.randomUUID(),
      name:
        typeof body.name === "string" && body.name.trim().length > 0
          ? body.name.trim()
          : "Untitled Folder",
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

  if (body.type === "page") {
    const folderIds = new Set(workspace.folders.map((folder) => folder.id));
    const created: ApiDocPage = {
      ...createDefaultPage(),
      id: crypto.randomUUID(),
      title:
        typeof body.title === "string" && body.title.trim().length > 0
          ? body.title.trim()
          : "Untitled API Page",
      folderId:
        typeof body.folderId === "string" && folderIds.has(body.folderId) ? body.folderId : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    workspace.pages.push(created);
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true, page: created });
  }

  if (body.type === "endpoint" && typeof body.pageId === "string") {
    const page = workspace.pages.find((item) => item.id === body.pageId);
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }
    const endpoint = createDefaultEndpoint(
      typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim() : "New API",
    );
    page.endpoints.push(endpoint);
    page.updatedAt = timestamp;
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true, endpoint });
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
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      folder.name = body.name.trim();
    }
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

  if (body.type === "page" && typeof body.id === "string") {
    const page = workspace.pages.find((item) => item.id === body.id);
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }

    if (typeof body.title === "string" && body.title.trim().length > 0) {
      page.title = body.title.trim();
    }

    if (body.folderId === null) {
      page.folderId = null;
    } else if (typeof body.folderId === "string") {
      page.folderId = workspace.folders.some((folder) => folder.id === body.folderId)
        ? body.folderId
        : null;
    }

    if (typeof body.baseUrl === "string") {
      page.baseUrl = body.baseUrl.trim();
    }

    if (typeof body.description === "string") {
      page.description = body.description;
    }

    if (body.status) {
      page.status = sanitizeStatus(body.status);
    }

    page.updatedAt = timestamp;
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "endpoint" && typeof body.id === "string" && typeof body.pageId === "string") {
    const page = workspace.pages.find((item) => item.id === body.pageId);
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }
    const endpoint = page.endpoints.find((item) => item.id === body.id);
    if (!endpoint) {
      return NextResponse.json({ ok: false, message: "API not found." }, { status: 404 });
    }

    if (typeof body.name === "string" && body.name.trim().length > 0) endpoint.name = body.name.trim();
    if (body.method) endpoint.method = sanitizeMethod(body.method);
    if (typeof body.urlPath === "string" && body.urlPath.trim().length > 0) {
      endpoint.urlPath = body.urlPath.trim();
    }
    if (body.auth) endpoint.auth = sanitizeAuth(body.auth);
    if (Array.isArray(body.headers)) endpoint.headers = sanitizeRows(body.headers);
    if (Array.isArray(body.params)) endpoint.params = sanitizeRows(body.params);
    if (typeof body.bodyJson === "string") endpoint.bodyJson = body.bodyJson;
    if (Array.isArray(body.responses)) endpoint.responses = sanitizeResponses(body.responses);
    if (typeof body.notes === "string") endpoint.notes = body.notes;

    page.updatedAt = timestamp;
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
    workspace.pages = workspace.pages.map((page) =>
      page.folderId === body.id ? { ...page, folderId: null } : page,
    );
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "page" && typeof body.id === "string") {
    const remaining = workspace.pages.filter((page) => page.id !== body.id);
    workspace.pages = remaining.length > 0 ? remaining : [createDefaultPage()];
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "endpoint" && typeof body.pageId === "string" && typeof body.id === "string") {
    const page = workspace.pages.find((item) => item.id === body.pageId);
    if (!page) {
      return NextResponse.json({ ok: false, message: "Page not found." }, { status: 404 });
    }
    const remaining = page.endpoints.filter((endpoint) => endpoint.id !== body.id);
    page.endpoints = remaining.length > 0 ? remaining : [createDefaultEndpoint("Untitled API")];
    page.updatedAt = nowIso();
    await saveWorkspace(workspace);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, message: "Invalid request payload." }, { status: 400 });
}
