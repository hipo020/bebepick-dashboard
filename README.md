# Bebepick Dashboard

베베픽 재고를 모바일에서 보기 위한 정적 웹페이지입니다.

- 실제 감시/DB: Supabase `schedule-app`
- 백엔드 함수: `bebepick-dashboard`
- 화면: GitHub Pages
- 1분 자동 갱신
- 검색 / 판매중·품절·숨김 필터
- 재고 적은 순 / 많은 순 / 이름순
- 상품 이미지 / 가격 / 풀박스 가격 / 재고 표시

이 저장소에는 비밀키를 저장하지 않습니다.

## GitHub Pages

Repository Settings → Pages에서
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)

로 한 번만 설정하면 됩니다.

예상 주소:
https://hipo020.github.io/bebepick-dashboard/


## 개인용 공식 주문번호 발급 (주문 생성은 명시적 최종 확인 후에만)

- 재고판 장바구니에서 낱개/풀박스, 여러 종류 및 수량을 선택할 수 있습니다.
- 발송/보관 + 미개봉/개봉/카드개봉 옵션을 확인할 수 있습니다.
- 공식 홈페이지 소스와 동일하게 상품 합계 70,000원 이상일 때 요청 배송비 0원, 미만일 때 4,000원을 더해 `create_web_order` RPC에 전송합니다. **실제 입금액은 판매자 카카오톡 안내를 우선합니다.**
- 최종 주문 생성은 버튼 클릭 후 상품/옵션/금액 확인창 승인으로만 실행됩니다. 자동 주문이나 자동 재시도는 없습니다.
- 발급 번호에 `set_web_order_customer_memo` RPC로 발송/보관·개봉 옵션을 저장합니다. 메모 저장 실패 시 기존 번호로 메모만 재시도하며 주문 자체를 재생성하지 않습니다.
- 별도 Supabase Edge Function `bebepick-personal-checkout`이 외부 공식 RPC 두 개만 처리하고, 자체 비공개 테이블 `bebepick_order_attempts`로 사용자 요청 idempotency 및 불확실한 주문 응답을 관리합니다.
- 실제 주문 RPC는 Edge Function 내에 암호화된 연동키가 아닌 **개인 고강도 토큰의 SHA-256 해시만** 저장하고 개인용 UI에서 사용자가 직접 연동키를 입력한 다음 실행합니다. **연동키 원문은 이 GitHub 저장소에 저장하지 마세요.**
- 외부 Supabase 계정/프로젝트의 테이블을 직접 변경하지 않습니다. 요청은 사용자 승인 후 공식 주문 RPC만 호출합니다.
- 개발 중 실제 판매자 주문은 생성하거나 테스트하지 않았습니다. CORS/권한/실제 주문 동작 검증은 첫 사용자 승인 실주문 시에만 가능합니다.
- 장바구니 및 발급한 주문번호는 브라우저의 `localStorage`에 저장됩니다. **주문 생성 중 페이지를 종료하거나 HTTP 요청이 불확실하면 재주문하지 말고 기존 주문번호 및 고객센터를 확인해야 합니다.**
- 코드만으로는 실주문 처리 속도 및 판매자 서버 동작을 보장할 수 없습니다.

