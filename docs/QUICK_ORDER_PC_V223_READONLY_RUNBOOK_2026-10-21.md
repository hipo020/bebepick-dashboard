# 베베픽 PC 읽기 전용 진단 v2.2.3 (2026-10-21)

## 목적
주문 접수가 닫혔다가 열릴 때 공식 서버 order_windows가 ON인 시각과 홈페이지 DOM이 ON으로 표시되는 시각, 주문 버튼 enabled 시각을 따로 기록한다.
이것은 실주문용 v2.2.2가 아니라 PC 진단 전용 북마크다. 장바구니·결제·동의·주문 버튼을 클릭하거나 변경하지 않는다.

## 사용법
1. https://hipo020.github.io/bebepick-dashboard/bebepick-pc-ui-diagnostic-v223-install.html 에서 진단용 북마크 코드 복사.
2. 크롬에서 Ctrl+D로 새 북마크를 만든 뒤 Ctrl+Shift+O로 북마크 관리자 열기 → 수정 → URL에 코드 붙여넣기.
3. 공식 https://bebepick.me/plus 또는 /live 에서 해당 북마크 클릭 → 진단 시작.
4. 원하는 SKU를 입력하면 list_products를 추가 조회하며, 비워두면 order_windows만 조회한다.
5. 8초 기본 주기로 공식 서버를 읽기 전용 조회하고 공식 DOM은 250ms마다 관찰. 중지 → JSON 저장 후 채팅에 첨부.

## 기록과 개인정보
server_initial, server_transition, official_dom_change, server_on_dom_closed, product_list_change, read_error 이벤트를 ISO UTC 시각과 경과 ms로 기록한다.
주문번호, 전화번호, 쿠키, 인증토큰, 계정 정보는 진단 JSON에 넣지 않는다.
필요한 경우 기존 사이트 로그인 세션 토큰을 공식 Supabase에만 사용하여 읽기 전용 조회하지만 토큰은 어떤 로그에도 저장하지 않는다.
다른 자동주문 도우미가 실행 중이면 동시 작동을 방지한다. 탭 백그라운드 동안 조회를 일시 중단하고 새로고침하면 진단이 종료된다.

## 한계
공식 내부 함수 loadWindows/applyWindows를 호출하거나 화면을 강제로 갱신하지 않는다. 진단은 느린 지점 측정용이고 닫힘→열림 문제의 직접적인 해결책은 아니다.
실제 주문 접수 전환을 아직 측정하지 못했고 모의 안전성 테스트 6개만 통과했다.
실주문용 v2.2.2와 다중 상품 v2.3은 변경하지 않았다.