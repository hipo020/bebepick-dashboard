'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.lastIndexOf('<script>'),end=html.lastIndexOf('</script>');
test('embedded dashboard JavaScript compiles after outage recovery changes',()=>{
 assert.ok(start>=0&&end>start);
 assert.doesNotThrow(()=>new vm.Script(html.slice(start+8,end)));
});
test('saved list is displayed as unverified and cannot trigger stale cart submissions',()=>{
 assert.match(html,/sourceUnavailable = data\.source_unavailable === true/);
 assert.match(html,/sourceUnavailable && products\.length && filter === "available"/);
 assert.match(html,/filter = "all";/);
 assert.match(html,/if \(sourceUnavailable\) return false;/);
 assert.match(html,/if \(sourceUnavailable\) throw new Error\("공식 상품목록 확인 불가/);
 assert.match(html,/const stock = sourceUnavailable \? "—"/);
 assert.match(html,/sourceUnavailable \? "현재 상태 미확인"/);
 assert.match(html,/if \(!sourceUnavailable\) await hydrateClientStats\(\)/);
});
