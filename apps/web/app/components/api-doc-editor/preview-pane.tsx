import type { ApiDocEndpoint, ApiDocPage } from "../../store/types";

type ApiDocEditorPreviewProps = {
  selectedPage: ApiDocPage | null;
  previewEndpoint: ApiDocEndpoint | null;
};

function resolveHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl.replace(/^https?:\/\//, "");
  }
}

function makeRequestSample(page: ApiDocPage, endpoint: ApiDocEndpoint): string {
  const host = resolveHost(page.baseUrl);
  const headerLines = endpoint.headers
    .filter((row) => row.enabled && row.key.trim().length > 0)
    .map((row) => `${row.key}: ${row.value}`);
  const authLine =
    endpoint.auth === "bearer"
      ? "Authorization: Bearer {token}"
      : endpoint.auth === "apiKey"
        ? "X-API-KEY: {api_key}"
        : endpoint.auth === "basic"
          ? "Authorization: Basic {base64(id:pw)}"
          : "";

  return [
    `${endpoint.method} ${endpoint.urlPath} HTTP/1.1`,
    `Host: ${host || "-"}`,
    ...headerLines,
    ...(authLine ? [authLine] : []),
    "",
    endpoint.bodyJson || "{}",
  ]
    .filter((line, index, arr) => !(line === "" && index === arr.length - 1))
    .join("\n");
}

export function ApiDocEditorPreview({ selectedPage, previewEndpoint }: ApiDocEditorPreviewProps) {
  return (
    <aside className="api-doc-preview-pane">
      {selectedPage ? (
        <section className="api-doc-preview api-doc-reference-preview">
          {previewEndpoint ? (
            <>
              <div className="api-doc-ref-head">
                <div className="api-doc-ref-title-row">
                  <h2>{previewEndpoint.name}</h2>
                  <span className="spotlight-status">{selectedPage.status}</span>
                </div>
                <div className="api-doc-ref-url-row">
                  <span className={`spotlight-method method-${previewEndpoint.method.toLowerCase()}`}>
                    {previewEndpoint.method}
                  </span>
                  <code>{selectedPage.baseUrl}{previewEndpoint.urlPath}</code>
                </div>
                <p className="spotlight-purpose">{selectedPage.description || "-"}</p>
              </div>

              <section className="api-doc-ref-block">
                <header className="api-doc-ref-block-head">
                  <span>Example Request</span>
                  <span>New Request</span>
                </header>
                <div className="api-doc-ref-tabs">
                  <span className="active">Body</span>
                </div>
                <pre>{makeRequestSample(selectedPage, previewEndpoint)}</pre>
              </section>

              {previewEndpoint.responses.map((response) => (
                <section key={response.id} className="api-doc-ref-block">
                  <header className="api-doc-ref-block-head">
                    <span>Example Response</span>
                    <span>{response.statusCode} {response.title}</span>
                  </header>
                  <div className="api-doc-ref-tabs">
                    <span className="active">Body</span>
                  </div>
                  <pre>{response.bodyJson || "{}"}</pre>
                </section>
              ))}

              {!!previewEndpoint.notes && (
                <section className="api-doc-ref-note">
                  <h3>Notes</h3>
                  <pre>{previewEndpoint.notes}</pre>
                </section>
              )}
            </>
          ) : (
            <p className="spotlight-purpose">이 페이지에 API Interface가 없습니다. + API로 추가해 주세요.</p>
          )}
        </section>
      ) : (
        <section className="api-doc-empty">Select page to open viewer.</section>
      )}
    </aside>
  );
}
