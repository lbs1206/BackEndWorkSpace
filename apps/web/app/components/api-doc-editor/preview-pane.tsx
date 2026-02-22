import type { ApiDocEndpoint, ApiDocPage } from "../../store/types";

type ApiDocEditorPreviewProps = {
  selectedPage: ApiDocPage | null;
  previewEndpoint: ApiDocEndpoint | null;
  onSelectEndpointForPreview: (endpointId: string) => void;
};

export function ApiDocEditorPreview({ selectedPage, previewEndpoint, onSelectEndpointForPreview }: ApiDocEditorPreviewProps) {
  return (
    <aside className="api-doc-preview-pane">
      {selectedPage ? (
        <section className="api-doc-preview">
          {previewEndpoint ? (
            <>
              <div className="spotlight-head">
                <span className={`spotlight-method method-${previewEndpoint.method.toLowerCase()}`}>
                  {previewEndpoint.method}
                </span>
                <code>{selectedPage.baseUrl}{previewEndpoint.urlPath}</code>
                <span className="spotlight-status">{selectedPage.status}</span>
              </div>

              <h2>{previewEndpoint.name}</h2>
              <p className="spotlight-purpose">{selectedPage.description || "-"}</p>
            </>
          ) : (
            <p className="spotlight-purpose">이 페이지에 API Interface가 없습니다. + API로 추가해 주세요.</p>
          )}

          <div className="api-doc-api-list-head">
            <h3>API Interfaces</h3>
          </div>
          <div className="api-doc-api-list">
            {selectedPage.endpoints.map((api) => (
              <button
                key={api.id}
                type="button"
                className={`api-doc-project-item ${api.id === previewEndpoint?.id ? "active" : ""}`}
                onClick={() => onSelectEndpointForPreview(api.id)}
              >
                {api.method} {api.name}
              </button>
            ))}
          </div>
          {previewEndpoint && (
            <>
              <div className="spotlight-section">
                <h3>Auth</h3>
                <p>{previewEndpoint.auth}</p>
              </div>

              <div className="spotlight-section">
                <h3>Headers</h3>
                <pre>
                  {previewEndpoint.headers
                    .filter((row) => row.enabled)
                    .map((row) => `${row.key}: ${row.value}`)
                    .join("\n") || "-"}
                </pre>
              </div>

              <div className="spotlight-section">
                <h3>Params</h3>
                <pre>
                  {previewEndpoint.params
                    .filter((row) => row.enabled)
                    .map((row) => `${row.key}=${row.value}`)
                    .join("\n") || "-"}
                </pre>
              </div>

              <div className="spotlight-section">
                <h3>Body JSON</h3>
                <pre>{previewEndpoint.bodyJson || "-"}</pre>
              </div>

              <div className="spotlight-section">
                <h3>Responses</h3>
                <pre>
                  {previewEndpoint.responses
                    .map((response) => `[${response.statusCode}] ${response.title}\n${response.bodyJson}`)
                    .join("\n\n") || "-"}
                </pre>
              </div>

              <div className="spotlight-section">
                <h3>Notes</h3>
                <pre>{previewEndpoint.notes || "-"}</pre>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="api-doc-empty">Select page to open viewer.</section>
      )}
    </aside>
  );
}
