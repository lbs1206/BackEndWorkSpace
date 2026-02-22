# Policy Folder Guide

이 폴더는 ERD/API DOC 정책 및 변경 이력을 관리한다.

## 파일 구성

- `docs/policy/ERD_POLICY.md`: ERD 작성/수정/검토 정책
- `docs/policy/API_DOC_POLICY.md`: API DOC 작성/수정/검토 정책
- `docs/policy/BACKEND_TABLE_DESIGN.md`: 로컬 저장 데이터 백엔드 CRUD 전환용 테이블 설계
- `docs/policy/CHANGELOG.md`: 정책/설계 수정사항 로그
- `docs/policy/DEV_WORKFLOW.md`: 수정사항 반영 후 개발 절차

## 운영 원칙

1. 개발 시작 전에 `CHANGELOG.md`에 변경 항목을 먼저 기록한다.
2. ERD 변경은 `ERD_POLICY.md` 기준으로 승인 후 진행한다.
3. API DOC 변경은 `API_DOC_POLICY.md` 기준으로 승인 후 진행한다.
4. 구현 PR에는 변경된 정책 문서 링크를 포함한다.
