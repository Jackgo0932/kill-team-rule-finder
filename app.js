let KEYWORDS=[], QUICK=[], TEAMS={};
let KW={};
let TERM_INDEX={};

const S={
  team:localStorage.getItem("ktTeam")||"pm",
  tab:"全部",
  view:"all",
  q:"",
  open:new Set(),
  fav:new Set(JSON.parse(localStorage.getItem("ktFav")||"[]"))
};

const allTabs=["全部","核心","武器規則","小隊資訊","陣營規則","戰略計謀","交戰計謀","裝備","特工"];
const teamTabs=["全部","小隊資訊","陣營規則","戰略計謀","交戰計謀","裝備","特工"];
const visibleTabs=()=>S.view==="team"?teamTabs:allTabs;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const match=(o,q)=>!q||JSON.stringify(o).toLowerCase().includes(q.toLowerCase().trim());
const team=()=>TEAMS[S.team];

function loadData(){
  QUICK = window.KT_CORE_RULES || [];
  KEYWORDS = window.KT_WEAPON_RULES || [];
  TEAMS = {
    pm: window.KT_PLAGUE_MARINES,
    aod: window.KT_ANGELS_OF_DEATH,
    wk: window.KT_WRECKA_KREW,
    mw: window.KT_MURDERWING,
    leg: window.KT_LEGIONARY
  };
  if (!TEAMS.pm || !TEAMS.aod || !TEAMS.wk || !TEAMS.mw || !TEAMS.leg) {
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
  t.rules.forEach(x=>a.push({kind:"陣營規則",id:"r:"+x[0],s:x,html:`<div class="card">${star("r:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · 陣營規則</div>${markedProse(x[2],`rule:${x[0]}`)}</div>`}));
  t.ploys.forEach(x=>{
    const kind=x[2]==="交戰計謀"?"交戰計謀":"戰略計謀";
    a.push({kind,id:"p:"+x[0],s:x,html:`<div class="card">${star("p:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · ${esc(x[2])}</div>${markedProse(x[3],`ploy:${x[0]}`)}</div>`});
  });
  if(t.ploys2) t.ploys2.forEach(x=>a.push({kind:"交戰計謀",id:"p2:"+x[0],s:x,html:`<div class="card">${star("p2:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · ${esc(x[2])}</div>${markedProse(x[3],`ploy2:${x[0]}`)}</div>`}));
  t.equipment.forEach(x=>a.push({kind:"裝備",id:"e:"+x[0],s:x,html:`<div class="card">${star("e:"+x[0])}<h3>${esc(x[1])}</h3><div class="meta">${esc(t.name)} · 陣營裝備</div>${markedProse(x[2],`equip:${x[0]}`)}</div>`}));
  t.operatives.forEach(o=>a.push({kind:"特工",id:"op:"+o.id,s:o,html:opCard(o)}));
  return a;
}

function render(){
  const tabs=visibleTabs();
  if(!tabs.includes(S.tab)) S.tab="全部";
  document.querySelector("#tabs").innerHTML=tabs.map(t=>`<button class="tab ${S.tab===t?"on":""}" onclick="tab('${t}')">${t}</button>`).join("");
  document.querySelector("#teamSelect").value=S.team;
  document.querySelector("#navTeamName").textContent=team().name;
  let a=items();
  if(S.view==="team")a=a.filter(x=>["小隊資訊","陣營規則","戰略計謀","交戰計謀","裝備","特工"].includes(x.kind));
  if(S.view==="fav")a=a.filter(x=>S.fav.has(S.team+":"+x.id));
  if(S.tab!=="全部")a=a.filter(x=>x.kind===S.tab);
  a=a.filter(x=>match(x.s,S.q));
  document.querySelector("#content").innerHTML=a.length
    ? `<div class="count"><span class="team-accent">${esc(team().name)}</span> · ${a.length} 筆結果</div><div class="grid">${a.map(x=>x.html).join("")}</div>`
    : `<div class="empty">找不到符合的規則</div>`;
}

function tab(t){S.tab=t;render()}
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
    render();
  });
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("on"));
    b.classList.add("on");
    S.view=b.dataset.view;
    S.tab="全部";
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
