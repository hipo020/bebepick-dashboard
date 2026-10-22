'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'bebepick-quick-order-general-v24.js'), 'utf8');
function section(a,b) {
 const i=src.indexOf(a),j=src.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'missing '+a);
 return src.slice(i,j);
}
const qty = new Function(section('function normalized(', 'function expected()')+
  '\nreturn {countQuantities,quantityText,normalized};')();
test('new bookmarklet syntax remains valid',()=>{
 assert.doesNotThrow(()=>new Function(src));
});
test('five separate singles display as five pieces rather than five kinds',()=>{
 const five=qty.countQuantities([
  {sku:'D101',option:'single',qty:1},{sku:'D102',option:'single',qty:2},
  {sku:'D103',option:'single',qty:2}],x=>x.option);
 assert.equal(qty.quantityText(five),'5개');
});
test('one SKU with a quantity of five displays five pieces',()=>{
 assert.equal(qty.quantityText(qty.countQuantities([{sku:'D824',option:'single',qty:5}],x=>x.option)),'5개');
});
test('cart distinguishes total count from number of lines',()=>{
 const cart=[{sku:'D824',opt:'single',qty:5}];
 const counts=qty.countQuantities(cart,qty.normalized);
 assert.equal(qty.quantityText(counts),'5개');
 assert.equal(cart.length,1);
});
test('fullbox quantities are represented as sets, not individual dolls',()=>{
 assert.equal(qty.quantityText(qty.countQuantities([{option:'fullbox',qty:2},{option:'single',qty:3}],x=>x.option)),
  '3개 + 풀박스 2세트');
});
test('corrupt counts do not inflate totals; unreadable cart is marked unknown',()=>{
 assert.equal(qty.quantityText(qty.countQuantities([{option:'single',qty:-1},{option:'single',qty:'x'},{option:'single',qty:2}],x=>x.option)),'2개');
 assert.equal(qty.quantityText(null),'확인 불가');
});
test('top-of-panel quantities shown for both the saved items and local cart',()=>{
 assert.match(src,/id="qQuantitySummary"/);
 const ui=section('function renderModeSections(', 'function renderBasket()');
 assert.match(ui,/quantitySummary\.textContent/);
 assert.match(ui,/도우미 등록 총 수량/);
 assert.match(ui,/이 브라우저 장바구니 총 수량/);
 assert.match(ui,/이름 후보 1종 주문 모드/);
});
test('new item quantity entry explicitly says it is not the total',()=>{
 assert.match(src,/새로 추가할 인형 수량 \(총합 아님\)/);
 assert.match(src,/id="qQty"/);
});
