# API DOC Policy

## 목적

API 명세와 실제 구현의 불일치를 줄이고, 프론트/백엔드 협업 비용을 낮춘다.

## 정보 구조(필수)

1. `Group > Page`는 `1:N` 관계
2. `Page > API Interface`는 `1:N` 관계

즉, 하나의 Group 안에 여러 Page가 있고, 하나의 Page 안에 여러 API Interface가 있다.

## 단위별 필수 항목

### Group

1. Group 이름
2. Group 설명(선택)

### Page

1. Page 이름
2. Base URL
3. 상태(`draft`, `review`, `approved`, `deprecated`)
4. Page 설명(선택)

### API Interface

1. API 이름
2. HTTP Method
3. URL Path
4. Auth
5. Header
6. Param
7. Body (JSON)
8. Response (예: 200, 400, 401, 500)

## 화면 정책(Editor / Viewer)

1. API DOC 화면은 `Editor`와 `Viewer`를 분리한다.
2. Editor 경로는 `/api-docs`, Viewer 경로는 `/api-docs/view`를 기본으로 한다.
3. Viewer는 문서 조회 전용이며 생성/수정/삭제 UI를 포함하지 않는다.
4. Editor 헤더에서는 Viewer로, Viewer 헤더에서는 Editor로 이동 가능해야 한다.

## UI/UX 정책

1. API 선택 영역은 화살표 토글(`▶`, `▼`) 기반 아코디언 UI를 사용한다.
2. `APIs in this Page`에서 API를 선택하면 `Select API` 상세가 펼쳐지는 구조를 유지한다.
3. 색상 체계는 `파스텔 초록 + 화이트`를 메인으로 하고, 서브는 메인 계열 그라데이션을 사용한다.
4. 버튼/입력/카드 컴포넌트는 라운드/그림자/호버 인터랙션 스타일을 일관되게 유지한다.
5. 디자인 변경 시 기능 구조(Group > Page > API Interface)는 훼손하지 않는다.

## 작성 규칙

1. Path는 리소스 중심 명명(`kebab-case`)
2. 상태코드는 실제 구현 예정 값만 명시
3. 에러 응답은 공통 포맷 사용
4. Breaking change는 새 버전 path 또는 명시적 공지 필요

## Response 정책

1. 최소 `200(or 201)` + `400`은 기본 작성
2. 인증 필요한 API는 `401/403` 작성
3. 서버 장애 가능 시 `500` 작성
4. 각 상태코드마다 예시 JSON 포함

## 검토 체크리스트

1. Group/Page/API Interface 계층이 맞게 배치되었는가
2. Method/Path가 REST 규칙에 맞는가
3. 요청/응답 JSON 스키마가 충돌 없는가
4. 필수 Header/Auth 조건이 명확한가
5. 프론트에서 필요한 에러코드가 누락되지 않았는가
6. ERD 변경사항과 API 명세가 일치하는가
7. Editor/Viewer 역할 분리가 유지되는가
8. API 선택 토글 UI와 상세 편집 흐름이 깨지지 않았는가
9. 테마(파스텔 초록/화이트 + 그라데이션)가 일관되게 적용되는가

## 승인 기준

1. 백엔드 담당 승인
2. 프론트 담당 확인
3. QA 또는 테스트 시나리오 반영
