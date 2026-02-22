# Backend Table Design (Local -> Backend CRUD)

## 목적

웹 앱에서 `.local-data/*.json`으로 저장하던 ERD/API DOC 데이터를 백엔드 DB(PostgreSQL)로 이관하기 위한 기본 테이블 구조를 정의한다.

## 범위

1. ERD Workspace
2. API DOC Workspace
3. 각 엔티티의 조회/등록/수정/삭제(CRUD)에 필요한 FK/인덱스/제약조건

## 엔티티 매핑

### ERD

1. `ErdFolder` -> `erd_folders`
2. `ErdProject` -> `erd_projects`

### API DOC

1. `ApiDocFolder` -> `api_doc_folders`
2. `ApiDocPage` -> `api_doc_pages`
3. `ApiDocEndpoint` -> `api_doc_endpoints`
4. `ApiDocKeyValue(headers)` -> `api_doc_endpoint_headers`
5. `ApiDocKeyValue(params)` -> `api_doc_endpoint_params`
6. `ApiDocResponse` -> `api_doc_endpoint_responses`

## 설계 원칙

1. 폴더 삭제 시 문서/프로젝트는 `folder_id = NULL`로 유지한다. (`ON DELETE SET NULL`)
2. 페이지 삭제 시 하위 endpoint/headers/params/responses는 함께 삭제한다. (`ON DELETE CASCADE`)
3. 상태값/메서드/인증타입은 `CHECK` 제약으로 유효값을 강제한다.
4. 정렬이 필요한 컬렉션(API 목록, 헤더 목록 등)은 `sort_order` 컬럼을 둔다.
5. 낙관적 락을 위해 `version`(bigint) 컬럼을 둔다.
6. 폴더 트리를 위해 폴더 테이블은 `parent_folder_id` 자기참조 FK를 가진다.
7. 폴더 접기/열기 상태는 UI 상태로 관리하고 DB에는 저장하지 않는다.

## DDL 위치

실행 가능한 SQL은 `docs/db/001_workspace_tables.sql`에 정의한다.
