# Policy Changelog

정책/설계 변경은 개발 전에 먼저 기록한다.

## Template

- Date: YYYY-MM-DD
- Author:
- Category: ERD | API_DOC | WORKFLOW | OTHER
- Summary:
- Detail:
- Affected Files:
- Follow-up Action:
- Status: Draft | Approved | Applied

---

## Entries

- Date: 2026-02-21
- Author: codex
- Category: OTHER
- Summary: 로컬 저장소 -> 백엔드 CRUD 전환용 테이블 설계 추가
- Detail: ERD/API DOC 워크스페이스 데이터를 PostgreSQL 정규화 테이블로 분리하고 FK/인덱스/체크 제약을 정의
- Affected Files: `docs/policy/BACKEND_TABLE_DESIGN.md`, `docs/db/001_workspace_tables.sql`, `docs/policy/README.md`
- Follow-up Action: `apps/api`에 마이그레이션 도구(Flyway/Liquibase) 도입 후 DDL 적용 및 Repository/Service 구현
- Status: Applied

- Date: 2026-02-21
- Author: codex
- Category: OTHER
- Summary: ERD/API 폴더 트리(하위 폴더) + 접기/열기 기능 반영
- Detail: `parentFolderId` 데이터 모델 및 API 라우트 확장, 에디터/뷰어 사이드바 트리 렌더링 및 폴더 토글 UI 구현
- Affected Files: `apps/web/app/store/types.ts`, `apps/web/app/api/erd-document/route.ts`, `apps/web/app/api/api-doc-workspace/route.ts`, `apps/web/app/components/*`, `apps/web/app/globals.css`, `docs/db/001_workspace_tables.sql`
- Follow-up Action: Spring API 마이그레이션 적용 후 폴더 계층 조회 API에 정렬(트리 순회) 규칙 추가
- Status: Applied

- Date: 2026-02-21
- Author: codex
- Category: OTHER
- Summary: 프론트 로컬 저장 데이터의 백엔드(DB) 관리 전환
- Detail: Spring API에 ERD/API DOC CRUD 엔드포인트를 구현하고, schema.sql 자동 초기화 + 프론트 기본 API 대상을 `localhost:8080`으로 전환
- Affected Files: `apps/api/src/main/kotlin/com/example/api/workspace/*`, `apps/api/src/main/kotlin/com/example/api/config/CorsConfig.kt`, `apps/api/src/main/resources/schema.sql`, `apps/api/src/main/resources/application.yml`, `apps/web/app/components/*`
- Follow-up Action: Gradle Wrapper 추가 후 CI에서 `apps/api` 컴파일/테스트 자동 검증
- Status: Applied

- Date: 2026-02-18
- Author: team
- Category: WORKFLOW
- Summary: 정책 폴더 신설
- Detail: ERD/API DOC 정책 및 수정사항 로그 문서를 `docs/policy`에 분리 관리
- Affected Files: `docs/policy/*`
- Follow-up Action: 신규 기능 개발 시 변경사항 선기록 후 개발 진행
- Status: Applied

- Date: 2026-02-18
- Author: team
- Category: API_DOC
- Summary: API DOC 계층 모델 확정
- Detail: 정보 구조를 `Group > Page (1:N)`, `Page > API Interface (1:N)`로 명시
- Affected Files: `docs/policy/API_DOC_POLICY.md`
- Follow-up Action: API DOC UI/데이터 모델도 동일 계층 기준으로 유지
- Status: Applied

- Date: 2026-02-18
- Author: team
- Category: API_DOC
- Summary: API DOC UI/UX 정책 반영
- Detail: Editor/Viewer 분리, API 선택 토글 아코디언, 파스텔 초록+화이트/그라데이션 테마 기준을 정책에 명시
- Affected Files: `docs/policy/API_DOC_POLICY.md`
- Follow-up Action: UI 변경 시 Editor/Viewer 역할 분리 및 토글 UX 유지 여부를 체크리스트로 검증
- Status: Applied
