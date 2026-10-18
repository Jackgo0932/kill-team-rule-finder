let KEYWORDS=[], QUICK=[], TEAMS={}, UNIVERSAL_EQUIPMENT=[], TAC_OPS=[], CRIT_OPS=[], KILL_OP=null, APPROVED_OPS={flow:[],maps:[],mapNote:""};
let KW={};
let TERM_INDEX={};

const LEGACY_TEAM=localStorage.getItem("ktTeam")||"pm";
const SAVED_MY_TEAM=localStorage.getItem("ktMyTeam")||LEGACY_TEAM;
const SAVED_ENEMY_TEAM=localStorage.getItem("ktEnemyTeam")||(SAVED_MY_TEAM==="aod"?"pm":"aod");
const SAVED_SIDE=localStorage.getItem("ktSide")==="enemy"?"enemy":"my";

const S={
  myTeam:SAVED_MY_TEAM,
  enemyTeam:SAVED_ENEMY_TEAM,
  side:SAVED_SIDE,
  team:LEGACY_TEAM,
  tab:"全部",
  view:"all",
  matchTab:"roster",
  q:"",
  subtab:"全部",
  open:new Set(),
  flowOpen:new Set(),
  fav:new Set(JSON.parse(localStorage.getItem("ktFav")||"[]")),
  equipmentSelections:JSON.parse(localStorage.getItem("ktEquipmentSelections")||'{"my":{},"enemy":{}}'),
  equipmentOptionSelections:JSON.parse(localStorage.getItem("ktEquipmentOptionSelections")||'{"my":{},"enemy":{}}'),
  recentViewed:JSON.parse(localStorage.getItem("ktRecentViewed")||"[]"),
  matchTracker:JSON.parse(localStorage.getItem("ktMatchTracker")||'null')||{
    tp:1, initiative:"my",
    sides:{
      my:{cp:0,cards:{"重擲":0,"+1/-1":0,"+2/-2":0,"+3/-3":0},usedPloys:[]},
      enemy:{cp:0,cards:{"重擲":0,"+1/-1":0,"+2/-2":0,"+3/-3":0},usedPloys:[]}
    }, log:[]
  }
};


function equipmentBucket(side=S.side,teamId=(side==="enemy"?S.enemyTeam:S.myTeam)){
  if(!S.equipmentSelections[side]) S.equipmentSelections[side]={};
  if(!Array.isArray(S.equipmentSelections[side][teamId])) S.equipmentSelections[side][teamId]=[];
  return S.equipmentSelections[side][teamId];
}
function saveEquipmentSelections(){
  localStorage.setItem("ktEquipmentSelections",JSON.stringify(S.equipmentSelections));
}
function equipmentKey(kind,id){return `${kind}:${id}`}
function isEquipmentSelected(kind,id){
  return equipmentBucket().includes(equipmentKey(kind,id));
}
function toggleEquipment(kind,id){
  const key=equipmentKey(kind,id),bucket=equipmentBucket();
  const at=bucket.indexOf(key);
  if(at>=0){
    bucket.splice(at,1);
    const optionStore=equipmentOptionStore();
    delete optionStore[key];
    saveEquipmentOptionSelections();
  }
  else{
    bucket.push(key);
  }
  saveEquipmentSelections();
  render();
}
function equipmentSelectButton(kind,id){
  const selected=isEquipmentSelected(kind,id);
  return `<button class="equipment-pick ${selected?"on":""}" onclick="toggleEquipment('${kind}','${id}')" aria-pressed="${selected?"true":"false"}">${selected?"✓ 已選":"＋ 選擇"}</button>`;
}
function equipmentNameByKey(teamId,key){
  const [kind,id]=key.split(":");
  if(kind==="ue"){
    const x=UNIVERSAL_EQUIPMENT.find(x=>x[0]===id);
    return x?x[1]:id;
  }
  const t=TEAMS[teamId];
  const x=(t?.equipment||[]).find(x=>x[0]===id);
  return x?x[1]:id;
}
function equipmentSummary(side){
  const teamId=side==="enemy"?S.enemyTeam:S.myTeam;
  const bucket=equipmentBucket(side,teamId);
  const items=bucket.map(key=>`<button class="equipment-summary-chip" onclick="removeEquipment('${side}','${teamId}','${key}')">${esc(equipmentNameByKey(teamId,key))}${equipmentOptionSummary(side,teamId,key)}<span>×</span></button>`).join("");
  return `<div class="equipment-summary ${S.side===side?"active":""}">
    <div class="equipment-summary-head"><b>${side==="my"?"我方":"敵方"}裝備</b><span>已選 ${bucket.length}</span></div>
    <div class="equipment-summary-items">${items||`<span class="equipment-summary-empty">尚未選擇</span>`}</div>
  </div>`;
}
function removeEquipment(side,teamId,key){
  const bucket=equipmentBucket(side,teamId);
  const at=bucket.indexOf(key);
  if(at>=0) bucket.splice(at,1);
  const optionStore=equipmentOptionStore(side,teamId);
  delete optionStore[key];
  saveEquipmentSelections();
  saveEquipmentOptionSelections();
  render();
}


function equipmentOptionStore(side=S.side,teamId=(side==="enemy"?S.enemyTeam:S.myTeam)){
  if(!S.equipmentOptionSelections[side]) S.equipmentOptionSelections[side]={};
  if(!S.equipmentOptionSelections[side][teamId]) S.equipmentOptionSelections[side][teamId]={};
  return S.equipmentOptionSelections[side][teamId];
}
function saveEquipmentOptionSelections(){
  localStorage.setItem("ktEquipmentOptionSelections",JSON.stringify(S.equipmentOptionSelections));
}
function equipmentOptionKey(kind,id){return `${kind}:${id}`}
function selectedEquipmentOptions(kind,id){
  const store=equipmentOptionStore();
  const key=equipmentOptionKey(kind,id);
  const raw=store[key];
  // v2.2.9.3 used an array. Migrate it in place to { option: quantity }.
  if(Array.isArray(raw)){
    const counts={};
    raw.forEach(option=>counts[option]=(counts[option]||0)+1);
    store[key]=counts;
    saveEquipmentOptionSelections();
  }else if(!raw || typeof raw!=="object"){
    store[key]={};
  }
  return store[key];
}
function equipmentOptionTotal(counts){
  return Object.values(counts||{}).reduce((sum,n)=>sum+(Number(n)||0),0);
}
function changeEquipmentOption(kind,id,option,delta,maxTotal=2){
  const counts=selectedEquipmentOptions(kind,id);
  const current=Number(counts[option]||0);
  const total=equipmentOptionTotal(counts);
  if(delta>0 && total>=maxTotal){
    const note=document.querySelector("#equipmentLimitNote");
    if(note){
      note.textContent=`這項裝備合計最多選擇 ${maxTotal} 個。`;
      note.classList.add("show");
      setTimeout(()=>note.classList.remove("show"),2200);
    }
    return;
  }
  const next=Math.max(0,current+delta);
  if(next) counts[option]=next;
  else delete counts[option];
  saveEquipmentOptionSelections();
  render();
}
function equipmentOptionPicker(kind,id,options,maxTotal=2){
  const counts=selectedEquipmentOptions(kind,id);
  const total=equipmentOptionTotal(counts);
  if(maxTotal===1){
    return `<div class="equipment-option-picker">
      <div class="equipment-option-picker-head"><b>裝備內選擇</b><span>${total}/1</span></div>
      <div class="equipment-option-single-list">${options.map(option=>{
        const selected=Number(counts[option]||0)>0;
        return `<button class="equipment-option-single ${selected?"on":""}" onclick="setSingleEquipmentOption('${kind}','${id}','${option}')">${selected?"✓ ":""}${esc(option)}</button>`;
      }).join("")}</div>
    </div>`;
  }
  return `<div class="equipment-option-picker">
    <div class="equipment-option-picker-head"><b>裝備內選擇</b><span>${total}/${maxTotal}</span></div>
    <div class="equipment-option-qty-list">${options.map(option=>{
      const qty=Number(counts[option]||0);
      return `<div class="equipment-option-qty">
        <span>${esc(option)}</span>
        <div class="equipment-option-stepper">
          <button onclick="changeEquipmentOption('${kind}','${id}','${option}',-1,${maxTotal})" ${qty<=0?"disabled":""}>−</button>
          <b>${qty}</b>
          <button onclick="changeEquipmentOption('${kind}','${id}','${option}',1,${maxTotal})" ${total>=maxTotal?"disabled":""}>＋</button>
        </div>
      </div>`;
    }).join("")}</div>
  </div>`;
}
function setSingleEquipmentOption(kind,id,option){
  const counts=selectedEquipmentOptions(kind,id);
  const already=Number(counts[option]||0)>0;
  Object.keys(counts).forEach(k=>delete counts[k]);
  if(!already) counts[option]=1;
  saveEquipmentOptionSelections();
  render();
}
function equipmentOptionSummary(side,teamId,key){
  const store=equipmentOptionStore(side,teamId);
  let selected=store[key];
  if(Array.isArray(selected)){
    const counts={};
    selected.forEach(option=>counts[option]=(counts[option]||0)+1);
    selected=store[key]=counts;
    saveEquipmentOptionSelections();
  }
  if(!selected || typeof selected!=="object") return "";
  const labels=Object.entries(selected).filter(([,qty])=>Number(qty)>0).map(([option,qty])=>Number(qty)>1?`${option} ×${qty}`:option);
  return labels.length?` <small>(${labels.map(esc).join("＋")})</small>`:"";
}


const EQUIPMENT_SELECTION_CONFIG={
  "ue:utility-grenades":{
    maxTotal:2,
    options:["煙霧手雷","震盪手雷"]
  },
  "ue:explosive-grenades":{
    maxTotal:2,
    options:["破片手雷","穿甲手雷"]
  },
  "wk:e:glyphs":{
    maxTotal:1,
    options:["WAAAGH!","毀滅"]
  }
};
function equipmentSelectionConfig(kind,id){
  const genericKey=equipmentOptionKey(kind,id);
  const teamKey=`${S.team}:${genericKey}`;
  return EQUIPMENT_SELECTION_CONFIG[teamKey]||EQUIPMENT_SELECTION_CONFIG[genericKey]||null;
}
function equipmentSelectionBlock(kind,id){
  if(!isEquipmentSelected(kind,id)) return "";
  const cfg=equipmentSelectionConfig(kind,id);
  return cfg?equipmentOptionPicker(kind,id,cfg.options,cfg.maxTotal):"";
}


const INITIATIVE_CARDS=["重擲","+1/-1","+2/-2","+3/-3"];
function ensureMatchTracker(){
  const m=S.matchTracker||(S.matchTracker={});
  m.tp=Math.min(4,Math.max(1,Number(m.tp)||1));
  if(!["my","enemy"].includes(m.initiative))m.initiative="my";
  if(!m.sides)m.sides={};
  ["my","enemy"].forEach(side=>{
    const x=m.sides[side]||(m.sides[side]={});
    x.cp=Math.max(0,Number(x.cp)||0);
    x.vp=Math.max(0,Number(x.vp)||0);
    if(!x.cards)x.cards={};
    INITIATIVE_CARDS.forEach(c=>x.cards[c]=Math.max(0,Number(x.cards[c])||0));
    if(!Array.isArray(x.usedPloys))x.usedPloys=[];
  });
  if(!Array.isArray(m.log))m.log=[];
  m.log.forEach((e,i)=>{if(!e.id)e.id=`legacy-${i}-${e.tp||1}-${e.at||""}`});
  return m;
}
function saveMatchTracker(){ensureMatchTracker();localStorage.setItem("ktMatchTracker",JSON.stringify(S.matchTracker))}
function trackerTeamId(side){return battleRoster?.[side+"Team"]||(side==="my"?S.myTeam:S.enemyTeam)}
function trackerSideName(side){return side==="my"?"我方":"敵方"}
function trackerTeam(side){return TEAMS[trackerTeamId(side)]}
function trackerLog(text){
  const m=ensureMatchTracker();
  m.log.unshift({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,tp:m.tp,text,at:new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})});
}
function refreshMatchUI(){
  if(S.view==="match")renderMatchHub();
  else renderMatchTracker();
}
function removeMatchLog(id){
  const m=ensureMatchTracker();
  const index=m.log.findIndex(e=>e.id===id);
  if(index<0)return;
  const entry=m.log[index];
  if(!confirm(`移除這筆戰鬥紀錄？\n\nTP${entry.tp} · ${entry.text}`))return;
  m.log.splice(index,1);
  saveMatchTracker();refreshMatchUI();
}
function changeTrackerVP(side,delta){
  const m=ensureMatchTracker(),x=m.sides[side],old=x.vp;
  x.vp=Math.max(0,x.vp+delta);
  if(x.vp!==old)trackerLog(`${trackerSideName(side)} VP ${delta>0?"+":""}${delta} → ${x.vp}`);
  saveMatchTracker();refreshMatchUI();
}
function addManualMatchLog(){
  const input=document.querySelector("#manualMatchLog");
  const text=(input?.value||"").trim();
  if(!text)return;
  trackerLog(text);saveMatchTracker();renderMatchHub();
}
function changeTrackerCP(side,delta){
  const m=ensureMatchTracker(),x=m.sides[side],old=x.cp;
  x.cp=Math.max(0,x.cp+delta);
  if(x.cp!==old)trackerLog(`${trackerSideName(side)} CP ${delta>0?"+":""}${delta} → ${x.cp}`);
  saveMatchTracker();refreshMatchUI();
}
function setTrackerInitiative(side){
  const m=ensureMatchTracker();
  if(m.initiative!==side){m.initiative=side;trackerLog(`${trackerSideName(side)}取得先手`)}
  saveMatchTracker();refreshMatchUI();
}
function changeInitiativeCard(side,card,delta){
  const m=ensureMatchTracker(),x=m.sides[side],old=x.cards[card]||0,next=Math.max(0,old+delta);
  if(next===old)return;
  x.cards[card]=next;
  trackerLog(delta>0?`${trackerSideName(side)}獲得先手卡：${card}`:`${trackerSideName(side)}使用先手卡：${card}`);
  saveMatchTracker();refreshMatchUI();
}
function toggleTrackerPloy(side,id){
  const m=ensureMatchTracker(),x=m.sides[side],t=trackerTeam(side);
  const ploy=(t?.ploys||[]).find(p=>p[0]===id&&p[2]==="戰略計謀");if(!ploy)return;
  const at=x.usedPloys.indexOf(id);
  if(at>=0)x.usedPloys.splice(at,1);
  else{x.usedPloys.push(id);trackerLog(`${trackerSideName(side)}使用戰略計謀：${ploy[1]}`)}
  saveMatchTracker();refreshMatchUI();
}
function nextTurningPoint(){
  const m=ensureMatchTracker();if(m.tp>=4)return;
  m.tp++;m.sides.my.usedPloys=[];m.sides.enemy.usedPloys=[];
  trackerLog(`進入 TP${m.tp}（已清除上一 TP 的戰略計謀使用標記）`);
  saveMatchTracker();refreshMatchUI();
}
function startNewMatch(){
  if(battleRoster){beginBattleSetup();return}
  if(!confirm("開始新對戰？將清除目前 TP、VP、CP、先手、先手卡、戰略計謀與戰鬥紀錄；雙方目前選擇的裝備會保留。"))return;
  S.matchTracker={tp:1,initiative:"my",sides:{my:{cp:0,vp:0,cards:{"重擲":0,"+1/-1":0,"+2/-2":0,"+3/-3":0},usedPloys:[]},enemy:{cp:0,vp:0,cards:{"重擲":0,"+1/-1":0,"+2/-2":0,"+3/-3":0},usedPloys:[]}},log:[]};
  saveMatchTracker();render();
}
function maybeStartNewMatchForTeamChange(){
  const m=ensureMatchTracker();
  const active=m.log.length||m.tp!==1||m.sides.my.cp||m.sides.enemy.cp||m.sides.my.vp||m.sides.enemy.vp;
  if(active&&confirm("已更換對戰小隊。要同時開始新對戰並清除上一局的 TP、VP、CP 與紀錄嗎？")){
    S.matchTracker={tp:1,initiative:"my",sides:{my:{cp:0,vp:0,cards:{"重擲":0,"+1/-1":0,"+2/-2":0,"+3/-3":0},usedPloys:[]},enemy:{cp:0,vp:0,cards:{"重擲":0,"+1/-1":0,"+2/-2":0,"+3/-3":0},usedPloys:[]}},log:[]};
    saveMatchTracker();
  }
}
function trackerSidePanel(side){
  const m=ensureMatchTracker(),x=m.sides[side],t=trackerTeam(side);
  const cards=INITIATIVE_CARDS.map(c=>`<div class="tracker-card-row"><span>${esc(c)}</span><div class="tracker-stepper"><button onclick="changeInitiativeCard('${side}','${c}',-1)" ${x.cards[c]?"":"disabled"}>−</button><b>${x.cards[c]}</b><button onclick="changeInitiativeCard('${side}','${c}',1)">＋</button></div></div>`).join("");
  const ploys=(t?.ploys||[]).filter(p=>p[2]==="戰略計謀").map(p=>`<button class="tracker-ploy ${x.usedPloys.includes(p[0])?"used":""}" onclick="toggleTrackerPloy('${side}','${p[0]}')">${x.usedPloys.includes(p[0])?"✓ ":""}${esc(p[1])}</button>`).join("");
  return `<section class="tracker-side ${m.initiative===side?"initiative":""}">
    <div class="tracker-side-head"><div><b>${trackerSideName(side)} · ${esc(t?.name||"")}</b><small>${m.initiative===side?"先手":"非先手"}</small></div><button class="tracker-init" onclick="setTrackerInitiative('${side}')">設為先手</button></div>
    <div class="tracker-cp tracker-vp"><span>VP</span><button onclick="changeTrackerVP('${side}',-1)" ${x.vp?"":"disabled"}>−</button><b>${x.vp}</b><button onclick="changeTrackerVP('${side}',1)">＋</button></div>
    <div class="tracker-cp"><span>CP</span><button onclick="changeTrackerCP('${side}',-1)" ${x.cp?"":"disabled"}>−</button><b>${x.cp}</b><button onclick="changeTrackerCP('${side}',1)">＋</button></div>
    <details class="tracker-detail" open><summary>先手卡</summary>${cards}</details>
    <details class="tracker-detail" open><summary>本 TP 戰略計謀</summary><div class="tracker-ploys">${ploys||'<span class="tracker-empty">此小隊沒有戰略計謀資料</span>'}</div></details>
  </section>`;
}
function renderMatchTracker(){
  const root=document.querySelector("#matchTracker");if(!root)return;
  const panelWasOpen=root.querySelector(".match-tracker-panel")?.open??false;
  const historyWasOpen=root.querySelector(".tracker-history")?.open??false;
  const m=ensureMatchTracker();
  const logs=m.log.slice(0,20).map(e=>`<div class="tracker-log-row"><span>TP${e.tp}</span><div>${esc(e.text)}</div><small>${esc(e.at||"")}</small></div>`).join("");
  root.innerHTML=`<details class="match-tracker-panel" ${panelWasOpen?"open":""}>
    <summary><span><b>對戰公開資訊</b><small>TP${m.tp} · ${trackerSideName(m.initiative)}先手</small></span><span class="tracker-summary-cp">我 ${m.sides.my.cp}CP ／ 敵 ${m.sides.enemy.cp}CP</span></summary>
    <div class="tracker-toolbar"><div class="tracker-tp"><b>TP ${m.tp}</b><button onclick="nextTurningPoint()" ${m.tp>=4?"disabled":""}>下一轉折點 →</button></div><button class="tracker-reset" onclick="startNewMatch()">開始新對戰</button></div>
    <div class="tracker-sides">${trackerSidePanel("my")}${trackerSidePanel("enemy")}</div>
    <details class="tracker-history" ${historyWasOpen?"open":""}><summary>本局紀錄 <span>${m.log.length}</span></summary><div class="tracker-log">${logs||'<div class="tracker-empty">尚無紀錄</div>'}</div></details>
  </details>`;
}

const NAV_GROUPS={
  all:{
    "全部":[],
    "核心規則":["核心","武器規則"],
    "Approved Ops 2025":["對戰流程","Crit Ops","Kill Op","Tac Ops","地圖"],
    "裝備":["通用裝備","陣營裝備"],
    "小隊":["小隊資訊","陣營規則","戰略計謀","交戰計謀","特工"]
  },
  team:{
    "全部":[],
    "規則":["小隊資訊","陣營規則"],
    "計謀":["戰略計謀","交戰計謀"],
    "Tac Ops":["Tac Ops"],
    "裝備":["通用裝備","陣營裝備"],
    "特工":["特工"]
  }
};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const match=(o,q)=>!q||JSON.stringify(o).toLowerCase().includes(q.toLowerCase().trim());
const team=()=>TEAMS[S.team];
const normalizeSearch=s=>String(s??"").toLowerCase().trim().replace(/\s+/g," ");
function itemTitle(item){
  const m=String(item.html||"").match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  return m?m[1].replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim():item.kind;
}
function itemSource(item){
  const factionKinds=new Set(["小隊資訊","陣營規則","戰略計謀","交戰計謀","Tac Ops","陣營裝備","特工"]);
  return factionKinds.has(item.kind)?`${team().name} · ${item.kind}`:item.kind;
}
function searchRank(item,q){
  const needle=normalizeSearch(q); if(!needle)return 0;
  const title=normalizeSearch(itemTitle(item));
  const source=normalizeSearch(itemSource(item));
  const raw=normalizeSearch(JSON.stringify(item.s));
  if(title===needle)return 400;
  if(title.startsWith(needle))return 320;
  if(title.includes(needle))return 260;
  if(source.includes(needle))return 190;
  // Array data usually keeps English name / keywords near the front, so reward early matches.
  const early=normalizeSearch(Array.isArray(item.s)?item.s.slice(0,3).join(" "):"");
  if(early.includes(needle))return 160;
  if(raw.includes(needle))return 100;
  return -1;
}
function rememberViewed(id,title,source){
  if(!id||!title)return;
  const entry={id,title,source,team:S.team,side:S.side};
  S.recentViewed=[entry,...S.recentViewed.filter(x=>!(x.id===id&&x.team===S.team))].slice(0,6);
  localStorage.setItem("ktRecentViewed",JSON.stringify(S.recentViewed));
  renderRecentViewed();
}
function renderRecentViewed(){
  const root=document.querySelector("#recentViewed"); if(!root)return;
  if(!S.recentViewed.length){root.innerHTML="";root.classList.add("empty-recent");return;}
  root.classList.remove("empty-recent");
  root.innerHTML=`<span>最近查看</span>${S.recentViewed.map((x,i)=>`<button onclick="openRecentViewed(${i})" title="${esc(x.source||'')}">${esc(x.title)}</button>`).join("")}`;
}
function openRecentViewed(index){
  const x=S.recentViewed[index]; if(!x)return;
  if(x.side==="enemy"||x.side==="my") setActiveSide(x.side,{resetOpen:false});
  S.view="all"; S.tab="全部"; S.subtab="全部"; S.q=x.title;
  document.querySelector("#q").value=S.q;
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("on",b.dataset.view==="all"));
  render();
}

function loadData(){
  QUICK = window.KT_CORE_RULES || [];
  KEYWORDS = window.KT_WEAPON_RULES || [];
  UNIVERSAL_EQUIPMENT = window.KT_UNIVERSAL_EQUIPMENT || [];
  TAC_OPS = window.KT_TAC_OPS || [];
  CRIT_OPS = window.KT_CRIT_OPS || [];
  KILL_OP = window.KT_KILL_OP || null;
  APPROVED_OPS = window.KT_APPROVED_OPS || APPROVED_OPS;
  if (!window.KT_UNIVERSAL_EQUIPMENT) console.error("Universal equipment data script did not load.");
  TEAMS = {
    pm: window.KT_PLAGUE_MARINES,
    aod: window.KT_ANGELS_OF_DEATH,
    wk: window.KT_WRECKA_KREW,
    mw: window.KT_MURDERWING,
    leg: window.KT_LEGIONARY,
    dw: window.KT_DEATHWATCH,
    ci: window.KT_CELESTIAN_INSIDIANTS,
    cc: window.KT_CANOPTEK_CIRCLE,
    ks: window.KT_KASRKIN,
    rav: window.KT_RAVENERS,
    xv26: window.KT_XV26
  };
  if (!TEAMS.pm || !TEAMS.aod || !TEAMS.wk || !TEAMS.mw || !TEAMS.leg || !TEAMS.dw || !TEAMS.ci || !TEAMS.cc || !TEAMS.ks || !TEAMS.rav || !TEAMS.xv26) {
    throw new Error("Team data scripts did not load.");
  }
  KW = Object.fromEntries(KEYWORDS.map(x=>[x[0],{id:x[0],name:x[1],en:x[2],text:x[3]}]));

  // Terms that can be opened directly from faction-rule / ploy / equipment prose.
  // Weapon-rule terminology comes from KT_WEAPON_RULES; core aliases point to KT_CORE_RULES.
  TERM_INDEX = {};
  const addTerm=(label,title,text,source)=>{
    if(!TERM_INDEX[label]) TERM_INDEX[label]={label,title,text,source};
  };
  KEYWORDS.forEach(x=>{
    const base=x[1].replace(/\s+x(?:\+)?$/,"").replace(/\s+5\+$/,"");
    addTerm(base,x[1],x[3],"武器規則");
  });
}

function star(id){
  const fid=S.team+":"+id;
  return `<button class="star ${S.fav.has(fid)?"on":""}" onclick="fav('${id}')">★</button>`;
}

const ruleId=r=>Array.isArray(r)?r[0]:r;
const ruleLabel=r=>Array.isArray(r)?r[1]:(KW[ruleId(r)]?.name||"");
const ruleEn=r=>Array.isArray(r)&&r[2]?r[2]:(KW[ruleId(r)]?.en||"");
const isFactionWeaponRule=id=>Boolean((team().weaponRules||{})[id]||(team().factionWeaponRuleIds||[]).includes(id));
const factionRuleStar=id=>isFactionWeaponRule(id)?`<span class="faction-rule-star" aria-label="陣營專用規則">*</span>`:"";
function chip(rule,instance){
  const id=ruleId(rule),k=KW[id];
  if(!k)return "";
  const key=S.team+":"+instance,o=S.open.has(key);
  return `<button class="chip ${o?"open":""}" onclick="openRule('${instance}')">${factionRuleStar(id)}${esc(ruleLabel(rule))} · ${esc(ruleEn(rule))}</button>`;
}
function chipExplain(rules,instances){
  for(let i=0;i<rules.length;i++){
    if(S.open.has(S.team+":"+instances[i])){
      const k=KW[ruleId(rules[i])];
      // Chip 顯示該武器的實際值；展開說明則維持通用規則模板（x），
      // 避免出現「範圍 8\"：……x 距離內」這種混合顯示。
      if(k)return `<div class="inline"><b>${esc(k.name)}</b>${k.en?` <span class="meta term-en">${esc(k.en)}</span>`:""}：${esc(k.text)}</div>`;
    }
  }
  return "";
}

function markedProse(text,scope){
  const src=String(text??"");
  const rx=/\[\[((?:wp:)?[a-z0-9-]+)\|([^\]]+)\]\]/g;
  let out="",last=0,n=0,m;
  const refs=[];
  while((m=rx.exec(src))){
    out+=esc(src.slice(last,m.index));
    const rawId=m[1],label=m[2];
    if(rawId.startsWith("wp:")){
      const id=rawId.slice(3),profile=(window.KT_WEAPON_PROFILES||{})[id];
      if(profile){
        const instance=`weapon-profile:${scope}:${n++}:${id}`;
        const open=S.open.has(S.team+":"+instance);
        out+=`<button class="term-link weapon-profile-link ${open?"open":""}" onclick="openRule('${instance}')">${esc(label)}</button>`;
        refs.push({kind:"weapon-profile",id,instance});
      }else out+=esc(label);
    }else{
      const id=rawId,k=KW[id];
      if(k){
        const instance=`term:${scope}:${n++}:${id}`;
        const open=S.open.has(S.team+":"+instance);
        out+=`<button class="term-link ${open?"open":""}" onclick="openRule('${instance}')">${esc(label)}</button>`;
        refs.push({kind:"weapon-rule",id,instance});
      }else out+=esc(label);
    }
    last=rx.lastIndex;
  }
  out+=esc(src.slice(last));
  // Preserve authored line breaks in rule prose after escaping/link expansion.
  out=out.replace(/\n/g,"<br>");
  let explain="";
  const selectedRef=refs.find(ref=>ref.kind!=="weapon-profile"&&S.open.has(S.team+":"+ref.instance))
    ||refs.find(ref=>S.open.has(S.team+":"+ref.instance));
  for(const ref of selectedRef?[selectedRef]:[]){
    if(ref.kind==="weapon-profile"){
      const p=(window.KT_WEAPON_PROFILES||{})[ref.id];
      if(p){
        const instances=(p.rules||[]).map((rule,ki)=>`wp:${ref.id}:k:${ki}:${ruleId(rule)}`);
        explain=`<div class="inline prose-inline weapon-profile-inline">
          <div class="term-source">武器資料</div>
          <div class="weapon-head">
            <span class="weapon-name">${esc(p.name)}${p.en?` <span class="meta term-en">${esc(p.en)}</span>`:""}</span>
            <span class="stats">攻擊 ${esc(p.atk)} · 命中 ${esc(p.hit)} · 傷害 ${esc(p.dmg)}</span>
          </div>
          <div class="chips">${(p.rules||[]).map((rule,ki)=>chip(rule,instances[ki])).join("")}</div>
          ${chipExplain(p.rules||[],instances)}
        </div>`;
      }
    }else{
      const k=KW[ref.id];
      if(k)explain=`<div class="inline prose-inline"><div class="term-source">武器規則</div><b>${esc(k.name)}</b>：${esc(k.text)}</div>`;
    }
    break;
  }
  return `<div class="body">${out}</div>${explain}`;
}


function ruleOptionGrid(options,scope="rule-option"){
  return `<div class="rule-option-list">${(options||[]).map((opt,i)=>{
    const [name,effect]=opt;
    return `<section class="rule-option-row"><div class="rule-option-name">${esc(name)}</div><div class="rule-option-effect">${markedProse(effect,`${scope}:${i}`)}</div></section>`;
  }).join("")}</div>`;
}

function utilityGrenadeColumns(){
  const opts=window.KT_UTILITY_GRENADE_OPTIONS||[];
  return `<div class="grenade-columns">${opts.map((g,i)=>`
    <section class="grenade-column">
      <div class="grenade-head"><b>${esc(g[0])}</b><span>${esc(g[1])}</span></div>
      ${markedProse(g[2],`utility-grenade:${i}`)}
    </section>`).join("")}</div>`;
}

function choiceOptionList(options,scope="choice"){
  return `<div class="choice-option-list">${(options||[]).map((o,i)=>`
    <section class="choice-option-row">
      <div class="choice-option-title">${esc(o[0])}</div>
      ${markedProse(o[1],`${scope}:${i}`)}
    </section>`).join("")}</div>`;
}
function choiceOptionsFor(teamId,kind,id){
  const db=window.KT_CHOICE_OPTIONS||{};
  return db[`${teamId}:${kind}:${id}`]||db[`all:${kind}:${id}`]||null;
}

function opCard(op){
  return `<div class="card">${star("op:"+op.id)}
    <div class="op-title-row">
      <div class="op-title-text">
        <h3>${esc(op.name)}</h3>
        <div class="meta operative-meta">
          <div class="operative-type">${(op.keywords||[op.role,team().name]).map(esc).join(" · ")}</div>
          ${S.team==="leg"?`<div class="operative-keyword-note">可選關鍵字：戰前選擇恐虐、納垢、色孽、奸奇或無分之一；邪焰侍僧不能選恐虐。</div>`:""}
          ${op.stats?`<div class="operative-stats">${esc(op.stats)}</div>`:""}
        </div>
      </div>
      <div class="op-title-mini" style="background-image:url('${op.image}')"></div>
    </div>
    ${op.loadout?`<div class="ability operative-loadout"><b>武器選擇</b><div>${esc(op.loadout)}</div></div>`:""}
    ${(op.abilities||[]).map((a,ai)=>`<div class="ability"><b>${esc(a[0])}</b>${markedProse(a[1],`ability:${op.id}:${ai}`)}</div>`).join("")}
    ${(op.weapons||[]).map((w,wi)=>`<div class="weapon weapon-${w[1]==="近戰"?"melee":"ranged"}">
      <div class="weapon-head">
        <span class="weapon-name"><span class="weapon-type ${w[1]==="近戰"?"melee":"ranged"}">${esc(w[1])}</span>${esc(w[0])}</span>
        <span class="stats">攻擊 ${w[2]} · 命中 ${w[3]} · 傷害 ${w[4]}</span>
      </div>
      ${(()=>{
        const instances=w[5].map((rule,ki)=>`op:${op.id}:w:${wi}:k:${ki}:${ruleId(rule)}`);
        const customIds=w[6]||[];
        const customInstances=customIds.map((id,ki)=>`op:${op.id}:w:${wi}:custom:${ki}:${id}`);
        const customRules=team().weaponRules||{};
        const weaponKeywords=team().weaponKeywords||{};
        const profileRule=id=>customRules[id]||weaponKeywords[id];
        const profileType=id=>customRules[id]?"陣營專用規則":weaponKeywords[id]?"武器關鍵字":"";
        const customChips=customIds.map((id,ki)=>{
          const rule=profileRule(id);
          if(!rule)return "";
          const k=S.team+":"+customInstances[ki];
          return `<button class="chip custom-rule ${S.open.has(k)?"open":""}" onclick="openRule('${customInstances[ki]}')">${factionRuleStar(id)}${esc(rule[0])} · ${esc(rule[1])}</button>`;
        }).join("");
        const customExplain=customIds.map((id,ki)=>{
          const rule=profileRule(id);
          const k=S.team+":"+customInstances[ki];
          return rule&&S.open.has(k)?`<div class="inline"><span class="term-source">${esc(profileType(id))}</span><b>${esc(rule[0])} · ${esc(rule[1])}</b>：${esc(rule[2])}</div>`:"";
        }).join("");
        return `<div class="chips">${w[5].map((rule,ki)=>chip(rule,instances[ki])).join("")}${customChips}</div>${chipExplain(w[5],instances)}${customExplain}`;
      })()}
    </div>`).join("")}
  </div>`;
}

function items(){
  const a=[],t=team();
  if(t.composition) a.push({
    kind:"小隊資訊",id:"info:composition",s:["小隊組成",t.composition],
    html:`<div class="card">${star("info:composition")}<h3>小隊組成</h3><div class="meta">${esc(t.name)} · 編成條件</div><div class="body composition-body">${esc(t.composition).replace(/\n/g,"<br>")}</div></div>`
  });
  if(t.archetypes) a.push({
    kind:"小隊資訊",id:"info:archetypes",s:["任務原型",...t.archetypes],
    html:`<div class="card">${star("info:archetypes")}<h3>任務原型</h3><div class="meta">${esc(t.name)} · Archetypes</div><div class="body">可使用：${t.archetypes.map(esc).join("、")}。原型會在特定任務包（例如 Approved Ops）中使用，實際使用方式依該任務流程決定。</div></div>`
  });
  QUICK.forEach(x=>a.push({kind:"核心",id:"q:"+x[0],s:x,html:`<div class="card">${star("q:"+x[0])}<h3>${esc(x[1])}${x[3]?` <span class="meta term-en">${esc(x[3])}</span>`:""}</h3><div class="meta">核心規則</div><div class="body">${esc(x[2]).replace(/\n/g,"<br>")}</div></div>`}));
  const factionOnlyWeaponRuleIds=new Set(Object.values(TEAMS).flatMap(t=>t?.factionWeaponRuleIds||[]));
  KEYWORDS.filter(x=>!factionOnlyWeaponRuleIds.has(x[0])).forEach(x=>a.push({kind:"武器規則",id:"k:"+x[0],s:x,html:`<div class="card">${star("k:"+x[0])}<h3>${esc(x[1])} <span class="meta">${esc(x[2])}</span></h3><div class="body">${esc(x[3])}</div></div>`}));
  if(APPROVED_OPS.flow?.length){
    const steps=APPROVED_OPS.flow.map((x,i)=>`<div class="approved-step"><span class="approved-step-num">${i+1}</span><div><b>${esc(x[0])}</b><div>${esc(x[1])}</div></div></div>`).join("");
    a.push({kind:"對戰流程",id:"ao:game-sequence",s:APPROVED_OPS.flow,html:`<div class="card">${star("ao:game-sequence")}<h3>Approved Ops 2025 對戰流程</h3><div class="meta">Game Sequence · 桌邊速查</div><div class="body approved-flow">${steps}</div></div>`});
  }
  if(APPROVED_OPS.maps?.length){
    const maps=APPROVED_OPS.maps.map(x=>`<div class="map-set"><div><b>${esc(x[0])}</b><div class="meta">${esc(x[2])}</div></div><span class="map-count">${x[1]} 張</span></div>`).join("");
    a.push({kind:"地圖",id:"ao:maps",s:APPROVED_OPS.maps,html:`<div class="card">${star("ao:maps")}<h3>Approved Ops 2025 可用地圖</h3><div class="meta">Recommended Terrain Layouts</div><div class="body"><div class="map-sets">${maps}</div><div class="rule-supplement"><b>地圖說明</b><br>${esc(APPROVED_OPS.mapNote)}</div></div></div>`});
  }
  CRIT_OPS.forEach(x=>a.push({kind:"Crit Ops",id:"co:"+x[0],s:x,html:`<div class="card">${star("co:"+x[0])}<h3>${esc(x[2])} <span class="meta">${esc(x[1])}</span></h3><div class="meta">Crit Op${x[3]!=="—"?" · "+esc(x[3]):""}</div><div class="body"><b>規則／行動：</b>${esc(x[4])}<br><br><b>得分：</b>${esc(x[5])}</div></div>`}));
  if(KILL_OP){
    const rows=KILL_OP.table.map(r=>`<tr><td>${r[0]}</td>${r.slice(1).map(v=>`<td>${v}</td>`).join("")}</tr>`).join("");
    a.push({kind:"Kill Op",id:"ko:kill-op",s:KILL_OP,html:`<div class="card">${star("ko:kill-op")}<h3>${esc(KILL_OP.zh)} <span class="meta">${esc(KILL_OP.title)}</span></h3><div class="body">${esc(KILL_OP.body)}<div class="kill-table-wrap"><table class="kill-table"><thead><tr><th>敵方起始特工</th><th>等級 1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>${rows}</tbody></table></div><div class="rule-supplement"><b>規則補充</b><br>${esc(KILL_OP.note)}</div></div></div>`});
  }
  const TAC_ARCHETYPES={"pm":["seek","security"],"aod":["seek","security"],"wk":["security","seek"],"mw":["recon","seek"],"leg":["security","seek"],"dw":["seek","security"],"ci":["security","seek"],"cc":["recon","security"],"ks":["security","seek"],"rav":["infiltration","seek"],"xv26":["recon","infiltration"]};
  const allowedTac=S.view==="team"?(TAC_ARCHETYPES[S.team]||[]):["recon","security","seek","infiltration"];
  TAC_OPS.filter(x=>allowedTac.includes(x[0])).forEach(x=>a.push({kind:"Tac Ops",id:"to:"+x[3],s:x,html:`<div class="card">${star("to:"+x[3])}<h3>${esc(x[4])} <span class="meta">${esc(x[5])}</span></h3><div class="meta">${esc(x[1])} · Tac Op</div><div class="body"><b>揭示：</b>${esc(x[6])}<br><br>${x[7]!=="—"?`<b>規則／行動：</b>${esc(x[7])}<br><br>`:""}<b>得分：</b>${esc(x[8])}${x[9]?`<div class="rule-supplement"><b>規則補充</b><br>${esc(x[9])}</div>`:""}</div></div>`}));
  UNIVERSAL_EQUIPMENT.forEach(x=>a.push({kind:"通用裝備",id:"ue:"+x[0],s:x,html:`<div class="card equipment-card">${star("ue:"+x[0])}<div class="equipment-card-head"><h3>${esc((x[3]?x[3]+" ":"")+x[1])}</h3>${equipmentSelectButton("ue",x[0])}</div><div class="meta">${esc(x[2])} · 通用裝備</div>${equipmentSelectionBlock("ue",x[0])}<div class="body">${esc(x[4]).replace(/\n/g,"<br>")}</div>${x[0]==="utility-grenades"?utilityGrenadeColumns():""}${x[0]==="explosive-grenades"?choiceOptionList((window.KT_CHOICE_OPTIONS||{})["all:equipment:explosive-grenades"],"explosive-grenades"):""}</div>`}));
  t.rules.forEach(x=>{
    const body=(x[0]==="chapter-tactics" && t.chapterTactics)
      ? `<div class="body"><div class="chapter-tactics-intro">選擇殺戮小隊時，為己方死亡天使特工選擇一個首要和次要戰團戰術在戰鬥中生效；多次選擇相同戰團戰術不會疊加。</div>${ruleOptionGrid(t.chapterTactics,"chapter-tactics")}</div>`
      : markedProse(x[2],`rule:${x[0]}`);
    a.push({kind:"陣營規則",id:"r:"+x[0],s:x,html:`<div class="card">${star("r:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · 陣營規則</div>${body}</div>`});
  });
  t.ploys.forEach(x=>{
    const kind=x[2]==="交戰計謀"?"交戰計謀":"戰略計謀";
    a.push({kind,id:"p:"+x[0],s:x,html:`<div class="card">${star("p:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · ${esc(x[2])}</div>${markedProse(x[3],`ploy:${x[0]}`)}</div>`});
  });
  if(t.ploys2) t.ploys2.forEach(x=>{const opts=choiceOptionsFor(S.team,"ploy2",x[0]);a.push({kind:"交戰計謀",id:"p2:"+x[0],s:x,html:`<div class="card">${star("p2:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · ${esc(x[2])}</div>${opts?`<div class="body">在一名己方瘟疫戰士特工的激活或反應期間、其執行一次行動之前或之後使用。選擇一個效果：</div>${choiceOptionList(opts,`ploy2-choice:${x[0]}`)}`:markedProse(x[3],`ploy2:${x[0]}`)}</div>`})});
  t.equipment.forEach(x=>{
    const equipmentChoices=choiceOptionsFor(S.team,"equipment",x[0]);
    let content=markedProse(x[2],`equip:${x[0]}`);
    if(equipmentChoices){
      const intro=x[2].split("選擇：")[0].trim();
      content=`<div class="body">${esc(intro)} 選擇一個效果：</div>${choiceOptionList(equipmentChoices,`equipment-choice:${x[0]}`)}`;
    }
    // 像「疫病手雷」這種裝備本身就是一個完整武器資料，
    // 直接用武器卡呈現，不再把攻擊／命中／傷害寫成一段敘述。
    if(S.team==="pm" && x[0]==="grenades"){
      const p=(window.KT_WEAPON_PROFILES||{})["pm-plague-grenade"];
      if(p){
        const instances=(p.rules||[]).map((rule,ki)=>`equipwp:${x[0]}:k:${ki}:${ruleId(rule)}`);
        content=`<div class="weapon equipment-weapon weapon-ranged">
          <div class="weapon-head">
            <span class="weapon-name"><span class="weapon-type ranged">${esc(p.type||"遠程")}</span>${esc(p.name)}${p.en?` <span class="meta term-en">${esc(p.en)}</span>`:""}</span>
            <span class="stats">攻擊 ${esc(p.atk)} · 命中 ${esc(p.hit)} · 傷害 ${esc(p.dmg)}</span>
          </div>
          <div class="chips">${(p.rules||[]).map((rule,ki)=>chip(rule,instances[ki])).join("")}</div>
          ${chipExplain(p.rules||[],instances)}
          <div class="equipment-weapon-note">整場戰鬥不能使用超過兩次。</div>
        </div>`;
      }
    }
    a.push({kind:"陣營裝備",id:"e:"+x[0],s:x,html:`<div class="card equipment-card">${star("e:"+x[0])}<div class="equipment-card-head"><h3>${esc(x[1])}</h3>${equipmentSelectButton("e",x[0])}</div><div class="meta">${esc(t.name)} · 陣營裝備</div>${equipmentSelectionBlock("e",x[0])}${content}</div>`});
  });
  t.operatives.forEach(o=>a.push({kind:"特工",id:"op:"+o.id,s:o,html:opCard(o)}));
  return a;
}


const CORE_BY_ID=()=>Object.fromEntries(QUICK.map(x=>[x[0],x]));
let FLOW_RULE_SEQ=0;
let FLOW_RULE_REFS=[];
function flowRule(id,label){
  const r=CORE_BY_ID()[id];
  if(!r)return esc(label||id);
  const instance=`flow-rule:${id}:${FLOW_RULE_SEQ++}`;
  const open=S.open.has(S.team+":"+instance);
  FLOW_RULE_REFS.push({id,instance});
  return `<button class="flow-rule-link ${open?"open":""}" onclick="openRule('${instance}')">${esc(label||r[1])}</button>`;
}

const FLOW_TERMS={
  "kill-team":["殺戮小隊","本場戰鬥使用的特工編成。每支小隊都有自己的選人限制。"],
  "killzone":["殺戮區","進行戰鬥的遊戲區域，包含地形、目標標識與雙方特工。"],
  "crit-op":["Crit Op","主要任務目標之一，通常圍繞任務中的目標標識取得 VP。"],
  "kill-op":["Kill Op","透過殘廢敵方特工取得 VP 的任務目標。"],
  "tac-op":["Tac Op","依殺戮小隊可用的任務原型秘密選擇的戰術任務。"],
  "primary-op":["Primary Op","第 1 轉折點秘密選擇 Crit Op、Kill Op 或 Tac Op 其中一項。戰鬥結束時公開，並依該項已取得的 VP 追加分數。"],
  "vp":["VP／勝利點數","Victory Points。用來決定戰鬥勝負的分數；Approved Ops 2025 中 Crit Op、Kill Op、Tac Op 各自有取得上限。"],
  "cp":["CP／指揮點數","Command Points。主要用來使用戰略計謀與交戰計謀。"],
  "initiative":["先手權","決定戰略階段與交戰階段中由哪位玩家先開始處理相關步驟。"],
  "initiative-card":["先手調整卡","Approved Ops 2025 用來調整後續先手骰結果的卡片。"],
  "deployment-zone":["部署區","戰鬥開始時部署己方特工的指定區域。"],
  "archetype":["任務原型","決定一支殺戮小隊可以選擇哪些 Tac Op 的分類。"],
  "operative":["特工","殺戮小隊中的單個模型／作戰單位。"],
  "apl":["APL","行動點數上限。特工激活時通常依 APL 決定可花費多少 AP 執行行動。"],
  "tp":["TP／轉折點","Turning Point。一場戰鬥通常進行 4 個轉折點，每個轉折點包含戰略階段與交戰階段。"]
};
let FLOW_TERM_SEQ=0;
let FLOW_TERM_REFS=[];
function flowTerm(id,label){
  const t=FLOW_TERMS[id];
  if(!t)return esc(label||id);
  const instance=`flow-term:${id}:${FLOW_TERM_SEQ++}`;
  const open=S.open.has(S.team+":"+instance);
  FLOW_TERM_REFS.push({id,instance});
  return `<button class="flow-rule-link flow-keyword ${open?"open":""}" onclick="openRule('${instance}')">${esc(label||t[0])}</button>`;
}
function flowTermExplain(refs){
  for(const ref of refs){
    if(S.open.has(S.team+":"+ref.instance)){
      const t=FLOW_TERMS[ref.id];
      return `<div class="inline flow-inline flow-step-explain"><span class="term-source">流程關鍵字</span><b>${esc(t[0])}</b>：${esc(t[1])}</div>`;
    }
  }
  return "";
}
function flowStep(n,title,bodyFactory){
  FLOW_TERM_REFS=[];
  FLOW_RULE_REFS=[];
  const titleHtml=typeof title==="function"?title():title;
  const body=typeof bodyFactory==="function"?bodyFactory():bodyFactory;
  const termRefs=[...FLOW_TERM_REFS],ruleRefs=[...FLOW_RULE_REFS];
  let explain="";
  for(const ref of [...termRefs,...ruleRefs]){
    if(!S.open.has(S.team+":"+ref.instance))continue;
    if(ref.instance.startsWith("flow-term:")){
      const t=FLOW_TERMS[ref.id];
      explain=`<div class="inline flow-inline flow-step-explain"><span class="term-source">流程關鍵字</span><b>${esc(t[0])}</b>：${esc(t[1])}</div>`;
    }else{
      const r=CORE_BY_ID()[ref.id];
      explain=`<div class="inline flow-inline flow-step-explain"><span class="term-source">核心規則</span><b>${esc(r[1])}</b>${r[3]?` <span class="meta term-en">${esc(r[3])}</span>`:""}：${esc(r[2])}</div>`;
    }
    break;
  }
  return `<div class="flow-step"><span class="flow-num">${n}</span><div><b>${titleHtml}</b><p>${body}</p>${explain}</div></div>`;
}
function flowSection(id,title,sub,bodyFactory){
  const k=S.team+":flow:"+id,o=S.flowOpen.has(k);
  const body=typeof bodyFactory==="function"?bodyFactory():bodyFactory;
  return `<section class="flow-card ${o?"open":""}">
    <button class="flow-head" onclick="toggleFlow('${id}')">
      <span><b>${title}</b><small>${sub}</small></span><span class="flow-chevron">${o?"−":"＋"}</span>
    </button>
    ${o?`<div class="flow-body">${body}</div>`:""}
  </section>`;
}
function renderFlow(){
  FLOW_TERM_SEQ=0;
  FLOW_RULE_SEQ=0;
  const setup=flowSection("ao-setup","1. 設置戰鬥","Approved Ops 2025 · 開始選人前",
    ()=>flowStep("1","選擇殺戮小隊",()=>`${flowTerm("kill-team","殺戮小隊")}：雙方確認本場使用的小隊。`)+
    flowStep("2","設置殺戮區",()=>`決定${flowTerm("killzone","殺戮區")}並設置地形，確認各地形的類型與規則。`)+
    flowStep("3",()=>`決定共同的 ${flowTerm("crit-op","Crit Op")}`,()=>`設置任務要求的目標標識。除 Bheta-Decima 外，目標標識通常設置在${flowTerm("killzone","殺戮區")}地面。`)+
    flowStep("4","擲骰決定初始先手權",()=>`勝者決定誰擁有${flowTerm("initiative","先手權")}。`)+
    flowStep("5","選擇部署區",()=>`有${flowTerm("initiative","先手權")}的玩家選擇${flowTerm("deployment-zone","部署區")}；另一位玩家取得另一部署區，並獲得「重擲先手」卡。`)
  );
  const select=flowSection("ao-select","2. 選擇特工與裝備","雙方秘密選擇，再同時公開",
    ()=>flowStep("1","秘密選擇特工","依目前小隊的編成規則選擇本場出戰特工，雙方同時公開。")+
    flowStep("2","秘密選擇最多 4 項裝備","每個裝備選項每位玩家最多選一次，雙方同時公開。")+
    flowStep("3",()=>`各獲得 ${flowTerm("cp","2CP")}`,()=>`這是戰前取得的 ${flowTerm("cp","CP")}；進入第 1 ${flowTerm("tp","轉折點")}後還會依戰略階段規則取得 CP。`)+
    flowStep("4",()=>`秘密選擇 1 個 ${flowTerm("tac-op","Tac Op")}`,()=>`從小隊可使用的${flowTerm("archetype","任務原型")}中選擇。<span class="flow-team-note">目前小隊：${esc(team().name)} · ${esc((team().archetypes||[]).join("／"))}</span>`)
  );
  const deploy=flowSection("ao-deploy","3. 部署","先放戰前裝備，再部署特工",
    ()=>flowStep("1","交替設置戰前裝備","由有先手權的玩家開始，一次設置一件需要在戰鬥前放置的裝備，例如梯子。")+
    flowStep("2","交替部署約三分之一的小隊","每次設置小隊總人數的三分之一，向上取整；由有先手權的玩家開始。")+
    flowStep("3",()=>`完全位於自己的${flowTerm("deployment-zone","部署區")}`,()=>`部署的${flowTerm("operative","特工")}必須完全位於己方${flowTerm("deployment-zone","部署區")}。`)+
    flowStep("4","所有部署特工給予隱匿命令",()=>`${flowRule("conceal","隱匿命令")}`)
  );
  const play=flowSection("ao-play","4. 進行戰鬥","TP1 → TP4 都重複這個大循環",
    ()=>flowStep("1","每個轉折點先決定先手權","雙方擲 D6；平手時不重擲，依目前先手權判定。可依 Approved Ops 2025 的先手卡流程調整結果。")+
    flowStep("2","決定先手權並處理先手卡","擲骰勝者決定誰有先手權。第 1～3 轉折點，擲骰的敗者取得與目前轉折點數字相同的先手調整卡；第 4 轉折點不取得。")+
    flowStep("3",()=>`第 1 轉折點：秘密選 ${flowTerm("primary-op","Primary Op")}`,()=>`在戰略博弈時，從 ${flowTerm("crit-op","Crit Op")}／${flowTerm("kill-op","Kill Op")}／${flowTerm("tac-op","Tac Op")} 三者秘密選一個作為 ${flowTerm("primary-op","Primary Op")}，戰鬥結束才公開。`)+
    flowStep("4","進入戰略階段",()=>`${flowRule("strategy-phase","戰略階段")}`)+
    flowStep("5","進入交戰階段",()=>`${flowRule("firefight-phase","交戰階段")}　需要逐名操作時可看下方「激活一名特工」。`)+
    flowStep("6",()=>`結算本轉折點可得的 ${flowTerm("vp","VP")}`,()=>`依 ${flowTerm("crit-op","Crit Op")}、${flowTerm("kill-op","Kill Op")}、${flowTerm("tac-op","Tac Op")} 的各自條件與時點結算；每一種 Op 整場最多取得 ${flowTerm("vp","6VP")}。`)+
    flowStep("7","完成 TP4 後結束戰鬥","若尚未到 TP4，進入下一轉折點並再次從決定先手權開始。")
  );
  const endBattle=flowSection("ao-end","5. 戰鬥結束與計分","完成第 4 轉折點後",
    ()=>flowStep("1","戰鬥在 4 個轉折點後結束","若一方已沒有特工留在殺戮區，但尚未完成第 4 轉折點，另一方繼續完成剩餘轉折點。")+
    flowStep("2",()=>`同時公開 ${flowTerm("primary-op","Primary Op")}`,()=>`額外取得該 Op 已得 ${flowTerm("vp","VP")} 的一半，向上取整。`)+
    flowStep("3",()=>`比較總 ${flowTerm("vp","VP")}`,()=>`${flowTerm("vp","VP")} 較高者獲勝；相同則平手。`)
  );
  const activation=flowSection("activation","激活一名特工","交戰階段中的常用子流程",
    ()=>flowStep("1","選擇一名就緒特工",()=>`${flowRule("ready-expended","就緒／待機")}`)+
    flowStep("2","決定／確認命令",()=>`${flowRule("engage","交戰命令")} ${flowRule("conceal","隱匿命令")}`)+
    flowStep("3",()=>`依 ${flowTerm("apl","APL")} 執行行動`,()=>`常用：${flowRule("reposition","轉移")} ${flowRule("dash","衝刺")} ${flowRule("shoot","射擊")} ${flowRule("charge","衝鋒")} ${flowRule("fight","近戰")} ${flowRule("fall-back","後撤")}`)+
    flowStep("4","進入待機","完成這名特工的激活，接著通常由對手激活。")
  );
  const shooting=flowSection("shooting","射擊流程","從選目標到結算傷害",
    ()=>flowStep("1","選擇遠程武器與有效目標",()=>`${flowRule("valid-target","有效目標")} ${flowRule("visible","可見")} ${flowRule("cover","掩護")}`)+
    flowStep("2","攻擊方擲攻擊骰","依武器「攻擊」擲骰，達到「命中」即成功；6 通常是關鍵成功。")+
    flowStep("3","防禦方擲 3 枚防禦骰","達到「豁免」即成功；目標有掩護時可直接保留 1 枚普通成功。")+
    flowStep("4","防禦方抵擋攻擊骰",()=>`${flowRule("shoot-blocking","查看射擊抵擋")}`)+
    flowStep("5","結算未被抵擋的傷害",()=>`${flowRule("damage","傷害／受創／殘廢")}`)
  );
  const fight=flowSection("fight","近戰流程","出擊與格擋的順序",
    ()=>flowStep("1","選擇控制範圍內的敵方特工",()=>`${flowRule("control-range","控制範圍")}`)+
    flowStep("2","雙方選近戰武器並擲攻擊骰","各自保留普通成功與關鍵成功。")+
    flowStep("3","攻擊方先開始結算","雙方輪流選擇一枚成功進行「出擊」或「格擋」。")+
    flowStep("4","出擊或格擋",()=>`${flowRule("fight-blocking","查看近戰格擋")}`)+
    flowStep("5","一方沒有成功後","另一方結算所有剩餘成功。")
  );
  const counter=flowSection("ending","反應檢查","輪到你，但己方已沒有就緒特工",
    ()=>flowStep("1","確認己方所有特工都已待機","如果仍有就緒特工，正常激活該特工。")+
    flowStep("2","對手是否仍有就緒特工？","若有，檢查是否符合反應條件。")+
    flowStep("3","進行反應",()=>`${flowRule("counteract","查看反應規則")}`)+
    flowStep("4","雙方都沒有就緒特工","交戰階段結束。")
  );
  document.querySelector("#content").innerHTML=`<div class="flow-page">
    <div class="flow-hero"><div class="flow-eyebrow">APPROVED OPS 2025 · 完整遊戲流程</div><h2>從設置到結算一路照著走</h2><p>上半部是完整對戰順序；下半部保留遊戲中的常用子流程。2025 版已取消舊版的 Scouting Step。</p></div>
    <div class="flow-timeline"><span>設置戰鬥</span><i>›</i><span>選特工</span><i>›</i><span>部署</span><i>›</i><span>TP1–4</span><i>›</i><span>結算</span></div>
    <div class="flow-section-label">完整遊戲流程</div>
    <div class="flow-list">${setup}${select}${deploy}${play}${endBattle}</div>
    <div class="flow-section-label">遊戲中常用流程</div>
    <div class="flow-quick"><button onclick="toggleFlow('shooting')">🎯 射擊</button><button onclick="toggleFlow('fight')">⚔️ 近戰</button><button onclick="toggleFlow('activation')">👤 激活</button><button onclick="toggleFlow('ending')">↻ 反應</button></div>
    <div class="flow-list">${activation}${shooting}${fight}${counter}</div>
  </div>`;
}
function toggleFlow(id){
  const k=S.team+":flow:"+id;
  if(S.flowOpen.has(k)) S.flowOpen.delete(k);
  else { S.flowOpen.clear(); S.flowOpen.add(k); }
  S.open.clear();
  render();
}

function openMatchEquipment(side,key){
  const [kind,id]=key.split(":");
  setActiveSide(side,{resetOpen:false});
  S.view="team";S.tab="裝備";S.subtab=kind==="ue"?"通用裝備":"陣營裝備";S.q="";
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("on",b.dataset.view==="team"));
  render();
  requestAnimationFrame(()=>{
    const cards=[...document.querySelectorAll(".equipment-card")];
    const name=equipmentNameByKey(S.team,key);
    const card=cards.find(c=>c.querySelector("h3")?.textContent.includes(name));
    card?.scrollIntoView({behavior:"smooth",block:"center"});
  });
}
function matchEquipmentSide(side){
  const teamId=trackerTeamId(side);
  const t=TEAMS[teamId];
  const bucket=equipmentBucket(side,teamId);
  const items=bucket.map(key=>`<button class="match-equipment-item" onclick="openMatchEquipment('${side}','${key}')"><span>${esc(equipmentNameByKey(teamId,key))}${equipmentOptionSummary(side,teamId,key)}</span><small>查看規則 ›</small></button>`).join("");
  return `<section class="match-equipment-side"><h3>${trackerSideName(side)} · ${esc(t?.name||"")}</h3><small>已選 ${bucket.length} 件裝備</small><div class="match-equipment-items">${items||'<div class="match-equipment-empty">尚未選擇裝備</div>'}</div></section>`;
}
function setMatchTab(tab){
  if(!["roster","log","equipment","public"].includes(tab))return;
  S.matchTab=tab;
  renderMatchHub();
}

// v2.3: battle roster is a per-match shortlist, not a substitute for official composition validation.
const ROSTER_KEY="ktBattleRosterV230";
let battleRoster=(()=>{
  try {const x=JSON.parse(localStorage.getItem(ROSTER_KEY)||"null");return x&&typeof x==="object"?x:null}
  catch{return null}
})();
// Rule browsing selections are independent from the saved match roster.
let battleDraft=null;
let battleDraftTeams=null;
let battleWeaponDraft={my:{},enemy:{}};
function rosterTeam(side){return battleDraftTeams?.[side]||(battleRoster?.[side+"Team"])||(side==="my"?S.myTeam:S.enemyTeam)}
function teamsLocked(){return false}
function guardTeamChange(){
 if(!teamsLocked())return false;
 alert(battleDraft?"已確認小隊，請返回建立對戰的第一步修改。":"本場對戰已鎖定雙方小隊。請在「本場特工」使用「重新選擇出戰特工」建立新對戰。");
 render();return true;
}
function rosterOps(side){return TEAMS[rosterTeam(side)]?.operatives||[]}
// Declarative composition rules. Weapon/loadout choices remain manual.
const TEAM_ROSTER_RULES={
 "xv26":{fixed:{shasvre:1,"marker-drone":1,"gun-drone":1},slots:4,allowed:["designator","infiltrator","liberator","lodestar","neutraliser"],repeat:["infiltrator"],note:"融合砲全隊最多 2 把，需自行核對武器配置。"},
 "rav":{fixed:{prime:1},slots:4,allowed:["felltalon","tremorscythe","venomspitter","warrior","wrecker"],repeat:["warrior"]},
 "ci":{fixed:{superior:1},slots:8,allowed:["abjuror","censor","cremator","denuncia","mortisanctus","reliquarius","warrior"],repeat:["cremator","warrior"],caps:{cremator:2}},
 "ks":{fixed:{sergeant:1},slots:9,allowed:["combat-medic","demo-trooper","gunner-flamer","gunner-grenade","gunner-volley","gunner-melta","gunner-plasma","recon-trooper","sharpshooter","trooper","vox-trooper"],repeat:["trooper"],groupCaps:[{ids:["gunner-flamer","gunner-grenade","gunner-volley","gunner-melta","gunner-plasma","sharpshooter"],max:4}],note:"固定 1 名軍士，再選擇 9 名特工。五種不同主武器的砲手各視為一種獨立特工，與神射手合計最多 4 名；同一種砲手配置不得重複。醫療兵、爆破兵、偵察兵、通訊兵各最多 1 名，不計入上述 4 名限制；士兵可重複。"},
 "cc":{fixed:{geomancer:1,accelerator:1,reanimator:1,warrior:3,"tomb-crawler":2},slots:0,allowed:[],note:"固定編成 8 名。墓穴爬行者及冥工巨蟲戰士可各自選擇主武器；全隊跨維隔振器最多 1 個。"},
 "leg":{leader:["aspiring-champion","chosen"],slots:5,allowed:["anointed","balefire-acolyte","butcher","gunner","heavy-gunner","icon-bearer","shrivetalon","warrior"],repeat:["warrior"]},
 "wk":{fixed:{"boss-nob":1,"bomb-squig":2},slots:5,allowed:["demolisha","fighter","krusha","gunner","rokkiteer"],repeat:["fighter","gunner"],note:"固定頭目與 2 名炸彈跳跳，另選 5 名特工。頭目近戰武器及砲手火箭武器可於配置視窗選擇。"},
 "mw":{fixed:{"chaos-lord":1},slots:5,allowed:["champion","curseclaw","depredator","huntmaster","raptor","shrieker","skysear","warp-talon"],repeat:["raptor"],note:"固定 1 名混沌領主，另選 5 名（僅猛禽可重複）。全隊選用等離子手槍、熱熔槍或等離子槍的特工合計最多 2 名。"},
 "pm":{fixed:{champion:1},slots:5,allowed:["bombardier","fighter","heavy","icon","caster","warrior"],repeat:[]},
 "aod":{leader:["captain","assault-sergeant","intercessor-sergeant"],slots:5,allowed:["grenadier","assault-warrior","heavy-gunner","intercessor-gunner","intercessor-warrior","eliminator"],repeat:["assault-warrior","intercessor-warrior"]},
 "dw":{slots:5,allowed:["watch-sergeant","aegis","blademaster","bombard","breacher","demolisher","disruptor","gunner","headtaker","horde-slayer","marksman"],repeat:[],groupCaps:[{ids:["bombard","breacher","horde-slayer"],max:1}],note:"從守望軍士及各類老兵中任選 5 名，不強制選守望軍士；同職位不可重複，重裝型裝甲特工最多 1 名。"}
};
function rosterRule(side){return TEAM_ROSTER_RULES[rosterTeam(side)]||null}
function fixedIds(rule){return Object.entries(rule.fixed||{}).flatMap(([id,n])=>Array(n).fill(id))}
function initialDraft(side){const r=rosterRule(side);return r?fixedIds(r):[]}
function selectedCount(a,id){return a.filter(x=>x===id).length}
function rosterError(side){
 const r=rosterRule(side),a=battleDraft[side];
 if(!r)return a.length?"":"請至少選擇一名特工。";
 const known=new Set(rosterOps(side).map(x=>x.id));
 if(a.some(id=>!known.has(id)))return "包含無法辨識的特工。";
 for(const [id,n] of Object.entries(r.fixed||{}))if(selectedCount(a,id)!==n)return `固定特工 ${id} 需要 ${n} 名。`;
 const leaders=(r.leader||[]).reduce((n,id)=>n+selectedCount(a,id),0);
 if(r.leader&&leaders!==1)return "必須從隊長候選中選擇恰好 1 名。";
 const extras=a.filter(id=>!(id in (r.fixed||{}))&&!(r.leader||[]).includes(id));
 if(extras.length!==r.slots)return `其餘特工需要 ${r.slots} 名，目前 ${extras.length} 名。`;
 if(extras.some(id=>!r.allowed.includes(id)))return "存在不符合編成的職位。";
 for(const id of new Set(extras))if(!r.repeat.includes(id)&&selectedCount(extras,id)>1)return "不可重複編入："+id;
 for(const [id,n] of Object.entries(r.caps||{}))if(selectedCount(a,id)>n)return `${id} 最多 ${n} 名。`;
 for(const g of r.groupCaps||[])if(a.filter(id=>g.ids.includes(id)).length>g.max)return rosterTeam(side)==="dw"?`重裝型裝甲特工最多 ${g.max} 名。`:`砲手與神射手合計最多 ${g.max} 名。`;
 return "";
}
function changeDraftCount(side,id,delta){
 if(!battleDraft)return;
 const r=rosterRule(side),a=battleDraft[side],idx=a.lastIndexOf(id);
 if(!rosterOps(side).some(o=>o.id===id))return;
 if(delta<0){
  if(r?.fixed?.[id]&&selectedCount(a,id)<=r.fixed[id])return;
  if(idx>=0){
   const oldCount=selectedCount(a,id);
   a.splice(idx,1);
   for(let n=oldCount-1;n>=(a.filter(x=>x===id).length);n--){
    delete battleWeaponDraft[side][`${id}#${n}`];
   }
  }
 }else{
  if(r){
   if(r.fixed?.[id])return;
   if(r.leader?.includes(id)){if(r.leader.some(x=>a.includes(x)))return}
   else{
    if(!r.allowed.includes(id))return;
    if(a.filter(x=>r.allowed.includes(x)).length>=r.slots)return;
    if(!r.repeat.includes(id)&&a.includes(id))return;
    if(r.caps?.[id]&&selectedCount(a,id)>=r.caps[id])return;
    if(r.groupCaps?.some(g=>g.ids.includes(id)&&a.filter(x=>g.ids.includes(x)).length>=g.max))return;
   }
  }else if(a.includes(id))return;
  a.push(id);
 }
 render();
}
let battlePicker=null;
function canDraftAdd(side,id){
 const r=rosterRule(side),a=battleDraft[side],count=selectedCount(a,id);
 if(!r)return !count;
 if(r.fixed?.[id])return false;
 if(r.leader?.includes(id))return !r.leader.some(x=>a.includes(x));
 if(!r.allowed.includes(id)||a.filter(x=>r.allowed.includes(x)).length>=r.slots)return false;
 if(!r.repeat.includes(id)&&count)return false;
 if(r.caps?.[id]&&count>=r.caps[id])return false;
 return !r.groupCaps?.some(g=>g.ids.includes(id)&&a.filter(x=>g.ids.includes(x)).length>=g.max);
}
// Wrecka Krew: selectable weapon alternatives; alternate firing profiles stay together.
function mwSpecialCount(side,skipIndex=-1){
 return (battleDraft?.[side]||[]).reduce((n,id,i)=>{
  if(i===skipIndex)return n;
  const op=rosterOps(side).find(o=>o.id===id);
  if(!op)return n;
  const selected=battleWeaponSelection(side,i,op);
  const marked=op.weapons?.some((w,j)=>selected.includes(j)&&(/等離子手槍|熱熔槍|等離子槍/.test(w[0])));
  return n+(marked?1:0);
 },0);
}
function mwOptionMarked(op,indices){return indices.some(i=>/等離子手槍|熱熔槍|等離子槍/.test(op.weapons?.[i]?.[0]||""))}
function wkOptions(side,op){
 if(rosterTeam(side)==="ks"){
  if(op.id==="sergeant")return [
   {key:"bolt-power",label:"爆矢手槍＋動力武器",indices:[0,7]},
   {key:"hotshot-stock",label:"高能激光槍＋槍托",indices:[1,6]},
   {key:"hotshot-pistol",label:"高能激光手槍＋動力武器",indices:[2,7]},
   {key:"plasma-chainsword",label:"等離子手槍＋鏈鋸劍",indices:[3,4,5]}
  ];
  return null;
 }
 if(rosterTeam(side)==="mw"){
  if(op.id==="chaos-lord"){
   const result=[];
   for(const pistol of [{key:"bolt",label:"爆矢手槍",indices:[0]},{key:"plasma",label:"等離子手槍",indices:[1,2]}]){
    for(const melee of [{key:"claw",label:"閃電爪",indices:[3]},{key:"fist",label:"動力拳",indices:[4]},{key:"power",label:"動力武器",indices:[5]}])result.push({key:pistol.key+"-"+melee.key,label:pistol.label+"＋"+melee.label,indices:[...pistol.indices,...melee.indices]});
   }
   result.push({key:"relic",label:"聖物閃電雙爪",indices:[6]});
   return result;
  }
  if(op.id==="champion")return [
   {key:"bolt-fist",label:"爆矢手槍＋動力拳",indices:[0,3]},
   {key:"bolt-power",label:"爆矢手槍＋動力武器",indices:[0,4]},
   {key:"plasma-fist",label:"等離子手槍＋動力拳",indices:[1,2,3]},
   {key:"plasma-power",label:"等離子手槍＋動力武器",indices:[1,2,4]}
  ];
  if(op.id==="raptor")return [
   {key:"bolt",label:"爆矢手槍",indices:[0,3]},
   {key:"plasma",label:"等離子手槍",indices:[1,2,3]}
  ];
  if(op.id==="skysear")return [
   {key:"flamer",label:"火焰噴射器",indices:[0,1,5]},
   {key:"melta",label:"熱熔槍",indices:[0,2,5]},
   {key:"plasma",label:"等離子槍",indices:[0,3,4,5]}
  ];
  return null;
 }
 if(rosterTeam(side)==="ci"&&op.id==="superior")return [
  {key:"stake",label:"聖物降罪者擲樁器＋聖物爆矢手槍",indices:[1,2,3]},
  {key:"inferno",label:"獄火手槍",indices:[0,3]}
 ];
 if(rosterTeam(side)==="cc"){
  if(op.id==="warrior")return [
   {key:"gauss",label:"高斯剖切機",indices:[0,3]},
   {key:"tesla",label:"特斯拉拋射器",indices:[1,2,3]}
  ];
  if(op.id==="tomb-crawler")return [
   {key:"gauss",label:"雙聯高斯收割砲",indices:[1,2,3]},
   {key:"phase",label:"跨維隔振器",indices:[0,3]}
  ];
  return null;
 }
 if(rosterTeam(side)!=="wk")return null;
 if(op.id==="boss-nob")return [{key:"single",label:"火箭手砲＋粉碎錘",indices:[0,4]},{key:"dual",label:"雙持火箭手砲＋砍刀",indices:[1,2,3]}];
 if(op.id==="gunner")return [{key:"heavy",label:"重型火箭發射器",indices:[0,2]},{key:"rokkit",label:"火箭發射器",indices:[1,2]}];
 if(op.id==="rokkiteer")return [{key:"pulsa",label:"脈衝飛彈",indices:[0,1,3]},{key:"rack",label:"火箭掛架",indices:[1,2,3]}];
 return null;
}
function wkIndices(side,op,kind){const opts=wkOptions(side,op);return opts?(opts.find(o=>o.key===kind)||opts[0]).indices:(op.weapons||[]).map((_,i)=>i)}
function wkSavedKind(side,op,selected){const opts=wkOptions(side,op);return opts?(opts.find(o=>o.indices.every(i=>selected?.includes(i))&&selected?.length===o.indices.length)||opts[0]).key:null}
function chooseBattlePickerMwChampion(slot,kind){
 if(!battlePicker||rosterTeam(battlePicker.side)!=="mw"||battlePicker.id!=="champion")return;
 const [pistol,melee]=(battlePicker.wk||"bolt-fist").split("-");
 const next=slot==="pistol"?kind+"-"+melee:pistol+"-"+kind;
 chooseBattlePickerWk(next);
}
function chooseBattlePickerWk(kind){if(!battlePicker)return;const op=rosterOps(battlePicker.side).find(o=>o.id===battlePicker.id);if(!wkOptions(battlePicker.side,op)?.some(o=>o.key===kind))return;battlePicker.wk=kind;renderBattlePickerPreservingState()}
function openBattlePicker(side,id,index=-1){
 const op=rosterOps(side).find(x=>x.id===id);
 if(!battleDraft||!op)return;
 if(index<0&&!canDraftAdd(side,id))return;
 if(index>=0&&battleDraft[side][index]!==id)return;
 const selected=index>=0?battleWeaponSelection(side,index,op):null;
 battlePicker={side,id,index,primary:selected&&selected.some(i=>xv26PrimaryIndices(op,"fusion").includes(i))?"fusion":"rapid",
 rifle:index>=0&&aodRifleConfigurable(side,op)?aodRifleKind(side,index,op):"auto",
 melee:index>=0&&aodSergeantConfigurable(side,op)?aodSergeantMeleeKind(side,index,op):AOD_INTERCESSOR_MELEE[0], assault:index>=0&&aodAssaultConfigurable(side,op)?aodAssaultKind(side,index,op):"heavy", assaultMelee:index>=0&&aodAssaultConfigurable(side,op)?aodAssaultMeleeKind(side,index,op):"鏈鋸劍", wk:wkSavedKind(side,op,selected),expandedRule:null};
 render();
 document.addEventListener("keydown",battlePickerHandleKeydown);
 document.querySelector(".battle-config-header button")?.focus();
}
function closeBattlePicker(){
 document.removeEventListener("keydown",battlePickerHandleKeydown);
 battlePicker=null;render();
}
// Keep the user's place while changing weapons or expanding a rule.
// render() rebuilds the dialog DOM, so restore its scroll and keyboard focus.
function renderBattlePickerPreservingState(){
 const panel=document.querySelector(".battle-config-panel");
 const preview=document.querySelector(".battle-config-preview-list");
 const panelTop=panel?.scrollTop||0,previewTop=preview?.scrollTop||0;
 const focused=document.activeElement;
 const focusName=focused?.getAttribute("name");
 const focusValue=focused?.getAttribute("value");
 const ruleButton=focused?.closest(".battle-preview-rule");
 const ruleIndex=ruleButton?[...document.querySelectorAll(".battle-preview-rule")].indexOf(ruleButton):-1;
 render();
 const nextPanel=document.querySelector(".battle-config-panel");
 const nextPreview=document.querySelector(".battle-config-preview-list");
 if(nextPanel)nextPanel.scrollTop=panelTop;
 if(nextPreview)nextPreview.scrollTop=previewTop;
 let target=null;
 if(focusName){
  target=[...document.querySelectorAll(".battle-config-panel input")].find(el=>
   el.getAttribute("name")===focusName&&el.getAttribute("value")===focusValue);
  // Melee radios have no value; match checked input after rerender.
  if(!target)target=document.querySelector(`.battle-config-panel input[name="${focusName}"]:checked`);
 }
 if(!target&&ruleIndex>=0)target=document.querySelectorAll(".battle-preview-rule button")[ruleIndex];
 target?.focus({preventScroll:true});
}
function chooseBattlePickerPrimary(kind){if(battlePicker){battlePicker.primary=kind;renderBattlePickerPreservingState()}}
function chooseBattlePickerRifle(kind){
 if(!battlePicker||!AOD_RIFLE_OPTIONS.some(x=>x.key===kind))return;
 battlePicker.rifle=kind;renderBattlePickerPreservingState();
}
function chooseBattlePickerMelee(kind){
 if(!battlePicker||!AOD_INTERCESSOR_MELEE.includes(kind))return;
 battlePicker.melee=kind;renderBattlePickerPreservingState();
}
function chooseBattlePickerAssault(kind){
 if(!battlePicker||!["flamer","heavy","plasma"].includes(kind))return;
 battlePicker.assault=kind;
 if(kind==="plasma")battlePicker.assaultMelee="鏈鋸劍";
 renderBattlePickerPreservingState();
}
function chooseBattlePickerAssaultMelee(kind){
 if(!battlePicker||!AOD_SERGEANT_MELEE.includes(kind))return;
 battlePicker.assaultMelee=kind;renderBattlePickerPreservingState();
}
function confirmBattlePicker(){
 const picker=battlePicker;if(!picker)return;
 const {side,id,index}=picker,op=rosterOps(side).find(x=>x.id===id);
 if(!op)return;
 if(index<0&&!canDraftAdd(side,id)){alert("已達編成限制，無法加入此特工。");return;}
 if(rosterTeam(side)==="cc"&&id==="tomb-crawler"&&picker.wk==="phase"){
  const used=battleDraft[side].reduce((n,entry,i)=>{
   if(entry!=="tomb-crawler"||i===index)return n;
   const other=rosterOps(side).find(o=>o.id===entry);
   return n+(battleWeaponSelection(side,i,other).includes(0)?1:0);
  },0);
  if(used>=1){alert("冥工之環全隊最多只能裝備 1 個跨維隔振器。");return;}
 }
 if(rosterTeam(side)==="mw"&&wkOptions(side,op)){
  const indices=wkIndices(side,op,picker.wk);
  if(mwOptionMarked(op,indices)&&mwSpecialCount(side,index)>=2){
   alert("屠戮之翼：全隊裝備等離子手槍、熱熔槍或等離子槍的特工合計最多 2 名。");return;
  }
 }
 const isFusion=xv26CanChoosePrimary(side,op)&&picker.primary==="fusion";
 const wasFusion=index>=0&&battleWeaponSelection(side,index,op).some(i=>xv26PrimaryIndices(op,"fusion").includes(i));
 if(isFusion&&!wasFusion&&xv26FusionCount(side)>=2){alert("XV26 全隊融合砲最多 2 把。");return;}
 let target=index;
 if(target<0){battleDraft[side].push(id);target=battleDraft[side].length-1;}
 if(xv26CanChoosePrimary(side,op)){
  const all=(op.weapons||[]).map((_,i)=>i),exclude=new Set([...xv26PrimaryIndices(op,"fusion"),...xv26PrimaryIndices(op,"rapid")]);
  battleWeaponDraft[side][battleWeaponKey(side,target)]=[...all.filter(i=>!exclude.has(i)),...xv26PrimaryIndices(op,picker.primary)];
 }
 if(wkOptions(side,op)){battleWeaponDraft[side][battleWeaponKey(side,target)]=wkIndices(side,op,picker.wk);}
 if(aodAssaultConfigurable(side,op)){
  battleWeaponDraft[side][battleWeaponKey(side,target)]=configuredAodAssaultWeapons(op,picker.assault,picker.assaultMelee);
 }
 if(aodRifleConfigurable(side,op)){
  battleWeaponDraft[side][battleWeaponKey(side,target)]=aodSergeantConfigurable(side,op)?
   configuredAodSergeantWeapons(op,picker.rifle,picker.melee):
   configuredAodWeapons(op,picker.rifle);
 }
 document.removeEventListener("keydown",battlePickerHandleKeydown);
 battlePicker=null;render();
}
function removeBattleRosterEntry(side,index){
 if(!battleDraft||index<0)return;
 const a=battleDraft[side],id=a[index],r=rosterRule(side);
 if(!id||r?.fixed?.[id]&&selectedCount(a,id)<=r.fixed[id])return;
 const before=a.map((value,i)=>({value,chosen:battleWeaponDraft[side][battleWeaponKey(side,i)]}));
 before.splice(index,1);a.splice(index,1);battleWeaponDraft[side]={};
 before.forEach((item,i)=>{if(Array.isArray(item.chosen))battleWeaponDraft[side][battleWeaponKey(side,i)]=item.chosen});
 document.removeEventListener("keydown",battlePickerHandleKeydown);
 battlePicker=null;render();
}
function battlePickerPreviewIndices(side,op,picker){
 if(wkOptions(side,op))return wkIndices(side,op,picker.wk);
 if(aodAssaultConfigurable(side,op))return configuredAodAssaultWeapons(op,picker.assault,picker.assaultMelee);
 if(aodSergeantConfigurable(side,op))return configuredAodSergeantWeapons(op,picker.rifle,picker.melee).filter(i=>i>=0);
 if(aodRifleConfigurable(side,op))return configuredAodWeapons(op,picker.rifle);
 if(xv26CanChoosePrimary(side,op)){
  const all=(op.weapons||[]).map((_,i)=>i);
  const excludes=new Set([...xv26PrimaryIndices(op,"rapid"),...xv26PrimaryIndices(op,"fusion")]);
  return all.filter(i=>!excludes.has(i)).concat(xv26PrimaryIndices(op,picker.primary));
 }
 return (op.weapons||[]).map((_,i)=>i);
}
function toggleBattlePickerRule(key){
 if(!battlePicker)return;
 battlePicker.expandedRule=battlePicker.expandedRule===key?null:key;
 renderBattlePickerPreservingState();
}
function battlePickerRuleChips(side,weapon,weaponIndex,picker){
 const t=TEAMS[rosterTeam(side)]||{};
 const custom=t.weaponRules||{},keywords=t.weaponKeywords||{};
 const rules=(weapon[5]||[]).map((r,i)=>{
  const id=ruleId(r),k=KW[id],label=ruleLabel(r),en=ruleEn(r);
  return {key:`${weaponIndex}:rule:${i}`,label:label||id,en,text:k?.text||"",kind:"通用武器規則"};
 });
 for(const [i,id] of (weapon[6]||[]).entries()){
  const r=custom[id]||keywords[id];
  rules.push({key:`${weaponIndex}:custom:${i}`,label:r?.[0]||id,en:r?.[1]||"",text:r?.[2]||"",kind:custom[id]?"陣營專用規則":"武器關鍵字"});
 }
 if(!rules.length)return "";
 return `<div class="battle-preview-rules">${rules.map(r=>{
  const open=picker.expandedRule===r.key;
  return `<div class="battle-preview-rule"><button type="button" class="chip ${open?"open":""}" aria-expanded="${open}" onclick="toggleBattlePickerRule('${r.key}')">${esc(r.label)}${r.en?` · ${esc(r.en)}`:""}</button>${open?`<div class="battle-preview-explanation"><small>${esc(r.kind)}</small><p>${esc(r.text||"目前資料沒有此規則的詳細說明")}</p></div>`:""}</div>`;
 }).join("")}</div>`;
}
function battlePickerPreview(side,op,picker){
 const indices=battlePickerPreviewIndices(side,op,picker);
 const weapons=indices.map(i=>({index:i,w:op.weapons?.[i]})).filter(x=>x.w);
 return `<div class="battle-config-preview"><strong>武器與規則預覽</strong>
 <div class="battle-config-preview-list">${weapons.map(({index,w})=>`<div class="battle-preview-weapon"><div class="battle-preview-weapon-head"><b>${esc(w[0])}</b><small>${esc(w[1]||"")} · 攻擊 ${esc(w[2]??"—")} · 命中 ${esc(w[3]??"—")} · 傷害 ${esc(w[4]??"—")}</small></div>${battlePickerRuleChips(side,w,index,picker)}</div>`).join("")}</div></div>`;
}
function battlePickerFusionAvailable(picker,op){
 if(!xv26CanChoosePrimary(picker.side,op))return true;
 if(picker.index>=0){
  const selected=battleWeaponSelection(picker.side,picker.index,op);
  if(selected.some(i=>xv26PrimaryIndices(op,"fusion").includes(i)))return true;
 }
 return xv26FusionCount(picker.side)<2;
}
function battlePickerHandleKeydown(event){
 if(!battlePicker)return;
 if(event.key==="Escape"){
  event.preventDefault();closeBattlePicker();return;
 }
 if(event.key!=="Tab")return;
 const panel=document.querySelector(".battle-config-panel");
 if(!panel)return;
 const controls=[...panel.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(el=>el.getClientRects().length);
 if(!controls.length)return;
 const first=controls[0],last=controls[controls.length-1];
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
function battlePickerPanel(){
 const x=battlePicker;if(!x)return "";
 const op=rosterOps(x.side).find(o=>o.id===x.id);if(!op)return "";
 const primary=xv26CanChoosePrimary(x.side,op),fixed=x.index>=0&&!!rosterRule(x.side)?.fixed?.[x.id];
 return `<div class="battle-config-overlay" onclick="if(event.target===this)closeBattlePicker()"><section class="battle-config-panel" role="dialog" aria-modal="true" aria-label="配置特工"><div class="battle-config-header"><h3>${esc(op.name)}</h3><button type="button" onclick="closeBattlePicker()" aria-label="關閉">✕</button></div>
 <p>${esc(op.role||"")}</p>${op.image?`<img class="battle-config-image" src="${esc(op.image)}" alt="">`:""}
 ${rosterTeam(x.side)==="mw"&&op.id==="champion"?`
 <fieldset class="battle-config-weapons"><legend>選擇手槍</legend>
 ${[{key:"bolt",label:"爆矢手槍"},{key:"plasma",label:"等離子手槍"}].map(item=>`<label><input type="radio" name="battle-mw-champion-pistol" value="${item.key}" ${(x.wk||"bolt-fist").startsWith(item.key+"-")?"checked":""} onchange="chooseBattlePickerMwChampion('pistol','${item.key}')">${item.label}</label>`).join("")}</fieldset>
 <fieldset class="battle-config-weapons"><legend>選擇近戰武器</legend>
 ${[{key:"fist",label:"動力拳"},{key:"power",label:"動力武器"}].map(item=>`<label><input type="radio" name="battle-mw-champion-melee" value="${item.key}" ${(x.wk||"bolt-fist").endsWith("-"+item.key)?"checked":""} onchange="chooseBattlePickerMwChampion('melee','${item.key}')">${item.label}</label>`).join("")}</fieldset>`:
 wkOptions(x.side,op)?`<fieldset class="battle-config-weapons"><legend>選擇配備武器</legend>${wkOptions(x.side,op).map(item=>`<label><input type="radio" name="battle-wk-weapon" value="${item.key}" ${x.wk===item.key?"checked":""} onchange="chooseBattlePickerWk('${item.key}')">${item.label}</label>`).join("")}</fieldset>`:""}
 ${aodRifleConfigurable(x.side,op)?`<fieldset class="battle-config-weapons"><legend>選擇主武器</legend>
 ${AOD_RIFLE_OPTIONS.map(item=>`<label><input type="radio" name="battle-config-rifle" value="${item.key}" ${x.rifle===item.key?"checked":""} onchange="chooseBattlePickerRifle('${item.key}')">${item.label}</label>`).join("")}
 <small>其他已配備武器會保留；追獵者步槍的射擊模式會一併顯示。</small></fieldset>`:""}
 ${aodSergeantConfigurable(x.side,op)?`<fieldset class="battle-config-weapons"><legend>選擇近戰武器</legend>
 ${AOD_INTERCESSOR_MELEE.map(name=>`<label><input type="radio" name="battle-config-melee" value="${esc(name)}" ${x.melee===name?"checked":""} onchange="chooseBattlePickerMelee('${name}')">${name}</label>`).join("")}
 </fieldset>`:""}
 ${aodAssaultConfigurable(x.side,op)?`<fieldset class="battle-config-weapons"><legend>選擇手槍</legend>
 ${[{key:"flamer",label:"噴火手槍"},{key:"heavy",label:"重型爆矢手槍"},{key:"plasma",label:"等離子手槍（固定搭配鏈鋸劍）"}].map(item=>`<label><input type="radio" name="battle-assault-pistol" value="${item.key}" ${x.assault===item.key?"checked":""} onchange="chooseBattlePickerAssault('${item.key}')">${item.label}</label>`).join("")}</fieldset>
 <fieldset class="battle-config-weapons"><legend>選擇近戰武器</legend>
 ${AOD_SERGEANT_MELEE.map(name=>`<label><input type="radio" name="battle-assault-melee" value="${esc(name)}" ${x.assaultMelee===name?"checked":""} ${x.assault==="plasma"&&name!=="鏈鋸劍"?"disabled":""} onchange="chooseBattlePickerAssaultMelee('${name}')">${name}</label>`).join("")}</fieldset>`:""}
 ${primary?`<fieldset class="battle-config-weapons"><legend>選擇主武器</legend><label><input type="radio" name="battle-config-primary" value="rapid" ${x.primary==="rapid"?"checked":""} onchange="chooseBattlePickerPrimary('rapid')">速射砲</label><label><input type="radio" name="battle-config-primary" value="fusion" ${x.primary==="fusion"?"checked":""} ${battlePickerFusionAvailable(x,op)?"":"disabled"} onchange="chooseBattlePickerPrimary('fusion')">融合砲</label><small>全隊融合砲 ${xv26FusionCount(x.side)}/2${battlePickerFusionAvailable(x,op)?"":" · 已達上限"}</small></fieldset>`:""}
 ${rosterTeam(x.side)==="rav"?`<p class="battle-config-hint">蛇蟲特工沒有可切換的配備組合；以下列出此職位全部固定武器與射擊模式。</p>`:""}
 ${battlePickerPreview(x.side,op,x)}
 <div class="battle-config-actions"><button type="button" onclick="closeBattlePicker()">取消</button>${x.index>=0&&!fixed?`<button type="button" onclick="removeBattleRosterEntry('${x.side}',${x.index})">移出隊伍</button>`:""}<button type="button" onclick="confirmBattlePicker()">${x.index>=0?"確認配置":"確認加入隊伍"}</button></div></section></div>`;
}
function draftVisualCard(side,o){
 const a=battleDraft[side],count=selectedCount(a,o.id),fixed=!!rosterRule(side)?.fixed?.[o.id];
 return `<button type="button" class="battle-compact-option ${count?"is-selected":""}" onclick="openBattlePicker('${side}','${o.id}')" ${canDraftAdd(side,o.id)?"":"disabled"}>${o.image?`<img src="${esc(o.image)}" alt="" loading="lazy">`:""}<span><b>${esc(o.name)}</b><small>${esc(o.role||"")}${rosterRule(side)?.repeat?.includes(o.id)?" · 可重複":""}</small></span><em>${count?`已選 ${count}`:"＋ 加入"}</em></button>`;
}
function battleRosterProgress(side){
 const rule=rosterRule(side),a=battleDraft[side];
 if(!rule)return {total:null,remaining:0,complete:!!a.length};
 const fixed=Object.values(rule.fixed||{}).reduce((sum,n)=>sum+n,0);
 const total=fixed+(rule.leader?1:0)+rule.slots;
 const remaining=Math.max(0,total-a.length);
 return {total,remaining,complete:remaining===0&&!rosterError(side)};
}
function battleSelectedList(side){
 const a=battleDraft[side],rule=rosterRule(side);
 const progress=battleRosterProgress(side);
 const total=progress.total;
 const entries=a.map((id,index)=>{
  const op=rosterOps(side).find(o=>o.id===id);if(!op)return "";
  const chosen=battleWeaponSelection(side,index,op);
  const configurable=xv26CanChoosePrimary(side,op);
  const fusion=configurable&&chosen.some(i=>xv26PrimaryIndices(op,"fusion").includes(i));
  const weapon=wkOptions(side,op)?wkOptions(side,op).find(o=>o.key===wkSavedKind(side,op,chosen))?.label:aodAssaultConfigurable(side,op)?`${({flamer:"噴火手槍",heavy:"重型爆矢手槍",plasma:"等離子手槍"})[aodAssaultKind(side,index,op)]} · ${aodAssaultMeleeKind(side,index,op)}`:configurable?(fusion?"融合砲":"速射砲"):aodRifleConfigurable(side,op)?`${AOD_RIFLE_OPTIONS.find(x=>x.key===aodRifleKind(side,index,op))?.label||"爆矢步槍"}${aodSergeantConfigurable(side,op)?" · "+aodSergeantMeleeKind(side,index,op):""}`:rosterTeam(side)==="rav"?"固定武器配置":"預設武器";
  const isFixed=!!rule?.fixed?.[id];
  return `<button type="button" class="battle-selected-item" onclick="openBattlePicker('${side}','${id}',${index})">
   ${op.image?`<img class="battle-selected-portrait" src="${esc(op.image)}" alt="" loading="lazy">`:""}
   <span class="battle-selected-main"><b>${esc(op.name)}</b><small>${esc(weapon)}${isFixed?" · 固定編成":" · 已選入"}</small></span>
   <span class="battle-selected-edit">編輯 ›</span></button>`;
 }).join("");
 return `<section class="battle-selected-list"><div class="battle-selected-header"><h3>已加入隊伍</h3><strong>${a.length}${total===null?"":` / ${total}`} 名</strong></div>
 <div class="battle-roster-progress" role="status" aria-live="polite">
  ${total!==null?`<div class="battle-progress-track"><div class="battle-progress-fill" style="width:${Math.min(100,Math.round(a.length/Math.max(1,total)*100))}%"></div></div>`:""}
  <small>${progress.complete?"✓ 基本編成已完成":total===null?"請選擇出戰特工":`尚缺 ${progress.remaining} 名${progress.remaining===0?"，請檢查編成條件":""}`}</small>
 </div>
 ${rosterTeam(side)==="xv26"?`<p class="battle-selected-fusion">融合砲 ${xv26FusionCount(side)} / 2</p>`:""}
 ${rosterTeam(side)==="rav"?`<p class="battle-selected-fusion">蛇蟲編成：固定 1 名王蟲＋4 名其他特工；僅蛇蟲武士可重複。所有職位目前均使用固定武器配置，點擊特工可預覽完整武器與規則。</p>`:""}
 ${a.length?`<div class="battle-selected-items">${entries}</div>`:`<p>尚未選擇特工。請點左側特工加入。</p>`}
 </section>`;
}
function beginBattleSetup(){
  if(battleRoster&&!confirm("重新建立對戰？現有出戰名單會被取代，完成設定時將重置本局紀錄。"))return;
  // Keep the previous match until the replacement is confirmed and finished.
  battleDraftTeams={my:battleRoster?.myTeam||S.myTeam,enemy:battleRoster?.enemyTeam||S.enemyTeam};
  battleDraft={my:initialDraft("my"),enemy:initialDraft("enemy"),enemySkipped:false,step:0};
  battleWeaponDraft={my:{},enemy:{}};battleChapterDraft={my:{primary:"",secondary:""},enemy:{primary:"",secondary:""}};battlePicker=null;
  S.view="match";render();
}
function toggleDraftOperative(side,id){
  if(!battleDraft)return;
  const list=battleDraft[side],idx=list.indexOf(id);
  if(idx>=0)list.splice(idx,1);else list.push(id);
  render();
}
function battleSetupNext(){
  if(!battleDraft)return;
  if(battleDraft.step===1&&(!battleDraft.my.length||rosterError("my"))){alert(rosterError("my")||"請至少選擇一名我方特工。");return}
  if(battleDraft.step===2&&!battleDraft.enemySkipped&&(!battleDraft.enemy.length||rosterError("enemy"))){alert(rosterError("enemy")||"請選擇敵方特工，或勾選略過敵方編隊。");return}
  if(battleDraft.step===2){
   const error=battleWeaponValidationError();
   if(error){alert(error);return;}
  }
  if(battleDraft.step<3)battleDraft.step++;
  render();
}
function battleSetupBack(){if(battleDraft){battleDraft.step=Math.max(0,battleDraft.step-1);render()}}
function cancelBattleSetup(){
 if(!battleDraft)return;
 battleDraft=null;battleDraftTeams=null;battlePicker=null;
 battleWeaponDraft={my:{},enemy:{}};battleChapterDraft={my:{primary:"",secondary:""},enemy:{primary:"",secondary:""}};
 render();
}
function changeBattleSetupTeam(side,id){
 if(!battleDraft||battleDraft.step!==0||!TEAMS[id])return;
 battleDraftTeams[side]=id;
 battleDraft[side]=initialDraft(side);
 battleWeaponDraft[side]={};
 battleChapterDraft[side]={primary:"",secondary:""};
 render();
}
function battleTeamPicker(side){
 const selected=rosterTeam(side);
 return `<label class="battle-team-picker"><b>${side==="my"?"我方小隊":"敵方小隊"}</b><select aria-label="${side==="my"?"選擇我方小隊":"選擇敵方小隊"}" onchange="changeBattleSetupTeam('${side}',this.value)">${Object.keys(TEAMS).map(id=>`<option value="${esc(id)}" ${id===selected?"selected":""}>${esc(TEAMS[id].name)}</option>`).join("")}</select></label>`;
}
function skipEnemyRoster(){if(battleDraft){battleDraft.enemySkipped=!battleDraft.enemySkipped;render()}}
function battleWeaponKey(side,index){
 const ids=battleDraft?.[side]||[],id=ids[index];
 return `${id}#${ids.slice(0,index).filter(x=>x===id).length}`;
}
function xv26PrimaryIndices(op,kind){
 const match=kind==="fusion"?"融合砲":"速射砲";
 return (op.weapons||[]).flatMap((w,i)=>String(w[0]).includes(match)?[i]:[]);
}
function xv26CanChoosePrimary(side,op){
 return rosterTeam(side)==="xv26" &&
  ["shasvre","designator","infiltrator","liberator","lodestar","neutraliser"].includes(op.id) &&
  xv26PrimaryIndices(op,"fusion").length>0 && xv26PrimaryIndices(op,"rapid").length>0;
}
// Verified against the bundled Angels of Death operative loadout text.
// Other operatives remain on the existing complete-weapon display.
const AOD_RIFLE_IDS=["intercessor-warrior","intercessor-gunner","intercessor-sergeant"];
const AOD_RIFLE_OPTIONS=[
 {key:"auto",label:"自動爆矢步槍",prefix:"自動爆矢步槍"},
 {key:"bolt",label:"爆矢步槍",prefix:"爆矢步槍"},
 {key:"stalker",label:"追獵者爆矢步槍",prefix:"追獵者爆矢步槍"}
];
const AOD_ASSAULT_PISTOLS={flamer:["噴火手槍"],heavy:["重型爆矢手槍"],plasma:["等離子手槍（標準）","等離子手槍（過載）"]};
function aodAssaultConfigurable(side,op){return rosterTeam(side)==="aod"&&op.id==="assault-sergeant";}
function aodAssaultKind(side,index,op){
 const saved=battleWeaponDraft[side][battleWeaponKey(side,index)];
 return Object.keys(AOD_ASSAULT_PISTOLS).find(k=>Array.isArray(saved)&&AOD_ASSAULT_PISTOLS[k].some(name=>saved.includes((op.weapons||[]).findIndex(w=>w[0]===name))))||"heavy";
}
function aodAssaultMeleeKind(side,index,op){
 const saved=battleWeaponDraft[side][battleWeaponKey(side,index)];
 return AOD_SERGEANT_MELEE.find(name=>Array.isArray(saved)&&saved.includes((op.weapons||[]).findIndex(w=>w[0]===name)))||"鏈鋸劍";
}
function configuredAodAssaultWeapons(op,pistol,melee){
 const selectedPistol=AOD_ASSAULT_PISTOLS[pistol]||AOD_ASSAULT_PISTOLS.heavy;
 const selectedMelee=pistol==="plasma"?"鏈鋸劍":melee;
 return [...selectedPistol,selectedMelee].map(name=>(op.weapons||[]).findIndex(w=>w[0]===name)).filter(i=>i>=0);
}
const AOD_SERGEANT_MELEE=["鏈鋸劍","動力拳套","動力武器","雷霆錘"];
const AOD_INTERCESSOR_MELEE=["鏈鋸劍","雙拳","動力拳套","動力武器","雷霆錘"];
function aodSergeantConfigurable(side,op){
 return rosterTeam(side)==="aod"&&op.id==="intercessor-sergeant";
}
function aodSergeantMeleeIndex(op,kind){
 return (op.weapons||[]).findIndex(w=>w[0]===kind);
}
function aodSergeantMeleeKind(side,index,op){
 const saved=battleWeaponDraft[side][battleWeaponKey(side,index)];
 return AOD_INTERCESSOR_MELEE.find(name=>Array.isArray(saved)&&saved.includes(aodSergeantMeleeIndex(op,name)))||AOD_INTERCESSOR_MELEE[0];
}
function configuredAodSergeantWeapons(op,rifle,melee){
 const allMelee=new Set(AOD_INTERCESSOR_MELEE.map(x=>aodSergeantMeleeIndex(op,x)).filter(i=>i>=0));
 return configuredAodWeapons(op,rifle).filter(i=>!allMelee.has(i)).concat(aodSergeantMeleeIndex(op,melee)).filter(i=>i>=0);
}
function aodRifleConfigurable(side,op){
 return rosterTeam(side)==="aod"&&AOD_RIFLE_IDS.includes(op.id);
}
function aodRifleIndices(op,kind){
 const prefix=AOD_RIFLE_OPTIONS.find(x=>x.key===kind)?.prefix;
 return prefix?(op.weapons||[]).flatMap((w,i)=>String(w[0]).startsWith(prefix)?[i]:[]):[];
}
function aodRifleKind(side,index,op){
 const key=battleWeaponKey(side,index),saved=battleWeaponDraft[side][key];
 if(!Array.isArray(saved))return "auto";
 return AOD_RIFLE_OPTIONS.find(x=>x.key!=="auto"&&saved.some(i=>aodRifleIndices(op,x.key).includes(i)))?.key||"auto";
}
function configuredAodWeapons(op,kind){
 const rifles=new Set(AOD_RIFLE_OPTIONS.flatMap(x=>aodRifleIndices(op,x.key)));
 return [...(op.weapons||[]).keys()].filter(i=>!rifles.has(i)).concat(aodRifleIndices(op,kind));
}
function battleWeaponSelection(side,index,op){
 const key=battleWeaponKey(side,index),saved=battleWeaponDraft[side][key];
 if(Array.isArray(saved))return saved;
 const all=(op.weapons||[]).map((_,i)=>i);
 if(wkOptions(side,op))return wkIndices(side,op,wkOptions(side,op)[0].key);
 if(aodAssaultConfigurable(side,op))return configuredAodAssaultWeapons(op,"heavy","鏈鋸劍");
 if(aodSergeantConfigurable(side,op))return configuredAodSergeantWeapons(op,"auto",AOD_INTERCESSOR_MELEE[0]);
 if(aodRifleConfigurable(side,op))return configuredAodWeapons(op,"auto");
 return xv26CanChoosePrimary(side,op)?all.filter(i=>!xv26PrimaryIndices(op,"fusion").includes(i)):all;
}
function xv26FusionCount(side){
 return (battleDraft?.[side]||[]).reduce((count,id,index)=>{
  const op=rosterOps(side).find(o=>o.id===id);
  return count+(op&&xv26CanChoosePrimary(side,op)&&battleWeaponSelection(side,index,op).some(i=>xv26PrimaryIndices(op,"fusion").includes(i))?1:0);
 },0);
}
function setXv26Primary(side,index,kind){
 const id=battleDraft?.[side]?.[index],op=rosterOps(side).find(o=>o.id===id);
 if(!op||!xv26CanChoosePrimary(side,op))return;
 const old=battleWeaponSelection(side,index,op);
 const alreadyFusion=old.some(i=>xv26PrimaryIndices(op,"fusion").includes(i));
 if(kind==="fusion"&&!alreadyFusion&&xv26FusionCount(side)>=2){
  alert("XV26 全隊融合砲最多 2 把，請先更換其他特工的主武器。");
  document.querySelectorAll(`input[name="xv-primary-${side}-${index}"]`).forEach(r=>r.checked=r.value==="rapid");
  return;
 }
 const remove=new Set([...xv26PrimaryIndices(op,"fusion"),...xv26PrimaryIndices(op,"rapid")]);
 battleWeaponDraft[side][battleWeaponKey(side,index)]=[
  ...old.filter(i=>!remove.has(i)),...xv26PrimaryIndices(op,kind)
 ];
 render();
}
function battleWeaponValidationError(){
 if(!battleDraft)return "尚未建立編隊。";
 for(const side of ["my","enemy"]){
  if(side==="enemy"&&battleDraft.enemySkipped)continue;
  if(rosterTeam(side)==="mw"){
   let marked=0;
   for(let i=0;i<battleDraft[side].length;i++){
    const op=rosterOps(side).find(o=>o.id===battleDraft[side][i]);
    if(!op)continue;
    const chosen=battleWeaponSelection(side,i,op),opts=wkOptions(side,op);
    if(opts&&!opts.some(o=>o.indices.length===chosen.length&&o.indices.every(j=>chosen.includes(j))))return `${side==="my"?"我方":"敵方"} ${op.name} 武器配置不合法。`;
    if(mwOptionMarked(op,chosen))marked++;
   }
   if(marked>2)return `${side==="my"?"我方":"敵方"} 屠戮之翼特殊武器特工最多 2 名。`;
  }
  if(rosterTeam(side)==="ks"){
   for(let i=0;i<battleDraft[side].length;i++){
    const op=rosterOps(side).find(o=>o.id===battleDraft[side][i]);
    if(!op)continue;
    const opts=wkOptions(side,op);
    if(!opts)continue;
    const chosen=battleWeaponSelection(side,i,op);
    if(!opts.some(o=>o.indices.length===chosen.length&&o.indices.every(j=>chosen.includes(j))))
     return `${side==="my"?"我方":"敵方"} ${op.name} 的武器配置不合法。`;
   }
  }
  if(rosterTeam(side)==="cc"){
   let phaseCount=0;
   for(let i=0;i<battleDraft[side].length;i++){
    const op=rosterOps(side).find(o=>o.id===battleDraft[side][i]);
    if(!op||!wkOptions(side,op))continue;
    const chosen=battleWeaponSelection(side,i,op);
    if(!wkOptions(side,op).some(opt=>opt.indices.length===chosen.length&&opt.indices.every(j=>chosen.includes(j))))
     return `${side==="my"?"我方":"敵方"} ${op.name} 的武器配置不合法。`;
    if(op.id==="tomb-crawler"&&chosen.includes(0))phaseCount++;
   }
   if(phaseCount>1)return `${side==="my"?"我方":"敵方"} 跨維隔振器最多 1 個。`;
  }
  if(rosterTeam(side)==="aod"){
   for(let i=0;i<battleDraft[side].length;i++){
    const op=rosterOps(side).find(o=>o.id===battleDraft[side][i]);
    if(op&&aodAssaultConfigurable(side,op)){
     const chosen=battleWeaponSelection(side,i,op);
     const valid=Object.keys(AOD_ASSAULT_PISTOLS).some(pistol=>AOD_SERGEANT_MELEE.some(melee=>{
      if(pistol==="plasma"&&melee!=="鏈鋸劍")return false;
      const expected=configuredAodAssaultWeapons(op,pistol,melee);
      return expected.length===(pistol==="plasma"?3:2)&&expected.length===chosen.length&&expected.every(j=>chosen.includes(j));
     }));
     if(!valid)return `${side==="my"?"我方":"敵方"} ${op.name} 的手槍與近戰武器組合不合法。`;
    }
    if(!op||!aodRifleConfigurable(side,op))continue;
    const chosen=battleWeaponSelection(side,i,op);
    const equipped=AOD_RIFLE_OPTIONS.filter(x=>chosen.some(j=>aodRifleIndices(op,x.key).includes(j)));
    if(equipped.length!==1||aodRifleIndices(op,equipped[0].key).some(j=>!chosen.includes(j)))
     return `${side==="my"?"我方":"敵方"} ${op.name} 必須選擇且完整保留一種爆矢步槍。`;
    if(aodSergeantConfigurable(side,op)){
     const equippedMelee=AOD_INTERCESSOR_MELEE.filter(name=>chosen.includes(aodSergeantMeleeIndex(op,name)));
     if(equippedMelee.length!==1)return `${side==="my"?"我方":"敵方"} ${op.name} 必須且只能選擇一種近戰武器。`;
    }
   }
  }
  if(rosterTeam(side)!=="xv26")continue;
  const count=xv26FusionCount(side);
  if(count>2)return `${side==="my"?"我方":"敵方"} XV26 融合砲 ${count} 把，超過最多 2 把的限制。`;
  for(let i=0;i<battleDraft[side].length;i++){
   const op=rosterOps(side).find(o=>o.id===battleDraft[side][i]);
   if(!op||!xv26CanChoosePrimary(side,op))continue;
   const selected=battleWeaponSelection(side,i,op);
   const rapid=selected.some(j=>xv26PrimaryIndices(op,"rapid").includes(j));
   const fusion=selected.some(j=>xv26PrimaryIndices(op,"fusion").includes(j));
   if(rapid===fusion)return `${side==="my"?"我方":"敵方"} ${op.name} 必須且只能選擇一種主武器。`;
  }
 }
 return "";
}
// Chapter tactics are selected once per Angels of Death team for the battle.
const AOD_CHAPTER_TACTICS=["猛攻","決鬥家","堅決","隱匿","機動","強健","神射手","攻城戰專家"];
let battleChapterDraft={my:{primary:"",secondary:""},enemy:{primary:"",secondary:""}};
function chapterTacticsError(side){
 if(rosterTeam(side)!=="aod"||(side==="enemy"&&battleDraft?.enemySkipped))return "";
 const t=battleChapterDraft[side];
 if(!t||!AOD_CHAPTER_TACTICS.includes(t.primary)||!AOD_CHAPTER_TACTICS.includes(t.secondary))return `${side==="my"?"我方":"敵方"}死亡天使需要選擇首要與次要戰團戰術。`;
 if(t.primary===t.secondary)return `${side==="my"?"我方":"敵方"}死亡天使的兩項戰團戰術不可重複。`;
 return "";
}
function chooseChapterTactic(side,slot,value){
 if(!battleDraft||battleDraft.step!==3||rosterTeam(side)!=="aod"||!["primary","secondary"].includes(slot))return;
 if(value!==""&&!AOD_CHAPTER_TACTICS.includes(value))return;
 battleChapterDraft[side][slot]=value;
 render();
}
// In-match chapter tactics are public, editable state. Keep setup drafts separate.
function changeLiveChapterTactic(side,slot,value){
 if(!battleRoster||!["my","enemy"].includes(side)||!["primary","secondary"].includes(slot))return;
 if((side==="my"?battleRoster.myTeam:battleRoster.enemyTeam)!=="aod"||battleRoster[side]===null)return;
 if(!AOD_CHAPTER_TACTICS.includes(value))return;
 const saved=battleRoster.chapterTactics||{my:{primary:"",secondary:""},enemy:{primary:"",secondary:""}};
 const current=saved[side]||{primary:"",secondary:""};
 const other=slot==="primary"?"secondary":"primary";
 if(value===current[other]){alert("首要與次要戰團戰術不可相同。");renderMatchHub();return;}
 if(current[slot]===value)return;
 const old=current[slot]||"未設定";
 saved[side]={...current,[slot]:value};
 battleRoster.chapterTactics=saved;
 localStorage.setItem(ROSTER_KEY,JSON.stringify(battleRoster));
 trackerLog(`${trackerSideName(side)}${slot==="primary"?"首要":"次要"}戰團戰術：${old} → ${value}`);
 saveMatchTracker();
 renderMatchHub();
}
function liveChapterTacticsPanel(side){
 if(!battleRoster||battleRoster[side]===null||(side==="my"?battleRoster.myTeam:battleRoster.enemyTeam)!=="aod")return "";
 const t=battleRoster.chapterTactics?.[side]||{primary:"",secondary:""};
 const field=(slot,title)=>`<label class="battle-chapter-choice"><span>${title}</span><select aria-label="${side==="my"?"我方":"敵方"}${title}" onchange="changeLiveChapterTactic('${side}','${slot}',this.value)"><option value="" disabled ${!t[slot]?"selected":""}>請選擇</option>${AOD_CHAPTER_TACTICS.map(name=>`<option value="${esc(name)}" ${t[slot]===name?"selected":""} ${t[slot==="primary"?"secondary":"primary"]===name?"disabled":""}>${esc(name)}</option>`).join("")}</select></label>`;
 return `<section class="battle-chapter-picker"><h3>${side==="my"?"我方":"敵方"} · 死亡天使戰團戰術</h3><div class="battle-chapter-grid">${field("primary","首要戰團戰術")}${field("secondary","次要戰團戰術")}</div><small>對戰中可修改；變更會保存並加入戰鬥紀錄，不會重置本局數值。</small></section>`;
}
function chapterTacticsPicker(side){
 if(rosterTeam(side)!=="aod"||(side==="enemy"&&battleDraft.enemySkipped))return "";
 const t=battleChapterDraft[side];
 const field=(slot,title)=>`<label class="battle-chapter-choice"><span>${title}</span><select onchange="chooseChapterTactic('${side}','${slot}',this.value)"><option value="">請選擇</option>${AOD_CHAPTER_TACTICS.map(name=>`<option value="${esc(name)}" ${t[slot]===name?"selected":""} ${t[slot!=="primary"?"primary":"secondary"]===name?"disabled":""}>${esc(name)}</option>`).join("")}</select></label>`;
 return `<section class="battle-chapter-picker"><h3>${side==="my"?"我方":"敵方"} · 死亡天使戰團戰術</h3><div class="battle-chapter-grid">${field("primary","首要戰團戰術")}${field("secondary","次要戰團戰術")}</div>${chapterTacticsError(side)?`<small class="battle-validation">${esc(chapterTacticsError(side))}</small>`:""}<small>本場使用兩種不同戰術；戰術效果請參考死亡天使的「戰團戰術」規則卡。</small></section>`;
}
function battleSetupSummarySide(side){
 const team=TEAMS[rosterTeam(side)],ids=battleDraft[side];
 if(side==="enemy"&&battleDraft.enemySkipped)
  return `<section class="battle-review-side"><h3>敵方 · ${esc(team?.name||"")}</h3><p>未建立敵方出戰名單；仍可查閱完整敵方規則。</p></section>`;
 const cards=ids.map((id,index)=>{
  const op=rosterOps(side).find(o=>o.id===id);
  if(!op)return `<li>${esc(id)}（資料缺失）</li>`;
  const chosen=battleWeaponSelection(side,index,op);
  const weapons=chosen.map(i=>op.weapons?.[i]?.[0]).filter(Boolean);
  const isXv=xv26CanChoosePrimary(side,op);
  const fusion=isXv&&chosen.some(i=>xv26PrimaryIndices(op,"fusion").includes(i));
  const main=wkOptions(side,op)?`<strong>${esc(wkOptions(side,op).find(o=>o.key===wkSavedKind(side,op,chosen))?.label||"")}</strong>`:isXv?`<strong>${fusion?"融合砲":"速射砲"}</strong>`:
    aodAssaultConfigurable(side,op)?`<strong>${esc(({flamer:"噴火手槍",heavy:"重型爆矢手槍",plasma:"等離子手槍"})[aodAssaultKind(side,index,op)]+" · "+aodAssaultMeleeKind(side,index,op))}</strong>`:
    aodRifleConfigurable(side,op)?`<strong>${esc((AOD_RIFLE_OPTIONS.find(x=>x.key===aodRifleKind(side,index,op))?.label||"")+(aodSergeantConfigurable(side,op)?" · "+aodSergeantMeleeKind(side,index,op):""))}</strong>`:
    `<span>預設武器資料</span>`;
  return `<li><span>${esc(op.name)}</span>${main}</li>`;
 }).join("");
 return `<section class="battle-review-side"><h3>${side==="my"?"我方":"敵方"} · ${esc(team?.name||"")}</h3><p>共 ${ids.length} 名${rosterTeam(side)==="xv26"?` · 融合砲 ${xv26FusionCount(side)}/2`:""}</p><ul>${cards}</ul></section>`;
}
function finishBattleSetup(){
  if(!battleDraft||!battleDraft.my.length||rosterError("my")||(!battleDraft.enemySkipped&&rosterError("enemy")))return;
  const weaponError=battleWeaponValidationError();
  if(weaponError){alert(weaponError);return;}
  for(const side of ["my","enemy"]){const error=chapterTacticsError(side);if(error){alert(error);return;}}
  if(!confirm("開始對戰並重置本局 TP、VP、CP 與戰鬥紀錄？"))return;
  for(const side of ["my","enemy"]){
   (battleDraft[side]||[]).forEach((id,index)=>{
    const op=rosterOps(side).find(o=>o.id===id);
    if(op){
     const key=battleWeaponKey(side,index);
     if(!Array.isArray(battleWeaponDraft[side][key]))
      battleWeaponDraft[side][key]=battleWeaponSelection(side,index,op);
    }
   });
  }
  battleRoster={myTeam:battleDraftTeams.my,enemyTeam:battleDraftTeams.enemy,my:[...battleDraft.my],enemy:battleDraft.enemySkipped?null:[...battleDraft.enemy],weapons:JSON.parse(JSON.stringify(battleWeaponDraft)),chapterTactics:JSON.parse(JSON.stringify(battleChapterDraft))};
  localStorage.setItem(ROSTER_KEY,JSON.stringify(battleRoster));
  battleDraft=null;battleDraftTeams=null;
  S.matchTracker={tp:1,initiative:"my",sides:{my:{cp:0,vp:0,cards:{"重擲":0,"+1/-1":0,"+2/-2":0,"+3/-3":0},usedPloys:[]},enemy:{cp:0,vp:0,cards:{"重擲":0,"+1/-1":0,"+2/-2":0,"+3/-3":0},usedPloys:[]}},log:[]};
  saveMatchTracker();S.matchTab="roster";render();
}
function renderBattleSetup(){
  const d=battleDraft,side=d.step===1?"my":"enemy";
  if(d.step===0)return `<div class="battle-setup"><h2>① 選擇本場雙方小隊</h2><p>在這裡決定雙方小隊。進入下一步後就鎖定；若要修改，請按「上一步」回來。</p><div class="battle-team-picker-grid">${battleTeamPicker("my")}${battleTeamPicker("enemy")}</div><button onclick="battleSetupNext()">確認小隊，下一步 →</button> <button onclick="cancelBattleSetup()">取消設定</button></div>`;
  if(d.step===3){
    return `<div class="battle-setup"><h2>確認本場編隊</h2><p>已檢查基本編成條件。${[rosterTeam("my"),rosterTeam("enemy")].includes("xv26")?"XV26 已檢查主武器二選一及融合砲最多兩把。":""}${[rosterTeam("my"),rosterTeam("enemy")].includes("aod")?"死亡天使已檢查目前支援的仲裁者步槍及軍士近戰武器選擇。":""}尚未支援的武器及特殊限制仍須依「編成規則」核對。</p>
    <div class="battle-review-grid">${battleSetupSummarySide("my")}${battleSetupSummarySide("enemy")}</div>
    <div class="battle-review-grid">${chapterTacticsPicker("my")}${chapterTacticsPicker("enemy")}</div>
    <p class="battle-review-note">請確認雙方特工及已設定的武器。尚未支援配置的職位會顯示預設武器資料，請自行核對合法性。</p>
    <button onclick="battleSetupBack()">返回修改</button> <button onclick="finishBattleSetup()" ${chapterTacticsError("my")||chapterTacticsError("enemy")?'disabled title="請先完成戰團戰術選擇"':''}>確認並開始對戰</button> <button onclick="cancelBattleSetup()">取消設定</button></div>`;
  }
  const ops=rosterOps(side),chosen=d[side];
  return `<div class="battle-setup"><h2>${d.step===1?"② 選擇我方出戰特工":"③ 選擇敵方出戰特工"}</h2>
  <p>${esc(TEAMS[rosterTeam(side)]?.name||"")} · 已選 ${chosen.length} 名。選擇的是本場快捷名單，不會修改原始資料。</p>
  ${d.step===2?`<label class="battle-skip"><input type="checkbox" ${d.enemySkipped?"checked":""} onchange="skipEnemyRoster()"> 暫不設定敵方特工（保留完整敵方規則查詢）</label>`:""}
  ${rosterRule(side)?`<div class="battle-xv26-tools"><small>${esc(rosterRule(side).note||"請自行選擇出戰特工，系統檢查基本編成條件。")}${rosterTeam(side)==="ks"?`<br><strong>砲手／神射手：${(battleDraft?.[side]||[]).filter(id=>["gunner-flamer","gunner-grenade","gunner-volley","gunner-melta","gunner-plasma","sharpshooter"].includes(id)).length} / 4</strong>`:""}</small></div>`:""}
  <div class="battle-compact-layout"><section><h3>尚可加入的特工</h3><div class="battle-compact-options">${ops.filter(o=>canDraftAdd(side,o.id)).map(o=>draftVisualCard(side,o)).join("")||`<p class="battle-options-empty">目前沒有其他可加入的特工。需要調整時，請從「已加入隊伍」編輯或移除特工。</p>`}</div></section>${battleSelectedList(side)}</div>${battlePickerPanel()}
  ${rosterError(side)?`<p class="battle-validation">${esc(rosterError(side))}</p>`:""}
  <p class="battle-note">點擊特工開啟配置，確認後加入隊伍。點擊已加入名單可修改武器；非固定特工也可移除。已選且不可重複的職位會從可選列表隱藏；允許重複的職位則保留至編成上限。${rosterTeam(side)==="xv26"?"XV26 融合砲最多 2 把。":""}</p>
  <button onclick="battleSetupBack()">上一步</button> <button onclick="battleSetupNext()" ${!(d.step===2&&d.enemySkipped)&&rosterError(side)?'disabled title="請先完成基本編成"':""}>下一步 →</button> <button onclick="cancelBattleSetup()">取消設定</button></div>`;
}
function showRosterSide(side){
  const teamId=rosterTeam(side),t=TEAMS[teamId],ids=battleRoster?.[side];
  if(ids===null)return `<section><h3>${side==="my"?"我方":"敵方"} · ${esc(t.name)}</h3><p>未設定出戰名單，可使用上方完整小隊查詢。</p></section>`;
  return `<section><h3>${side==="my"?"我方":"敵方"} · ${esc(t.name)}</h3><div class="battle-roster-cards">${ids.map((id,index)=>{
    const o=t.operatives.find(x=>x.id===id);
    const occurrence=ids.slice(0,index).filter(x=>x===id).length;
    const selected=battleRoster?.weapons?.[side]?.[`${id}#${occurrence}`]??battleRoster?.weapons?.[side]?.[String(index)];
    const shown=o&&Array.isArray(selected)?{...o,weapons:(o.weapons||[]).filter((_,i)=>selected.includes(i))}:o;
    return o?`<details class="battle-operative-fold"><summary>${o.image?`<img src="${esc(o.image)}" alt="" loading="lazy">`:""}<span class="battle-operative-title"><b>${esc(o.name)}</b><small>${esc(o.stats||"")}</small></span><span class="battle-fold-hint">展開數據卡</span></summary><div class="battle-operative-body">${opCard(shown)}</div></details>`:`<p>找不到特工資料：${esc(id)}</p>`;
  }).join("")}</div></section>`;
}

function renderMatchHub(){
  const m=ensureMatchTracker();
  const root=document.querySelector("#content");
  if(battleDraft){root.innerHTML=renderBattleSetup();return}
  // Match roster remains tied to its original teams; team selectors are locked while active.
  const tabs=`<div class="match-hub-tabs"><button class="match-hub-tab ${S.matchTab==="roster"?"on":""}" onclick="setMatchTab('roster')">本場特工</button><button class="match-hub-tab ${S.matchTab==="log"?"on":""}" onclick="setMatchTab('log')">戰鬥紀錄</button><button class="match-hub-tab ${S.matchTab==="equipment"?"on":""}" onclick="setMatchTab('equipment')">雙方裝備</button><button class="match-hub-tab ${S.matchTab==="public"?"on":""}" onclick="setMatchTab('public')">公開資訊</button></div>`;
  let body="";
  if(S.matchTab==="roster"){
    body=battleRoster?`<div class="battle-roster-actions"><button onclick="beginBattleSetup()">重新選擇出戰特工</button></div><div class="battle-roster-grid">${showRosterSide("my")}${showRosterSide("enemy")}</div>`:`<div class="battle-setup"><h2>建立本場出戰名單</h2><p>從建立對戰開始選擇雙方小隊，再挑選本場使用的特工。敵方可以略過。</p><button onclick="beginBattleSetup()">開始設定對戰 →</button></div>`;
  }else if(S.matchTab==="equipment"){
    body=`<div class="match-equipment-grid">${matchEquipmentSide("my")}${matchEquipmentSide("enemy")}</div>`;
  }else if(S.matchTab==="public"){
    body=`<div class="match-public"><div class="battle-chapter-public-grid">${liveChapterTacticsPanel("my")}${liveChapterTacticsPanel("enemy")}</div><div class="tracker-toolbar"><div class="tracker-tp"><b>TP ${m.tp}</b><button onclick="nextTurningPoint()" ${m.tp>=4?"disabled":""}>下一轉折點 →</button></div><button class="tracker-reset" onclick="startNewMatch()">開始新對戰</button></div><div class="tracker-sides">${trackerSidePanel("my")}${trackerSidePanel("enemy")}</div></div>`;
  }else{
    const logs=m.log.map(e=>`<div class="battle-log-row"><span class="battle-log-tp">TP${e.tp}</span><div class="battle-log-text">${esc(e.text)}</div><div class="battle-log-meta"><small>${esc(e.at||"")}</small><button class="battle-log-remove" onclick="removeMatchLog('${e.id}')" aria-label="移除這筆紀錄" title="移除紀錄">移除</button></div></div>`).join("");
    body=`<div class="battle-log-summary"><span>我方 ${m.sides.my.vp} VP · ${m.sides.my.cp} CP</span><span>敵方 ${m.sides.enemy.vp} VP · ${m.sides.enemy.cp} CP</span><span>共 ${m.log.length} 筆</span></div><div class="manual-log"><input id="manualMatchLog" maxlength="120" placeholder="手動記錄事件…" onkeydown="if(event.key==='Enter')addManualMatchLog()"><button onclick="addManualMatchLog()">＋ 新增紀錄</button></div><div class="battle-log-list">${logs||'<div class="tracker-empty battle-log-empty">尚無戰鬥紀錄。你可以手動記事，或調整 VP、CP、先手與戰略計謀讓系統自動記錄。</div>'}</div>`;
  }
  root.innerHTML=`<div class="match-hub"><div class="match-hub-head"><div><div class="flow-eyebrow">MATCH</div><h2>本局對戰</h2><p>戰鬥紀錄、雙方所選裝備與對戰公開資訊集中在這裡，桌邊不必再往上找。</p></div><div class="match-hub-status"><b>TP ${m.tp} · ${trackerSideName(m.initiative)}先手</b><span>我 ${m.sides.my.vp}VP / ${m.sides.my.cp}CP · 敵 ${m.sides.enemy.vp}VP / ${m.sides.enemy.cp}CP</span></div></div>${battleRoster?"":`<div class="battle-start-cta"><button onclick="beginBattleSetup()">開始新對戰・選擇出戰特工</button></div>`}${tabs}${body}</div>`;
}

function render(){
  const isFlow=S.view==="flow";
  const isMatch=S.view==="match";
  document.querySelector(".sticky").classList.toggle("flow-hidden",isFlow||isMatch);
  document.querySelector(".matchup").classList.toggle("flow-hidden",isMatch);
  document.querySelector("#tabs").classList.toggle("flow-hidden",isFlow||isMatch);
  const myReferenceTeam=battleRoster?.myTeam||S.myTeam;
  const enemyReferenceTeam=battleRoster?.enemyTeam||S.enemyTeam;
  document.querySelector("#referenceTeamSelect").value=S.team;
  document.querySelector("#myTeamName").textContent=TEAMS[myReferenceTeam]?.name||myReferenceTeam;
  document.querySelector("#enemyTeamName").textContent=TEAMS[enemyReferenceTeam]?.name||enemyReferenceTeam;
  document.querySelectorAll("#sideSwitch button").forEach(b=>{
    const target=b.dataset.side==="my"?myReferenceTeam:enemyReferenceTeam;
    b.classList.toggle("on",S.team===target);
    b.setAttribute("aria-pressed",String(S.team===target));
  });
  document.querySelector("#navTeamName").textContent=team().name;
  if(isFlow){ renderFlow(); return; }
  if(isMatch){ renderMatchHub(); return; }
  const groups=NAV_GROUPS[S.view==="team"?"team":"all"];
  const tabs=Object.keys(groups);
  if(!tabs.includes(S.tab)){S.tab="全部";S.subtab="全部";}
  const subs=groups[S.tab]||[];
  if(S.subtab!=="全部"&&!subs.includes(S.subtab))S.subtab="全部";
  document.querySelector("#tabs").innerHTML=
    `<div class="main-tabs">${tabs.map(t=>`<button class="tab ${S.tab===t?"on":""}" onclick="tab('${t}')">${t}</button>`).join("")}</div>`+
    (subs.length?`<div class="subtabs">${["全部",...subs].map(t=>`<button class="subtab ${S.subtab===t?"on":""}" onclick="subtab('${t}')">${t}</button>`).join("")}</div>`:"");
  let a=items();
  if(S.view==="team")a=a.filter(x=>["小隊資訊","陣營規則","戰略計謀","交戰計謀","Tac Ops","通用裝備","陣營裝備","特工"].includes(x.kind));
  if(S.view==="fav")a=a.filter(x=>S.fav.has(S.team+":"+x.id));
  if(S.tab!=="全部"){
    const kinds=groups[S.tab]||[];
    const active=S.subtab!=="全部"?[S.subtab]:kinds;
    if(active.length)a=a.filter(x=>active.includes(x.kind));
  }
  if(S.q){
    a=a.map((x,index)=>({...x,_rank:searchRank(x,S.q),_order:index})).filter(x=>x._rank>=0).sort((a,b)=>b._rank-a._rank||a._order-b._order);
  }
  const rendered=a.map(x=>{
    const title=itemTitle(x),source=itemSource(x);
    const attrs=` data-result-id="${esc(x.id)}" data-result-title="${esc(title)}" data-result-source="${esc(source)}"`;
    let html=x.html.replace(/<div class="([^"]*\bcard\b[^"]*)"/,(_,classes)=>`<div class="${classes}"${attrs}`);
    if(S.q) html=html.replace(/(<h3[^>]*>[\s\S]*?<\/h3>)/i,`$1<div class="search-result-source">${esc(source)}</div>`);
    return html;
  }).join("");
  document.querySelector("#content").innerHTML=a.length
    ? `<div class="count"><span class="team-accent">${esc(team().name)}</span> · ${a.length} 筆結果${S.q?' · 已依相關度排序':''}</div><div class="grid">${rendered}</div>`
    : `<div class="empty">找不到符合的規則</div>`;
  renderRecentViewed();
}

function tab(t){S.tab=t;S.subtab="全部";S.open.clear();render()}
function subtab(t){S.subtab=t;S.open.clear();render()}
function openRule(instance){
  // Every explanation uses one shared selection state. A weapon profile is
  // the only permitted parent; at most one nested rule may be expanded.
  const expanded=[...document.querySelectorAll("#content details.battle-operative-fold")]
    .map((node,index)=>node.open?index:-1).filter(index=>index>=0);
  const key=S.team+":"+instance;
  const wasOpen=S.open.has(key);
  const isProfile=instance.startsWith("weapon-profile:");
  const parent=(!isProfile&&instance.startsWith("wp:"))?[...S.open].find(x=>x.startsWith(S.team+":weapon-profile:")):null;
  S.open.clear();
  if(isProfile){
    if(!wasOpen)S.open.add(key);
  }else{
    if(parent)S.open.add(parent);
    if(!wasOpen)S.open.add(key);
  }
  render();
  const cards=document.querySelectorAll("#content details.battle-operative-fold");
  expanded.forEach(index=>{if(cards[index])cards[index].open=true;});
}
function fav(id){const k=S.team+":"+id;S.fav.has(k)?S.fav.delete(k):S.fav.add(k);localStorage.setItem("ktFav",JSON.stringify([...S.fav]));render()}

function setActiveSide(side,{resetOpen=true}={}){
  S.side=side==="enemy"?"enemy":"my";
  S.team=(battleRoster?.[S.side+"Team"])||(S.side==="enemy"?S.enemyTeam:S.myTeam);
  localStorage.setItem("ktSide",S.side);
  localStorage.setItem("ktTeam",S.team);
  if(resetOpen){S.open.clear();S.flowOpen.clear();}
  render();
}

function bindUI(){
  document.querySelector("#q").addEventListener("input",e=>{S.q=e.target.value;render()});
  document.querySelector("#content").addEventListener("click",e=>{
    const card=e.target.closest(".card[data-result-id]");
    if(card) rememberViewed(card.dataset.resultId,card.dataset.resultTitle,card.dataset.resultSource);
  });
  document.querySelector("#referenceTeamSelect").addEventListener("change",e=>{
    S.team=e.target.value;
    localStorage.setItem("ktTeam",S.team);
    S.open.clear();
    S.flowOpen.clear();
    render();
  });
  document.querySelectorAll("#sideSwitch button").forEach(b=>b.addEventListener("click",()=>setActiveSide(b.dataset.side)));
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("on"));
    b.classList.add("on");
    S.view=b.dataset.view;
    S.tab="全部";
    S.subtab="全部";
    render();
    if(S.view==="match") document.querySelector("#content")?.scrollIntoView({block:"start"});
  });
}

function setupPWA(){
  let deferredPrompt=null;
  const installBtn=document.querySelector("#installBtn");
  const installNote=document.querySelector("#installNote");

  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();
    deferredPrompt=e;
    installBtn.style.display="block";
  });

  installBtn.addEventListener("click",async()=>{
    if(deferredPrompt){
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt=null;
      installBtn.style.display="none";
    }else{
      installNote.textContent="iPhone / iPad：Safari 分享 → 加入主畫面。";
      installNote.classList.add("show");
    }
  });

  if("serviceWorker" in navigator){
    window.addEventListener("load",async()=>{
      try{
        const reg=await navigator.serviceWorker.register("./service-worker.js");
        await reg.update();
        let refreshing=false;
        navigator.serviceWorker.addEventListener("controllerchange",()=>{
          if(refreshing)return;
          refreshing=true;
          location.reload();
        });
      }catch(err){console.error(err)}
    });
  }
}

(()=>{
  try{
    loadData();
    bindUI();
    setupPWA();
    render();
  }catch(err){
    console.error(err);
    document.querySelector("#content").innerHTML='<div class="empty">規則資料載入失敗，請重新整理頁面。</div>';
  }
})();