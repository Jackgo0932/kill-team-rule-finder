// Cross-page keyword regression checks. Run: node tests/keyword-regression.test.cjs
// Lightweight contract tests, not a replacement for actual browser E2E testing.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
let count=0;
function check(name,fn){fn();console.log('PASS',name);count++;}
function functionSource(name){
 const start=code.indexOf('function '+name+'(');
 assert(start>=0,'Missing function '+name);
 const brace=code.indexOf('{',start);
 let depth=0,quote=null,escape=false,template=false;
 // Locate next top-level function declaration instead of parsing JS braces in templates.
 const next=code.slice(start+9).search(/\nfunction [A-Za-z_$][\w$]*\(/);
 return next<0?code.slice(start):code.slice(start,start+9+next);
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KW={piercing:{name:'穿刺',en:'Piercing',text:'穿刺規則'},poison:{name:'毒素',en:'Poison',text:'毒素規則'}};
const ctx={KW,window:{KT_WEAPON_PROFILES:{}},esc,document:{createElement:()=>({className:'',innerHTML:'',remove(){this.removed=true}})},console};
vm.createContext(ctx);
for(const name of ['localizeBattleEquipmentKeywords','toggleBattleEquipmentKeyword','toggleDictionaryWeaponRule','toggleFlowKeyword','toggleReferenceKeyword'])
 vm.runInContext(functionSource(name),ctx);
function fakeButton(id,section,container){
 const b={dataset:{keywordId:id},attributes:{'aria-expanded':'false'},classList:{add(){},remove(){}},
 getAttribute(k){return this.attributes[k]},setAttribute(k,v){this.attributes[k]=v},
 closest(q){if(q.includes('battle-equipment-entry'))return container;if(q.includes('grenade-section-text'))return section;return null}};
 return b;
}
check('battle equipment converts dictionary keyword handler',()=>{
 const html='<button class="term-link" onclick="openRule(\'dictionary:piercing\')">穿刺</button>';
 const result=ctx.localizeBattleEquipmentKeywords(html);
 assert.match(result,/onclick="toggleBattleEquipmentKeyword\(this\)"/);
 assert.match(result,/data-keyword-id="piercing"/);
 assert.doesNotMatch(result,/onclick="openRule/);
});
check('unknown keyword does not become broken local handler',()=>{
 const html='<button onclick="openRule(\'dictionary:unknown\')">?</button>';
 assert.equal(ctx.localizeBattleEquipmentKeywords(html),html);
});
check('battle equipment explanation stays in grenade section',()=>{
 const section={children:[],append(p){this.children.push(p)}};
 const container={querySelector(){return null},querySelectorAll(){return [button]}};
 const button=fakeButton('piercing',section,container);
 ctx.toggleBattleEquipmentKeyword(button);
 assert.equal(section.children.length,1);
 assert.match(section.children[0].innerHTML,/穿刺/);
 assert.equal(button.getAttribute('aria-expanded'),'true');
});
check('battle equipment explanation closes on second click',()=>{
 const section={children:[],append(p){this.children.push(p)}};
 let panel=null;
 const container={querySelector(){return panel},querySelectorAll(){return [button]}};
 const button=fakeButton('piercing',section,container);
 ctx.toggleBattleEquipmentKeyword(button);
 panel=section.children[0];
 ctx.toggleBattleEquipmentKeyword(button);
 assert.equal(panel.removed,true);
 assert.equal(button.getAttribute('aria-expanded'),'false');
});
check('battle equipment click does not call full render',()=>{
 assert.doesNotMatch(functionSource('toggleBattleEquipmentKeyword'),/\brender\s*\(/);
 assert.doesNotMatch(functionSource('toggleBattleEquipmentKeyword'),/\bopenRule\s*\(/);
});
check('dictionary weapon chips use local handlers',()=>{
 assert.match(functionSource('chip'),/toggleDictionaryWeaponRule\(this\)/);
 assert.doesNotMatch(functionSource('toggleDictionaryWeaponRule'),/\brender\s*\(/);
});
check('dictionary weapon rule scope stays inside weapon',()=>{
 assert.match(functionSource('toggleDictionaryWeaponRule'),/closest\("\.weapon,/);
 assert.match(functionSource('toggleDictionaryWeaponRule'),/weapon\.append\(panel\)/);
});
check('reference keywords use local handlers',()=>{
 assert.match(functionSource('markedProse'),/toggleReferenceKeyword\(this\)/);
 assert.doesNotMatch(functionSource('toggleReferenceKeyword'),/\brender\s*\(/);
});
check('reference weapon profile supports nested rule explanation',()=>{
 const s=functionSource('toggleReferenceKeyword');
 assert.match(s,/reference-local-profile/);
 assert.match(s,/reference-local-rule-explanation/);
});
check('flow term and core rule links use local handlers',()=>{
 assert.match(functionSource('flowTerm'),/toggleFlowKeyword\(this\)/);
 assert.match(functionSource('flowRule'),/toggleFlowKeyword\(this\)/);
});
check('flow keyword explanation is placed after its paragraph',()=>{
 const s=functionSource('toggleFlowKeyword');
 assert.match(s,/target\.insertAdjacentElement\("afterend",panel\)/);
 assert.doesNotMatch(s,/\brender\s*\(/);
});
check('flow label spacing remains defined',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
 assert.match(css,/\.flow-step-explain[\s\S]*?\.term-source|\.flow-inline[\s\S]*?\.term-source/);
});
check('dictionary equipment is read-only',()=>{
 const section=code.slice(code.indexOf('function items(){'),code.indexOf('function ',code.indexOf('function items(){')+10));
 assert.doesNotMatch(section,/equipmentSelectButton\(/);
 assert.doesNotMatch(section,/equipmentSelectionBlock\(/);
 assert.match(section,/sharedEquipmentDescription\(/);
});
check('match equipment uses confirmed battle roster selections',()=>{
 const source=functionSource('matchEquipmentSide');
 assert.match(source,/battleRoster\?\.equipment\?\.\[side\]/);
 assert.doesNotMatch(source,/equipmentBucket\(/);
});
check('explosive grenade range is an interactive chip',()=>{
 assert.match(functionSource('explosiveGrenadeCards'),/data-keyword-id="range"/);
 assert.match(functionSource('toggleDictionaryWeaponRule'),/id==="range"/);
});
check('confirmed match equipment opens local details instead of navigating',()=>{
 const fn=functionSource('openMatchEquipment');
 assert.match(fn,/sharedEquipmentDescription\(/);
 assert.match(fn,/insertAdjacentElement\("afterend",panel\)/);
 assert.doesNotMatch(fn,/S\.view=|\brender\(/);
});
check('legacy equipment selection code is removed',()=>{
 for(const name of ['equipmentBucket','toggleEquipment','equipmentSelectButton','equipmentSummary',
   'removeEquipment','equipmentOptionPicker','setSingleEquipmentOption','equipmentSelectionBlock']){
  assert.doesNotMatch(code,new RegExp('function\\s+'+name+'\\s*\\('));
 }
 assert.doesNotMatch(code,/ktEquipmentSelections|ktEquipmentOptionSelections/);
});
check('match equipment configuration and totals remain available',()=>{
 assert.match(code,/const EQUIPMENT_SELECTION_CONFIG=/);
 assert.match(code,/function equipmentOptionTotal\(/);
 assert.match(code,/function equipmentNameByKey\(/);
 assert.match(code,/function matchEquipmentSide\(/);
});
check('global search scans all teams independently of selected team',()=>{
 const fn=functionSource('globalRuleItems');
 assert.match(fn,/Object\.keys\(TEAMS\)/);
 assert.match(fn,/finally\{S\.team=original\}/);
 assert.match(functionSource('renderGlobalRules'),/globalRuleItems\(\)/);
});
check('team picker is only visible on team rules view',()=>{
 assert.match(functionSource('render'),/S\.view!=="team"/);
 assert.match(functionSource('openGlobalRule'),/S\.view="team"/);
});
check('global search handles array, object, and missing descriptions',()=>{
 vm.runInContext(functionSource('ruleSearchSnippet'),ctx);
 assert.equal(ctx.ruleSearchSnippet(['A','B']),'A · B');
 assert.equal(ctx.ruleSearchSnippet({zh:'擊殺行動',title:'Kill Op'}),'擊殺行動 · Kill Op');
 assert.equal(ctx.ruleSearchSnippet(undefined),'');
});
check('global results reuse original two-column rule cards',()=>{
 const fn=functionSource('renderGlobalRules');
 assert.match(fn,/x\.html\.replace\(/);
 assert.match(fn,/class="grid"/);
 assert.match(fn,/data-global-team/);
 assert.doesNotMatch(fn,/global-rule-result"/);
});
check('global results paginate without removing original card interactions',()=>{
 assert.match(functionSource('renderGlobalRules'),/globalResultLimit\|\|20/);
 assert.match(functionSource('loadMoreGlobalRules'),/\+20/);
 assert.match(code,/globalCard\.dataset\.globalTeam/);
});
check('Angels of Death chapter tactics selection uses review step 4',()=>{
 const fn=functionSource('chooseChapterTactic');
 assert.match(fn,/battleDraft\.step!==4/);
 assert.match(fn,/battleChapterDraft\[side\]\[slot\]=value/);
 assert.match(functionSource('renderBattleSetup'),/chapterTacticsPicker\("my"\)/);
});
check('Goremongers appear in ordinary team selector',()=>{
 const html=require('fs').readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
 assert.ok(html.includes('<option value="gm">灑血狂</option>'));
});
check('Goremongers roster and Tac Ops archetypes are configured',()=>{
 assert.ok(code.includes('"gm":{fixed:{"blood-herald":1},slots:7'));
 assert.ok(code.includes('"gm":["recon","seek"]'));
});
check('Goremongers operatives have offline local portraits',()=>{
 const fs=require('fs'),path=require('path');
 const data=fs.readFileSync(path.join(__dirname,'../data/goremongers.js'),'utf8');
 for(const id of ['blood-herald','aspirant','bloodtaker','impaler','inciter','skullclaimer','stalker']){
  const rel='assets/goremongers/'+id+'.webp';
  assert.ok(data.includes('"image": "'+rel+'"'),id);
  assert.ok(fs.statSync(path.join(__dirname,'..',rel)).size>1000,id);
 }
});
check('Goremongers UI is in Traditional Chinese',()=>{
 const fs=require('fs'),path=require('path');
 const data=fs.readFileSync(path.join(__dirname,'../data/goremongers.js'),'utf8');
 assert.ok(data.includes('灑血狂鮮血使者'));
 assert.ok(!data.includes('洒血狂'));
});
check('public info includes both strategic and firefight ploys',()=>{
 const fn=functionSource('trackerSidePanel');
 assert.ok(fn.includes('trackerPloyRows(side,"戰略計謀")'));
 assert.ok(fn.includes('trackerPloyRows(side,"交戰計謀")'));
});
check('public ploy effects expand locally and preserve choice options',()=>{
 const fn=functionSource('trackerPloyRows');
 assert.ok(fn.includes('markedProse(p[3]'));
 assert.ok(fn.includes('choiceOptionList(opts'));
 assert.ok(fn.includes('publicPloyDetail(this)'));
 const toggle=functionSource('publicPloyDetail');
 assert.ok(!toggle.includes('render('));
 assert.ok(toggle.includes('panel.hidden=!opening'));
});
check('firefight ploys use separate per-side tracking and toggle buttons',()=>{
 const fn=functionSource('toggleTrackerPloy');
 assert.match(fn,/usedFirefightPloys/);
 assert.match(fn,/usedPloys/);
 assert.match(functionSource('trackerPloyRows'),/toggleTrackerPloy/);
 assert.match(functionSource('trackerPloyRows'),/aria-pressed/);
});
check('next turning point clears both ploy types for both sides',()=>{
 const fn=functionSource('nextTurningPoint');
 assert.match(fn,/usedFirefightPloys=\[\]/);
 assert.match(fn,/usedPloys=\[\]/);
 assert.match(fn,/\["my","enemy"\]/);
});
check('Celestian Benediction uses Traditional Chinese in both contexts',()=>{
 const fs=require('fs'),path=require('path');
 const ci=fs.readFileSync(path.join(__dirname,'../data/celestian_insidiants.js'),'utf8');
 assert.doesNotMatch(ci,/祷/);
 assert.equal((ci.match(/禱祝/g)||[]).length,2);
});
check('strategic gambits include team rules and operative abilities',()=>{
 const source=functionSource('teamStrategicGambits');
 assert.match(source,/team\?\.rules/);
 assert.match(source,/op\.abilities/);
 assert.match(source,/戰略計劃/);
});
check('strategic gambit panel shows effects and source',()=>{
 const source=functionSource('trackerStrategicGambitRows');
 assert.match(source,/publicPloyDetail/);
 assert.match(source,/markedProse\(g\.body/);
 assert.match(source,/g\.source/);
});
check('strategic gambit TP reset preserves battle-limited usage',()=>{
 const source=functionSource('nextTurningPoint');
 assert.match(source,/usedStrategicGambits/);
 assert.match(source,/endsWith\(":battle"\)/);
});
check('public ploy and gambit keyword scopes stay local',()=>{
 const source=functionSource('markedProse');
 for(const prefix of ['public-ploy','public-ploy2','public-gambit']) assert.match(source,new RegExp(prefix));
 assert.match(functionSource('toggleReferenceKeyword'),/tracker-ploy-effect/);
});
check('public ploy keyword click does not re-render or collapse panel',()=>{
 const source=functionSource('toggleReferenceKeyword');
 assert.doesNotMatch(source,/\brender\s*\(/);
 assert.doesNotMatch(source,/\bopenRule\s*\(/);
 assert.doesNotMatch(source,/\bpublicPloyDetail\s*\(/);
});
check('strategic gambits filter operative and equipment sources by selected roster',()=>{
 const source=functionSource('teamStrategicGambits');
 assert.match(source,/selectedOps\.includes\(op\.id\)/);
 assert.match(source,/selectedEquipment\.includes\(`e:\$\{e\[0\]\}`\)/);
 assert.match(source,/team\?\.rules/);
});
check('public strategic gambits and usage toggles share the same side-aware filtering',()=>{
 assert.match(functionSource('trackerStrategicGambitRows'),/teamStrategicGambits\(trackerTeam\(side\),side\)/);
 assert.match(functionSource('toggleStrategicGambit'),/teamStrategicGambits\(trackerTeam\(side\),side\)/);
});
check('strategic gambit filtering works on real roster values',()=>{
 const f=functionSource('teamStrategicGambits');
 const mock={battleRoster:{my:['a'],equipment:{my:['e:flag']}},console};
 vm.createContext(mock);vm.runInContext(f,mock);
 const team={rules:[['r','Team','戰略計劃 team']],operatives:[{id:'a',name:'A',abilities:[['A','戰略計劃 A']]},{id:'b',name:'B',abilities:[['B','戰略計劃 B']]}],equipment:[['flag','Flag','戰略計劃 Flag'],['other','Other','戰略計劃 Other']]};
 const rows=mock.teamStrategicGambits(team,'my');
 assert.deepEqual(Array.from(rows,r=>r.name),['Team','A','Flag']);
});
console.log(`\n${count} keyword regression checks passed`);
