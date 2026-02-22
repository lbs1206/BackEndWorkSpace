# Development Workflow (Policy First)

## 기본 절차

1. 변경 요청 접수
2. `docs/policy/CHANGELOG.md`에 수정사항 초안 기록
3. 필요 시 `ERD_POLICY.md`, `API_DOC_POLICY.md` 업데이트
4. 정책 검토/승인
5. 개발 진행
6. 구현 후 문서 동기화 확인
7. PR에 정책/로그 링크 첨부

## PR 필수 항목

1. 관련 변경 로그 항목 링크
2. ERD 변경 여부 및 마이그레이션 스크립트 유무
3. API DOC 반영 여부 (`/api-docs` 기준)
4. 테스트 결과

## 금지사항

1. 정책/로그 기록 없이 스키마 직접 변경
2. API 구현 후 문서 미갱신 상태로 머지
3. Breaking change 공지 없이 기존 계약 변경
