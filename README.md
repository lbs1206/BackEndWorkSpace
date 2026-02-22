# BackEndWorkSpace Monorepo

## Stack

- Web: Next.js (TypeScript)
- API: Spring Boot (Kotlin, Java 21)
- DB: PostgreSQL (Docker Compose)
- Monorepo: pnpm workspace + Turborepo

## Structure

- `apps/web`: Next.js app
- `apps/api`: Spring Boot app
- `docs/api-stoplight`: Stoplight-based API contract docs
- `docs/api-markdown`: legacy markdown docs (deprecated)
- `infra/docker`: local infra compose files
- `packages`: shared packages

## Quick Start

### 1) Run all (web + api + postgres)

```bash
cd infra/docker
docker compose up -d
```

- Web: `http://localhost:3000`
- API: `http://localhost:8080`
- DB: `localhost:5432`

### 2) Stop all

```bash
cd infra/docker
docker compose down
```

### 3) Rebuild/restart API only

```bash
cd infra/docker
docker compose up -d --build api
```

- `api` 컨테이너만 다시 빌드/기동한다.
- `postgres`가 꺼져 있으면 `depends_on`에 의해 함께 올라간다.

### 4) Useful compose commands

```bash
# api만 재시작(이미 빌드된 이미지/레이어 사용)
docker compose restart api

# api 로그 보기
docker compose logs -f api

# api만 내리기
docker compose stop api
```

## API Docs

- Policy: `docs/api-stoplight/POLICY.md`
- Review checklist: `docs/api-stoplight/REVIEW_CHECKLIST.md`
- Team policy folder: `docs/policy`
- ERD policy: `docs/policy/ERD_POLICY.md`
- API DOC policy: `docs/policy/API_DOC_POLICY.md`
- Policy changelog: `docs/policy/CHANGELOG.md`
- Development workflow: `docs/policy/DEV_WORKFLOW.md`
- Editor + preview UI: `http://localhost:3000/api-docs`

## Notes

- This scaffold intentionally includes only base structure.
- Compose runs web and api in dev mode with source mounted from the monorepo root.
