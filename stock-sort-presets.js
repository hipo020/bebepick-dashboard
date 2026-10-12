// Product sort menus adapt to the selected filter. All timestamps are OBSERVED,
// not guarantees of the actual seller-side sellout/discontinuation time.
const PRODUCT_SORT_CHOICES = {
  available: [["desc","재고 많은 순"],["asc","재고 적은 순"],["popular","최근 재고 감소순"],["recent_created","최근 등록순"],["name","이름순"]],
  all: [["desc","재고 많은 순"],["popular","최근 재고 감소순"],["recent_created","최근 등록순"],["hidden_first","숨김 우선순"],["name","이름순"]],
  hidden: [["hidden_recent","최근 숨김 감지순"],["desc","재고 많은 순"],["recent_created","최근 등록순"],["name","이름순"]],
  hidden_stock: [["hidden_recent","최근 숨김 감지순"],["desc","재고 많은 순"],["recent_created","최근 등록순"],["name","이름순"]],
  upcoming: [["recent_created","최근 등록순"],["desc","재고 많은 순"],["name","이름순"]],
  unavailable: [["unavailable_recent","최근 종료 감지순"],["unavailable_old","오래된 종료 감지순"],["desc","재고 많은 순"],["recent_created","최근 등록순"],["name","이름순"]],
  recent_restock: [["recent_restock_sort","최근 재입고순"],["desc","재고 많은 순"],["name","이름순"]]
};
function productSortChoices(filter) {
  return PRODUCT_SORT_CHOICES[filter] || PRODUCT_SORT_CHOICES.available;
}
function productSortDefault(filter) {
  return productSortChoices(filter)[0][0];
}
function syncProductSortOptions(filter, selected) {
  const select = document.getElementById("sort");
  const options = productSortChoices(filter);
  const expected = options.map(([key])=>key).join("|");
  const existing = Array.from(select.options).map(o=>o.value).join("|");
  if(existing !== expected) {
    select.replaceChildren(...options.map(([key,label])=>{
      const option=document.createElement("option");
      option.value=key;
      option.textContent=label;
      return option;
    }));
  }
  const result=options.some(([key])=>key===selected) ? selected : options[0][0];
  select.value=result;
  select.title=filter==="unavailable"
    ? "품절 또는 판매 숨김이 감지된 시각 기준이야. 실제 판매 종료시각과 다를 수 있어."
    : "표시 중인 상품의 정렬 기준";
  return result;
}
function observedUnavailableAt(product) {
  if(product?.state==="sold_out") {
    if(product.last_event==="sold_out" && product.last_event_at)
      return product.last_event_at;
    return product.last_sold_out_at || null;
  }
  if(product?.state==="hidden" && product.last_event==="removed")
    return product.last_event_at || null;
  return null; // No reliable event: always sorted last, never guess.
}
