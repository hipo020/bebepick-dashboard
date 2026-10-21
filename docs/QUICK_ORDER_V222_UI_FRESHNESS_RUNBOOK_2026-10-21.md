# 범용 공식 홈페이지 빠른 주문 v2.2.2: 닫힘→열림 상태 / 화면 미갱신 / 자동 스크롤 (2026-10-21)

## 사용자 실전 증상 (D706)

- 2026-10-21 D706 낱개·개봉·보관, 서버 확인 주기 5초. 사용자 제공 JSON v2.2.1:
  - `startedAt=2026-10-21T00:39:22.350Z` (UTC), `checks=1`, `order_windows=84ms`, `list_products=115.6ms`, 병렬 라운드 124ms.
  - `sellable` 관측 뒤 `cart_click` 17.2ms, `checkout_click` 45.0ms, `confirm_visible` 128.4ms, `submit_click` **136.0ms**.
  - `submit_click`는 브라우저 DOM 클릭 호출 시간일 뿐 실제 서버 주문 접수/새 주문번호 확인이 아님.
- 사용자는 "이미 열려 있을 때는 동작, 닫혀 있다가 열릴 때는 새로고침이 안 되는 듯", "자동으로 화면이 내려가지 않음"을 보고함.
- 해당 JSON은 처음 서버 조회에서 `window_open`이 이미 나타난 **단일 조회**임. 따라서 닫힘→열림 전환 시각 자체는 이 JSON만으로 재현되지 않음.

## 진단 원인

- v2.2.1 `poll()`은 독립 공식 RPC `order_windows`, `list_products`로 서버 상태를 확인.
- 서버가 ON으로 바뀌어도 `handoff()`는 공식 사이트 HTML의 `#storeBar .sb-order.open`, 상품 카드 `.soldout`, 장바구니 버튼 `disabled` 등 **별개 DOM 표시가 갱신돼야만** 클릭.
- 과거 `refreshRoute()`는 URL `#terms` 해시를 바꿔 사이트 자체 화면 갱신을 유도했으나 실제 갱신을 보장하는 공식 API임을 확인하지 못함.
- 이전엔 서버 ON 후 `confirmed=true`이면 기본 서버 재확인 타이머가 중단되고, DOM이 갱신되지 않을 때 오래 기다릴 수 있었음.
- v2.2.1에는 아직 overlay 자동 접기 / scrollIntoView 코드가 없었음. 해당 기능은 배포되지 않은 v2.3 개발 브랜치에만 있었음.

## 변경 사항 — 별도 v2.2.2

- `bebepick-quick-order-general-v222.js`를 **새 파일**로 추가해 구버전 `bebepick-quick-order-general-v2.js`(v2.2.1)와 기존 설치 URL은 그대로 보존.
- `bebepick-quick-order-v222-install.html` 새 북마크 설치; `?v=20261021-v222-ui-stale-scroll` 캐시 구분.
- `window_closed`와 `window_transition` 타이밍 로그를 구분. 기존 `window_open`은 유지. 새 타이밍 리포트 `version=2.2.2`이며 JSON `kind=bebepick-quick-order-timing-v22`를 유지.
- 서버 판매·접수 모두 허용되면 공식 UI를 **DOM 변화 + 250ms 읽기 전용 검사**로 확인. 기존 5/8/10/15/30/60초 서버 polling은 절대 늘리지 않음.
- 공식 사이트 UI가 **5초 동안 닫힘/품절로 남거나 주문 버튼이 비활성화되어 있으면** `ui_stale`을 기록하고 `confirmed` 잠금을 해제해서 정상 서버 조회 주기를 재개.
- UI가 여전히 닫혔다고 표시된 경우 공식 버튼을 강제 활성화/클릭하지 않고, 사용자가 확인할 **공식 화면 새로고침** 버튼과 경고를 표시. 해당 버튼은 새로고침 후 북마크를 **다시 실행해야 함**을 알리고 사용자의 확인을 받음.
- 기존 URL `#terms` soft-refresh는 기존 로직으로 남지만 **사이트가 이를 받는다는 보장은 없다**. Chrome 북마클릿은 새로고침 뒤 자동 재주입하지 못한다.
- 주문 버튼이 실제로 활성일 때 클릭하고 공식 카트로 넘어가면 긴 floating 도우미를 **상단 오른쪽 작은 복원 버튼**으로 접음. 이후 공식 장바구니, 1·2단계 확인 대화상자, PayApp 이동 버튼의 화면 위치로 **스크롤만** 자동 시행. 결제 승인/추가 클릭 없음.
- 화면 감시 MutationObserver는 자기 자신의 status/text updates를 필터하여 반복/재귀 동작 방지.
- `refreshRoute()`의 비동기 후속 호출에서도 **active&&confirmed**가 아닐 때 `handoff()`를 호출하지 않도록 수정.
- 실주문 무전송 ON 기본, 카트 항목 검사, 수령·개봉, 1회 주문 클릭, 3분 세션 중복 보호 정책 변경 없음.
- 기존 코드의 정상으로 확인된 한 상품 주문 동작을 유지하는 **회귀 수정**이며 v2.3 다중 상품 구매 코드는 합치지 않음.

## 검증 / 한계

- 새 구조/DOM 안전 테스트 `tests/general-fast-order-v222-refresh.test.mjs` 5개.
- CI: 기존 안정 v2.2.1 테스트 23개 + 새 v2.2.2 테스트 5개.
- 공식 app.js를 직접 재확인하지 못함. 그래서 닫힘→열림의 UI가 **반드시 자동 갱신된다고 보장할 수 없음**. 실제 열림 상태라도 공식 홈페이지가 화면을 갱신하지 않으면 사용자 수동 새로고침과 북마크 재실행이 필요할 수 있음.
- 실제 새 재고/닫힘→열림 전환 및 주문 완료를 테스트하지 않음. 사용자 실전 주문 버튼을 임의로 호출하지 않았음.
- 문제가 있으면 안정판 v2.2.1 설치 주소 https://hipo020.github.io/bebepick-dashboard/bebepick-quick-order-v22-install.html 로 복귀 가능. v2.3은 여전히 PR #51 미배포.
