import type {
  ApiDocEndpoint,
  ApiDocKeyValue,
  ApiDocPage,
  ApiDocResponse,
  AuthType,
  HttpMethod,
} from "../../store/types";
import { AUTH_OPTIONS, createResponse, createRow, METHOD_OPTIONS, type RowKind } from "./utils";

type ApiDocEditorPageProps = {
  selectedPage: ApiDocPage;
  folderOptions: Array<{ id: string; label: string }>;
  openEndpointIds: string[];
  onPatchSelectedPage: (patch: Partial<Pick<ApiDocPage, "title" | "folderId" | "baseUrl" | "status" | "description">>) => Promise<void>;
  onCreateEndpoint: () => Promise<void>;
  onToggleEndpointOpen: (endpointId: string) => void;
  onSelectEndpointForPreview: (endpointId: string) => void;
  onPatchEndpoint: (endpointId: string, patch: Partial<ApiDocEndpoint>) => Promise<void>;
  onPatchEndpointRows: (endpointId: string, kind: RowKind, rows: ApiDocKeyValue[]) => Promise<void>;
  onPatchEndpointResponses: (endpointId: string, responses: ApiDocResponse[]) => Promise<void>;
};

export function ApiDocEditorPage({
  selectedPage,
  folderOptions,
  openEndpointIds,
  onPatchSelectedPage,
  onCreateEndpoint,
  onToggleEndpointOpen,
  onSelectEndpointForPreview,
  onPatchEndpoint,
  onPatchEndpointRows,
  onPatchEndpointResponses,
}: ApiDocEditorPageProps) {
  return (
    <section className="api-doc-editor">
      <h3>Page</h3>
      <div className="api-doc-grid">
        <label>
          Page Title
          <input value={selectedPage.title} onChange={(e) => void onPatchSelectedPage({ title: e.target.value })} />
        </label>
        <label>
          Group
          <select value={selectedPage.folderId ?? ""} onChange={(e) => void onPatchSelectedPage({ folderId: e.target.value || null })}>
            <option value="">Ungrouped</option>
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.label}</option>
            ))}
          </select>
        </label>
        <label>
          Base URL
          <input value={selectedPage.baseUrl} onChange={(e) => void onPatchSelectedPage({ baseUrl: e.target.value })} />
        </label>
        <label>
          Status
          <select
            value={selectedPage.status}
            onChange={(e) => void onPatchSelectedPage({ status: e.target.value as ApiDocPage["status"] })}
          >
            <option value="draft">draft</option>
            <option value="review">review</option>
            <option value="approved">approved</option>
            <option value="deprecated">deprecated</option>
          </select>
        </label>
      </div>

      <label>
        Page Description
        <textarea rows={3} value={selectedPage.description} onChange={(e) => void onPatchSelectedPage({ description: e.target.value })} />
      </label>

      <div className="api-doc-api-list-head">
        <h3>API Interfaces</h3>
        <button type="button" onClick={() => void onCreateEndpoint()}>+ API</button>
      </div>

      <div className="api-doc-accordion">
        {selectedPage.endpoints.map((endpoint) => {
          const isOpen = openEndpointIds.includes(endpoint.id);
          return (
            <article key={endpoint.id} className="api-doc-endpoint-card">
              <div className="api-doc-endpoint-head api-doc-interface-toolbar">
                <button type="button" className="api-doc-interface-select" onClick={() => onSelectEndpointForPreview(endpoint.id)}>
                  <span>{endpoint.method} {endpoint.name}</span>
                  <span className="api-doc-accordion-meta">우측 뷰어 표시</span>
                </button>
                <button type="button" className="api-doc-mini" onClick={() => onToggleEndpointOpen(endpoint.id)}>
                  {isOpen ? "접기" : "열기"}
                </button>
              </div>

              {isOpen && (
                <form className="api-doc-endpoint-body" onSubmit={(event) => event.preventDefault()}>
                  <div className="api-doc-grid">
                    <label>
                      Name
                      <input value={endpoint.name} onChange={(e) => void onPatchEndpoint(endpoint.id, { name: e.target.value })} />
                    </label>
                    <label>
                      Method
                      <select value={endpoint.method} onChange={(e) => void onPatchEndpoint(endpoint.id, { method: e.target.value as HttpMethod })}>
                        {METHOD_OPTIONS.map((method) => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      URL Path
                      <input value={endpoint.urlPath} onChange={(e) => void onPatchEndpoint(endpoint.id, { urlPath: e.target.value })} />
                    </label>
                    <label>
                      Auth
                      <select value={endpoint.auth} onChange={(e) => void onPatchEndpoint(endpoint.id, { auth: e.target.value as AuthType })}>
                        {AUTH_OPTIONS.map((auth) => (
                          <option key={auth} value={auth}>{auth}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    Headers
                    <div className="api-doc-table-wrap">
                      {endpoint.headers.map((row) => (
                        <div key={row.id} className="api-doc-kv-row">
                          <input
                            value={row.key}
                            placeholder="key"
                            onChange={(e) =>
                              void onPatchEndpointRows(
                                endpoint.id,
                                "headers",
                                endpoint.headers.map((item) => (item.id === row.id ? { ...item, key: e.target.value } : item)),
                              )
                            }
                          />
                          <input
                            value={row.value}
                            placeholder="value"
                            onChange={(e) =>
                              void onPatchEndpointRows(
                                endpoint.id,
                                "headers",
                                endpoint.headers.map((item) => (item.id === row.id ? { ...item, value: e.target.value } : item)),
                              )
                            }
                          />
                          <label className="api-doc-kv-check">
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={(e) =>
                                void onPatchEndpointRows(
                                  endpoint.id,
                                  "headers",
                                  endpoint.headers.map((item) => (item.id === row.id ? { ...item, enabled: e.target.checked } : item)),
                                )
                              }
                            />
                            Enabled
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              void onPatchEndpointRows(
                                endpoint.id,
                                "headers",
                                endpoint.headers.filter((item) => item.id !== row.id),
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => void onPatchEndpointRows(endpoint.id, "headers", [...endpoint.headers, createRow()])}
                      >
                        + Header
                      </button>
                    </div>
                  </label>

                  <label>
                    Params
                    <div className="api-doc-table-wrap">
                      {endpoint.params.map((row) => (
                        <div key={row.id} className="api-doc-kv-row">
                          <input
                            value={row.key}
                            placeholder="key"
                            onChange={(e) =>
                              void onPatchEndpointRows(
                                endpoint.id,
                                "params",
                                endpoint.params.map((item) => (item.id === row.id ? { ...item, key: e.target.value } : item)),
                              )
                            }
                          />
                          <input
                            value={row.value}
                            placeholder="value"
                            onChange={(e) =>
                              void onPatchEndpointRows(
                                endpoint.id,
                                "params",
                                endpoint.params.map((item) => (item.id === row.id ? { ...item, value: e.target.value } : item)),
                              )
                            }
                          />
                          <label className="api-doc-kv-check">
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={(e) =>
                                void onPatchEndpointRows(
                                  endpoint.id,
                                  "params",
                                  endpoint.params.map((item) => (item.id === row.id ? { ...item, enabled: e.target.checked } : item)),
                                )
                              }
                            />
                            Enabled
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              void onPatchEndpointRows(
                                endpoint.id,
                                "params",
                                endpoint.params.filter((item) => item.id !== row.id),
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => void onPatchEndpointRows(endpoint.id, "params", [...endpoint.params, createRow()])}
                      >
                        + Param
                      </button>
                    </div>
                  </label>

                  <label>
                    Body JSON
                    <textarea rows={6} value={endpoint.bodyJson} onChange={(e) => void onPatchEndpoint(endpoint.id, { bodyJson: e.target.value })} />
                  </label>

                  <label>
                    Responses
                    <div className="api-doc-table-wrap">
                      {endpoint.responses.map((response) => (
                        <div key={response.id} className="api-doc-response-row">
                          <input
                            type="number"
                            min={100}
                            max={599}
                            value={response.statusCode}
                            onChange={(e) =>
                              void onPatchEndpointResponses(
                                endpoint.id,
                                endpoint.responses.map((item) =>
                                  item.id === response.id ? { ...item, statusCode: Number(e.target.value) || 200 } : item,
                                ),
                              )
                            }
                          />
                          <input
                            value={response.title}
                            placeholder="title"
                            onChange={(e) =>
                              void onPatchEndpointResponses(
                                endpoint.id,
                                endpoint.responses.map((item) => (item.id === response.id ? { ...item, title: e.target.value } : item)),
                              )
                            }
                          />
                          <input
                            value={response.description}
                            placeholder="description"
                            onChange={(e) =>
                              void onPatchEndpointResponses(
                                endpoint.id,
                                endpoint.responses.map((item) =>
                                  item.id === response.id ? { ...item, description: e.target.value } : item,
                                ),
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void onPatchEndpointResponses(
                                endpoint.id,
                                endpoint.responses.filter((item) => item.id !== response.id),
                              )
                            }
                          >
                            Remove
                          </button>
                          <textarea
                            rows={4}
                            value={response.bodyJson}
                            onChange={(e) =>
                              void onPatchEndpointResponses(
                                endpoint.id,
                                endpoint.responses.map((item) => (item.id === response.id ? { ...item, bodyJson: e.target.value } : item)),
                              )
                            }
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          void onPatchEndpointResponses(
                            endpoint.id,
                            [...endpoint.responses, createResponse(endpoint.responses.length === 0 ? 200 : 400)],
                          )
                        }
                      >
                        + Response
                      </button>
                    </div>
                  </label>

                  <label>
                    Notes
                    <textarea rows={4} value={endpoint.notes} onChange={(e) => void onPatchEndpoint(endpoint.id, { notes: e.target.value })} />
                  </label>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
