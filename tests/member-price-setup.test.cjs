'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const page=readFileSync(resolve(__dirname,'../member-price-setup.html'),'utf8');
const monitor=readFileSync(resolve(__dirname,'../new-site.html'),'utf8');
test('member setup is explicit that server login and 24/7 price collector are NOT active',()=>{
 assert.match(page,/서버용 회원 가격 연결 전/);
 assert.match(page,/24시간 자동 가격 수집은 작동하지 않아/);
 assert.match(page,/PC 꺼짐 상태 가격 감시/);
 assert.match(page,/아직 미지원/);
 assert.match(page,/2026년 11월 5일 점검 결과/);
});
test('public static setup page never captures or transmits credentials or sessions',()=>{
 assert.doesNotMatch(page,/<(?:form|input|textarea|select)\b/i);
 assert.doesNotMatch(page,/<script\b|\bfetch\s*\(|\bXMLHttpRequest\b|\bpostMessage\s*\(|\blocalStorage\b|\bsessionStorage\b/i);
 assert.doesNotMatch(page,/(?:apiKey|access_token|refresh_token)\s*[:=]|Authorization\s*[:=]|cookie\s*=/i);
 assert.match(page,/비밀번호·인증번호·쿠키/);
 assert.match(page,/주문 권한도 포함할 수 있어/);
});
test('setup links only to real existing browser-only option and first-party login',()=>{
 assert.match(page,/href="\.\/bebepick-chrome-member-auto-prices-install\.html"/);
 assert.match(page,/href="https:\/\/bebepick\.me\/live"/);
 assert.match(page,/브라우저 가격 확인/);
 assert.match(page,/컴퓨터를 끄면 멈추며 서버 24시간 연동은 아니야/);
 assert.match(monitor,/href="\.\/member-price-setup\.html"/);
 assert.match(monitor,/미연결/);
});
