# API Doc Policy (Site Editor)

## 1) Goal
- FE/BE interface agreement must be completed in the API DOC page before implementation.
- Docs are written in a fixed template from the site editor.

## 2) Source Of Truth
- API DOC source is the site workspace file: `.local-data/api-doc-workspace.json`.
- Contract discussion can happen elsewhere, but approval is tracked in API DOC page status.

## 3) Workflow State
- Allowed status: `draft`, `review`, `approved`, `deprecated`.
- Only `approved` pages are valid for production integration.

## 4) Required Template Sections
- title, method, path, status, auth
- purpose
- path params
- query params
- request headers
- request body example
- success response example
- error response example
- frontend handling notes

## 5) Field Naming Strategy
- Choose one style per API version: `camelCase` or `snake_case`.
- Do not mix both styles within the same API version.

## 6) Error Response Policy
- Error response should include:
  - `code`
  - `message`
  - `traceId`

## 7) Review Policy
- `review` requires BE + FE review.
- `approved` requires explicit BE + FE agreement.
- Breaking changes must return to `review`.
