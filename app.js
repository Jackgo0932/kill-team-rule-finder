let KEYWORDS=[], QUICK=[], TEAMS={}, UNIVERSAL_EQUIPMENT=[], TAC_OPS=[], CRIT_OPS=[], KILL_OP=null, APPROVED_OPS={flow:[],maps:[],mapNote:""};
let KW={};
let TERM_INDEX={};

const S={
  team:localStorage.getItem("ktTeam")||"pm",
  tab:"全部",
  view:"all",
  q:"",
  subtab:"全部",
  open:new Set(),
  flowOpen:new Set(),
  fav:new Set(JSON.parse(localStorage.getItem("ktFav")||"[]"))
};

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
    ks: window.KT_KASRKIN
  };
  if (!TEAMS.pm || !TEAMS.aod || !TEAMS.wk || !TEAMS.mw || !TEAMS.leg || !TEAMS.dw || !TEAMS.ci || !TEAMS.cc || !TEAMS.ks) {
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
function chip(rule,instance){
  const id=ruleId(rule),k=KW[id];
  if(!k)return "";
  const key=S.team+":"+instance,o=S.open.has(key);
  return `<button class="chip ${o?"open":""}" onclick="openRule('${instance}')">${esc(ruleLabel(rule))} · ${esc(k.en)}</button>`;
}
function chipExplain(rules,instances){
  for(let i=0;i<rules.length;i++){
    if(S.open.has(S.team+":"+instances[i])){
      const k=KW[ruleId(rules[i])];
      if(k)return `<div class="inline"><b>${esc(ruleLabel(rules[i]))}</b>：${esc(k.text)}</div>`;
    }
  }
  return "";
}

function markedProse(text,scope){
  const src=String(text??"");
  const rx=/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;
  let out="",last=0,n=0,m;
  const refs=[];
  while((m=rx.exec(src))){
    out+=esc(src.slice(last,m.index));
    const id=m[1],label=m[2],k=KW[id];
    if(k){
      const instance=`term:${scope}:${n++}:${id}`;
      const open=S.open.has(S.team+":"+instance);
      out+=`<button class="term-link ${open?"open":""}" onclick="openRule('${instance}')">${esc(label)}</button>`;
      refs.push({id,instance});
    }else{
      out+=esc(label);
    }
    last=rx.lastIndex;
  }
  out+=esc(src.slice(last));
  let explain="";
  for(const ref of refs){
    if(S.open.has(S.team+":"+ref.instance)){
      const k=KW[ref.id];
      explain=`<div class="inline prose-inline"><div class="term-source">武器規則</div><b>${esc(k.name)}</b>：${esc(k.text)}</div>`;
      break;
    }
  }
  return `<div class="body">${out}</div>${explain}`;
}

function opCard(op){
  return `<div class="card">${star("op:"+op.id)}
    <div class="op-title-row">
      <div class="op-title-text">
        <h3>${esc(op.name)}</h3>
        <div class="meta operative-meta">
          <div class="operative-type">${esc(op.role)} · ${esc(team().name)}</div>
          ${op.stats?`<div class="operative-stats">${esc(op.stats)}</div>`:""}
        </div>
      </div>
      <div class="op-title-mini" style="background-image:url('${op.image}')"></div>
    </div>
    ${op.abilities.map((a,ai)=>`<div class="ability"><b>${esc(a[0])}</b>${markedProse(a[1],`ability:${op.id}:${ai}`)}</div>`).join("")}
    ${op.weapons.map((w,wi)=>`<div class="weapon weapon-${w[1]==="近戰"?"melee":"ranged"}">
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
          return `<button class="chip custom-rule ${S.open.has(k)?"open":""}" onclick="openRule('${customInstances[ki]}')">${esc(rule[0])} · ${esc(rule[1])}</button>`;
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
    html:`<div class="card">${star("info:composition")}<h3>小隊組成</h3><div class="meta">${esc(t.name)} · 編成條件</div><div class="body">${esc(t.composition)}</div></div>`
  });
  if(t.archetypes) a.push({
    kind:"小隊資訊",id:"info:archetypes",s:["任務原型",...t.archetypes],
    html:`<div class="card">${star("info:archetypes")}<h3>任務原型</h3><div class="meta">${esc(t.name)} · Archetypes</div><div class="body">可使用：${t.archetypes.map(esc).join("、")}。原型會在特定任務包（例如 Approved Ops）中使用，實際使用方式依該任務流程決定。</div></div>`
  });
  QUICK.forEach(x=>a.push({kind:"核心",id:"q:"+x[0],s:x,html:`<div class="card">${star("q:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">核心規則</div><div class="body">${esc(x[2])}</div></div>`}));
  KEYWORDS.forEach(x=>a.push({kind:"武器規則",id:"k:"+x[0],s:x,html:`<div class="card">${star("k:"+x[0])}<h3>${esc(x[1])} <span class="meta">${esc(x[2])}</span></h3><div class="body">${esc(x[3])}</div></div>`}));
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
  const TAC_ARCHETYPES={"pm":["seek","security"],"aod":["seek","security"],"wk":["security","seek"],"mw":["seek","infiltration"],"leg":["seek","infiltration"],"dw":["seek","security"],"ci":["infiltration","security"],"cc":["recon","security"],"ks":["security","seek"]};
  const allowedTac=S.view==="team"?(TAC_ARCHETYPES[S.team]||[]):["recon","security","seek","infiltration"];
  TAC_OPS.filter(x=>allowedTac.includes(x[0])).forEach(x=>a.push({kind:"Tac Ops",id:"to:"+x[3],s:x,html:`<div class="card">${star("to:"+x[3])}<h3>${esc(x[4])} <span class="meta">${esc(x[5])}</span></h3><div class="meta">${esc(x[1])} · Tac Op</div><div class="body"><b>揭示：</b>${esc(x[6])}<br><br>${x[7]!=="—"?`<b>規則／行動：</b>${esc(x[7])}<br><br>`:""}<b>得分：</b>${esc(x[8])}${x[9]?`<div class="rule-supplement"><b>規則補充</b><br>${esc(x[9])}</div>`:""}</div></div>`}));
  UNIVERSAL_EQUIPMENT.forEach(x=>a.push({kind:"通用裝備",id:"ue:"+x[0],s:x,html:`<div class="card">${star("ue:"+x[0])}<h3>${esc((x[3]?x[3]+" ":"")+x[1])}</h3><div class="meta">${esc(x[2])} · 通用裝備</div><div class="body">${esc(x[4]).replace(/\n/g,"<br>")}</div></div>`}));
  t.rules.forEach(x=>a.push({kind:"陣營規則",id:"r:"+x[0],s:x,html:`<div class="card">${star("r:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · 陣營規則</div>${markedProse(x[2],`rule:${x[0]}`)}</div>`}));
  t.ploys.forEach(x=>{
    const kind=x[2]==="交戰計謀"?"交戰計謀":"戰略計謀";
    a.push({kind,id:"p:"+x[0],s:x,html:`<div class="card">${star("p:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · ${esc(x[2])}</div>${markedProse(x[3],`ploy:${x[0]}`)}</div>`});
  });
  if(t.ploys2) t.ploys2.forEach(x=>a.push({kind:"交戰計謀",id:"p2:"+x[0],s:x,html:`<div class="card">${star("p2:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · ${esc(x[2])}</div>${markedProse(x[3],`ploy2:${x[0]}`)}</div>`}));
  t.equipment.forEach(x=>a.push({kind:"陣營裝備",id:"e:"+x[0],s:x,html:`<div class="card">${star("e:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · 陣營裝備</div>${markedProse(x[2],`equip:${x[0]}`)}</div>`}));
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
      explain=`<div class="inline flow-inline flow-step-explain"><span class="term-source">核心規則</span><b>${esc(r[1])}</b>：${esc(r[2])}</div>`;
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

function render(){
  const isFlow=S.view==="flow";
  document.querySelector(".sticky").classList.toggle("flow-hidden",isFlow);
  document.querySelector("#tabs").classList.toggle("flow-hidden",isFlow);
  document.querySelector("#teamSelect").value=S.team;
  document.querySelector("#navTeamName").textContent=team().name;
  if(isFlow){ renderFlow(); return; }
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
  a=a.filter(x=>match(x.s,S.q));
  document.querySelector("#content").innerHTML=a.length
    ? `<div class="count"><span class="team-accent">${esc(team().name)}</span> · ${a.length} 筆結果</div><div class="grid">${a.map(x=>x.html).join("")}</div>`
    : `<div class="empty">找不到符合的規則</div>`;
}

function tab(t){S.tab=t;S.subtab="全部";S.open.clear();render()}
function subtab(t){S.subtab=t;S.open.clear();render()}
function openRule(instance){
  const k=S.team+":"+instance;
  if(S.open.has(k)) S.open.clear();
  else { S.open.clear(); S.open.add(k); }
  render();
}
function fav(id){const k=S.team+":"+id;S.fav.has(k)?S.fav.delete(k):S.fav.add(k);localStorage.setItem("ktFav",JSON.stringify([...S.fav]));render()}

function bindUI(){
  document.querySelector("#q").addEventListener("input",e=>{S.q=e.target.value;render()});
  document.querySelector("#teamSelect").addEventListener("change",e=>{
    S.team=e.target.value;
    localStorage.setItem("ktTeam",S.team);
    S.tab="全部";
    S.subtab="全部";
    S.open.clear();
    S.flowOpen.clear();
    render();
  });
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("on"));
    b.classList.add("on");
    S.view=b.dataset.view;
    S.tab="全部";
    S.subtab="全部";
    render();
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
