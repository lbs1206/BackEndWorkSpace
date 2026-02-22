export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type AuthType = "none" | "bearer" | "apiKey" | "basic";

export type ApiDocKeyValue = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type ApiDocResponse = {
  id: string;
  statusCode: number;
  title: string;
  description: string;
  bodyJson: string;
};

export type ApiDocEndpoint = {
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

export type ApiDocPage = {
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

export type ApiDocFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspacePayload = {
  pages: ApiDocPage[];
  folders: ApiDocFolder[];
};

export type ErdProject = {
  id: string;
  title: string;
  folderId: string | null;
  value: string;
  createdAt: string;
  updatedAt: string;
};

export type ErdFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ErdWorkspacePayload = {
  projects: ErdProject[];
  folders: ErdFolder[];
};
