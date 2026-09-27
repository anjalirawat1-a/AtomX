const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const state = {
  activeScenario: 'normal',
  feed: 'demo',
  paused: false,
  activeView: 'overview',
  activeSeries: 'tilt',
  selectedNode: 'NODE-02',
  tick: 0,
  packetLog: [],
  alerts: [],
  histories: { tilt: [], disp: [], vib: [], crack: [] },
  nodes: {
    'NODE-01': { zone: 'Zone A', tilt: .31, disp: 1.1, vib: .05, crack: .4, rssi: -74, temp: 31.2, humidity: 63 },
    'NODE-02': { zone: 'Zone B', tilt: .42, disp: 1.8, vib: .07, crack: .9, rssi: -79, temp: 31.6, humidity: 65 },
    'NODE-03': { zone: 'Zone C', tilt: .27, disp: .9, vib: .04, crack: .3, rssi: -82, temp: 30.8, humidity: 66 },
    'NODE-04': { zone: 'Zone A', tilt: .35, disp: 1.3, vib: .06, crack: .5, rssi: -77, temp: 31.1, humidity: 64 },
  }
};

const scenarios = {
  normal: {
    risk:18, level:'normal', title:'System operating normally', label:'Normal', pill:'LOW', reason:'All monitored parameters are inside the expected operating range.',
    banner:'All demo nodes are within the configured monitoring bands.', action:'Continue routine monitoring.', base:{tilt:.42,disp:1.8,vib:.07,crack:.9}, prediction:[18,20,22,24]
  },
  progressive: {
    risk:56, level:'warning', title:'Progressive deformation detected', label:'Elevated', pill:'ELEVATED', reason:'Tilt and displacement are rising together across consecutive samples.',
    banner:'Zone B has crossed the elevated monitoring threshold. Field inspection is recommended.', action:'Increase monitoring frequency in Zone B.', base:{tilt:1.72,disp:8.6,vib:.15,crack:3.4}, prediction:[56,63,69,76]
  },
  vibration: {
    risk:68, level:'warning', title:'Vibration anomaly in Zone B', label:'High', pill:'HIGH', reason:'A vibration anomaly is correlated with elevated displacement in Zone B.',
    banner:'Inspect machinery activity and restrict unnecessary access around NODE-02.', action:'Verify local machinery activity and inspect Zone B.', base:{tilt:1.35,disp:7.1,vib:.81,crack:3.1}, prediction:[68,71,74,79]
  },
  critical: {
    risk:91, level:'critical', title:'Critical early-warning condition', label:'Critical', pill:'CRITICAL', reason:'Rapid tilt, crack growth and displacement are simultaneously exceeding configured safety bands.',
    banner:'Immediate field verification is required. Isolate the affected monitoring zone.', action:'Trigger warning protocol and isolate Zone B.', base:{tilt:4.85,disp:23.4,vib:1.26,crack:9.7}, prediction:[91,94,97,99]
  }
};

function jitter(v, ratio = .06, floor = .02){ return Math.max(0, v + (Math.random() - .5) * Math.max(floor, v * ratio)); }
function fmtTime(d = new Date()){ return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'}); }
function levelClass(level){ return level === 'critical' ? 'critical' : level === 'warning' ? 'warning' : 'ok'; }

function clock(){
  const t = fmtTime();
  $('#heroClock').textContent = t;
  $('#consoleClock').textContent = t;
}
setInterval(clock,1000); clock();

function toast(title, text=''){
  const el = document.createElement('div'); el.className='toast';
  el.innerHTML = `<b>${title}</b><span>${text}</span>`;
  $('#toastStack').appendChild(el);
  setTimeout(()=>el.remove(),3200);
}

function openConsole(){
  $('#console').classList.add('open'); $('#console').setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeConsole(){
  $('#console').classList.remove('open'); $('#console').setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}
$('#launchConsole').onclick=openConsole; $('#launchConsole2').onclick=openConsole;
$('#runDemo').onclick=()=>{ applyScenario('progressive'); openConsole(); toast('Demo started','Progressive deformation scenario loaded.'); };
$('#closeConsole').onclick=closeConsole;

function setView(view){
  state.activeView=view;
  $$('#consoleNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $$('.console-view').forEach(v=>v.classList.toggle('active',v.dataset.viewPanel===view));
  $('#activeViewName').textContent = view.charAt(0).toUpperCase()+view.slice(1);
}
$('#consoleNav').addEventListener('click',e=>{const b=e.target.closest('button[data-view]'); if(b)setView(b.dataset.view)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-view-jump]'); if(b)setView(b.dataset.viewJump)});

function scenarioStatus(nodeId){
  return nodeId === 'NODE-02' ? scenarios[state.activeScenario].level : 'normal';
}

function updateScenarioButtons(){
  $$('[data-scenario]').forEach(b=>b.classList.toggle('active',b.dataset.scenario===state.activeScenario));
}

function applyScenario(name, silent=false){
  if(state.feed==='api'){ toast('Scenario injector disabled','Switch back to Demo feed first.'); return; }
  state.activeScenario=name; updateScenarioButtons();
  const s=scenarios[name];
  Object.assign(state.nodes['NODE-02'],s.base);
  updateRiskUI(); updateNodeUI(); updateMetrics(); updateBanner(); updateAlertPanels(); updateMapStates();
  if(name!=='normal') addAlert(s.level, s.title, s.reason, 'NODE-02', true);
  if(!silent) toast(name==='critical'?'Critical scenario loaded':'Scenario changed', s.title);
  animateWorkflow();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-scenario]');if(b)applyScenario(b.dataset.scenario)});

function animateWorkflow(){
  const steps=$$('#workflowSteps .workflow-step'); let i=0; steps.forEach(s=>s.classList.remove('active'));
  const timer=setInterval(()=>{steps.forEach(s=>s.classList.remove('active'));steps[i].classList.add('active');i++;if(i>=steps.length)clearInterval(timer)},260);
}

function updateRiskUI(){
  const s=scenarios[state.activeScenario];
  $('#heroRisk').textContent=s.risk; $('#heroTilt').textContent=`${state.nodes['NODE-02'].tilt.toFixed(2)}°`;
  $('#riskScore').textContent=s.risk; $('#riskLabel').textContent=s.label; $('#riskPill').textContent=s.pill; $('#riskReason').textContent=s.reason;
  $('#trend30').textContent = `+${s.prediction[2]-s.prediction[0]}`;
  $('#riskPill').className=`status-pill ${levelClass(s.level)}`;
  const color=s.level==='critical'?'#c6534a':s.level==='warning'?'#c18a2b':'#5d9b70';
  $('#riskRing').style.background=`conic-gradient(${color} 0 ${s.risk}%,#26333a ${s.risk}% 100%)`;
}
function updateBanner(){
  const s=scenarios[state.activeScenario]; const el=$('#consoleBanner');
  el.className=`console-banner ${s.level==='normal'?'':s.level}`;
  $('.banner-icon',el).textContent=s.level==='critical'?'!':s.level==='warning'?'▲':'✓';
  $('#bannerTitle').textContent=s.title; $('#bannerText').textContent=s.banner;
}
$('#dismissBanner').onclick=()=>{$('#consoleBanner').style.display='none'};

function updateMapStates(){
  $$('.plan-node').forEach(n=>{n.classList.remove('warning','critical');if(n.dataset.node==='NODE-02'&&state.activeScenario!=='normal')n.classList.add(scenarios[state.activeScenario].level)});
  $$('.map-node').forEach(n=>{n.classList.remove('warning','critical');if(n.dataset.node==='NODE-02'&&state.activeScenario!=='normal')n.classList.add(scenarios[state.activeScenario].level)});
  $('#zoneBLabel').className=`zone-label z-b ${state.activeScenario==='normal'?'':scenarios[state.activeScenario].level}`;
}

function updateNodeUI(){
  const rows = Object.entries(state.nodes).map(([id,n])=>{
    const st=scenarioStatus(id); return `<div class="health-row"><span class="health-name"><i class="${st==='normal'?'':st}"></i>${id}</span><span>${n.zone}</span><b>${n.rssi} dBm</b></div>`
  }).join('');
  $('#nodeHealthList').innerHTML=rows;
  $('#nodesGrid').innerHTML=Object.entries(state.nodes).map(([id,n])=>{
    const st=scenarioStatus(id); return `<article class="node-card"><div class="node-card-top"><div><span class="card-kicker">${n.zone.toUpperCase()}</span><h3>${id}</h3><p>ESP32 + LoRa field node</p></div><span class="node-radio"><i style="background:${st==='critical'?'#c6534a':st==='warning'?'#c18a2b':'#5d9b70'}"></i>${st==='normal'?'online':st}</span></div><div class="node-card-metrics"><div><span>Tilt</span><b>${n.tilt.toFixed(2)}°</b></div><div><span>Disp.</span><b>${n.disp.toFixed(1)} mm</b></div><div><span>RSSI</span><b>${n.rssi} dBm</b></div></div><button data-node="${id}">Open node details →</button></article>`
  }).join('');
}

function updateMetrics(){
  const n=state.nodes['NODE-02'];
  const data=[['Surface tilt',n.tilt,'°',5],['Displacement',n.disp,'mm',25],['Vibration',n.vib,'g',1.4],['Crack growth',n.crack,'mm',10]];
  $('#metricRow').innerHTML=data.map(([label,v,unit,max])=>`<article class="metric-tile"><span>${label}</span><strong>${v<2?v.toFixed(2):v.toFixed(1)} <small>${unit}</small></strong><small>NODE-02 · live</small><div class="metric-bar"><i style="width:${Math.min(100,v/max*100)}%"></i></div></article>`).join('');
  if(state.selectedNode) updateDrawer(state.selectedNode);
}

function addAlert(level,title,text,node='NODE-02',dedupe=false){
  if(dedupe && state.alerts[0]?.title===title && Date.now()-state.alerts[0].ts<3000) return;
  state.alerts.unshift({id:cryptoRandom(),level,title,text,node,ts:Date.now(),acked:false}); state.alerts=state.alerts.slice(0,30);
  updateAlertPanels();
}
function cryptoRandom(){ return Math.random().toString(36).slice(2,9); }
function updateAlertPanels(){
  const active=state.alerts.filter(a=>!a.acked); $('#alertCount').textContent=active.length;
  const latest=state.alerts[0];
  $('#latestAlert').innerHTML=latest?`<div class="latest-alert"><div class="alert-top"><b>${latest.title}</b><time>${fmtTime(new Date(latest.ts))}</time></div><p>${latest.text}</p><button data-ack="${latest.id}">${latest.acked?'Acknowledged':'Acknowledge'}</button></div>`:`<div class="latest-alert empty">No events recorded in this session.</div>`;
  $('#alertSummary').innerHTML=`<div class="summary-tile"><span>Active alerts</span><b>${active.length}</b></div><div class="summary-tile"><span>Critical</span><b>${active.filter(a=>a.level==='critical').length}</b></div><div class="summary-tile"><span>Acknowledged</span><b>${state.alerts.filter(a=>a.acked).length}</b></div>`;
  $('#alertLog').innerHTML=state.alerts.length?state.alerts.map(a=>`<div class="alert-log-item ${a.acked?'acked':''}"><i class="alert-dot ${a.level}"></i><div><b>${a.title}</b><p>${a.text} · ${a.node}</p></div><time>${fmtTime(new Date(a.ts))}</time><button data-ack="${a.id}">${a.acked?'Acknowledged':'Acknowledge'}</button></div>`).join(''):`<div class="latest-alert empty">No alerts yet. Load an elevated demo scenario to test the event log.</div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ack]');if(!b)return;const a=state.alerts.find(x=>x.id===b.dataset.ack);if(a){a.acked=true;updateAlertPanels();toast('Alert acknowledged',a.title)}});
$('#ackAll').onclick=()=>{state.alerts.forEach(a=>a.acked=true);updateAlertPanels();toast('All visible alerts acknowledged')};

function createPacket(){
  const s=scenarios[state.activeScenario], n=state.nodes['NODE-02'];
  if(state.feed==='demo'){
    n.tilt=jitter(s.base.tilt,.055,.03); n.disp=jitter(s.base.disp,.05,.08); n.vib=jitter(s.base.vib,.1,.02); n.crack=jitter(s.base.crack,.04,.03);
  }
  const packet={time:Date.now(),node:'NODE-02',tilt:n.tilt,disp:n.disp,vib:n.vib,crack:n.crack,rssi:n.rssi,state:s.level};
  state.packetLog.unshift(packet); state.packetLog=state.packetLog.slice(0,24);
  state.histories.tilt.push(packet.tilt);state.histories.disp.push(packet.disp);state.histories.vib.push(packet.vib);state.histories.crack.push(packet.crack);
  Object.values(state.histories).forEach(a=>{if(a.length>36)a.shift()});
  $('#lastPacket').textContent='just now';
  updateMetrics(); updateCharts(); updatePacketTable(); updateRiskUI();
}

function svgLine(values,w=760,h=230){
  if(!values.length)return'';const min=Math.min(...values),max=Math.max(...values);const range=Math.max(.0001,max-min);return values.map((v,i)=>`${(i/(values.length-1||1))*w},${h-18-((v-min)/range)*(h-38)}`).join(' ')
}
function chartAreaPath(values,w=760,h=230){const pts=svgLine(values,w,h).split(' ');if(!pts[0])return'';return `M ${pts[0]} L ${pts.join(' L ')} L ${pts[pts.length-1].split(',')[0]},${h} L 0,${h} Z`}
function updateCharts(){
  const arr=state.histories[state.activeSeries]; $('#trendLine').setAttribute('points',svgLine(arr)); $('#chartArea').setAttribute('d',chartAreaPath(arr));
  const n=state.nodes['NODE-02']; const map={tilt:`${n.tilt.toFixed(2)}°`,disp:`${n.disp.toFixed(1)} mm`,vib:`${n.vib.toFixed(2)} g`}; $('#chartCurrent').textContent=map[state.activeSeries];
  const max=Math.max(...state.histories.tilt,1); $('#telemetryChart').innerHTML=state.histories.tilt.map(v=>`<i style="height:${Math.max(5,v/max*100)}%" title="${v.toFixed(2)}°"></i>`).join('');
}
$$('.chart-tabs button').forEach(b=>b.onclick=()=>{$$('.chart-tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.activeSeries=b.dataset.series;updateCharts()});
function updatePacketTable(){
  $('#packetTable').innerHTML=state.packetLog.map(p=>`<tr><td>${fmtTime(new Date(p.time))}</td><td>${p.node}</td><td>${p.tilt.toFixed(2)}°</td><td>${p.disp.toFixed(1)} mm</td><td>${p.vib.toFixed(2)} g</td><td>${p.crack.toFixed(1)} mm</td><td>${p.rssi}</td><td><span class="state-chip ${p.state}">${p.state}</span></td></tr>`).join('');
}

function landingChart(){
  const vals=[12,15,14,18,16,21,20,24,23,26,29,27,31,33,35,32,36,38,37,41,39,43,46,44];const w=560,h=170;const min=Math.min(...vals),max=Math.max(...vals);const pts=vals.map((v,i)=>`${i/(vals.length-1)*w},${h-15-(v-min)/(max-min)*(h-35)}`).join(' ');$('#landingMiniChart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="M ${pts.replaceAll(' ',' L ')}"/></svg>`
}
landingChart();

function openDrawer(id){ state.selectedNode=id; updateDrawer(id); $('#nodeDrawer').classList.add('open'); $('#nodeDrawer').setAttribute('aria-hidden','false'); $('#scrim').classList.add('open'); }
function closeDrawer(){ $('#nodeDrawer').classList.remove('open');$('#nodeDrawer').setAttribute('aria-hidden','true');$('#scrim').classList.remove('open'); }
function updateDrawer(id){const n=state.nodes[id];if(!n)return;$('#drawerNodeTitle').textContent=id;$('#drawerRssi').textContent=`${n.rssi} dBm`;$('#drawerZone').textContent=n.zone;$('#drawerPacket').textContent='just now';$('#drawerMetrics').innerHTML=`<div class="drawer-metric"><span>Tilt</span><b>${n.tilt.toFixed(2)}°</b></div><div class="drawer-metric"><span>Displacement</span><b>${n.disp.toFixed(1)} mm</b></div><div class="drawer-metric"><span>Vibration</span><b>${n.vib.toFixed(2)} g</b></div><div class="drawer-metric"><span>Crack</span><b>${n.crack.toFixed(1)} mm</b></div>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-node]');if(b)openDrawer(b.dataset.node)});$('#closeDrawer').onclick=closeDrawer;$('#scrim').onclick=closeDrawer;$('#drawerTelemetry').onclick=()=>{closeDrawer();openConsole();setView('telemetry')};

$('#pauseFeed').onclick=()=>{state.paused=!state.paused;$('#pauseFeed use').setAttribute('href',state.paused?'#i-play':'#i-pause');toast(state.paused?'Feed paused':'Feed resumed')};

$$('.feed-switch button').forEach(b=>b.onclick=async()=>{
  state.feed=b.dataset.feed; $$('.feed-switch button').forEach(x=>x.classList.toggle('active',x===b));
  $('#gatewayDetail').textContent=state.feed==='demo'?'demo feed · packet every 1s':'hardware API · polling every 2s';
  $('#sampleRate').textContent=state.feed==='demo'?'1.0 s sample period':'2.0 s API polling';
  toast(state.feed==='demo'?'Demo feed active':'Hardware API selected',state.feed==='api'?'Set your backend URL under System.':'Scenario injector is available.');
});

async function pollApi(){
  if(state.feed!=='api'||state.paused)return; const base=$('#apiUrl').value.replace(/\/$/,'');
  try{
    const [nodes,risk,alerts]=await Promise.all([fetch(`${base}/api/nodes`).then(r=>r.json()),fetch(`${base}/api/risk`).then(r=>r.json()),fetch(`${base}/api/alerts`).then(r=>r.json())]);
    if(Array.isArray(nodes)&&nodes.length){nodes.forEach(x=>{if(state.nodes[x.node_id])Object.assign(state.nodes[x.node_id],{tilt:x.tilt_deg,disp:x.displacement_mm,vib:x.vibration_g,rssi:x.rssi_dbm??state.nodes[x.node_id].rssi,temp:x.temperature_c??state.nodes[x.node_id].temp,humidity:x.humidity_pct??state.nodes[x.node_id].humidity})}); const n=state.nodes['NODE-02'];state.histories.tilt.push(n.tilt);state.histories.disp.push(n.disp);state.histories.vib.push(n.vib);Object.values(state.histories).forEach(a=>{if(a.length>36)a.shift()});updateNodeUI();updateMetrics();updateCharts()}
    $('#gatewayState').textContent='Connected';
  }catch(e){$('#gatewayState').textContent='API unavailable'}
}
setInterval(pollApi,2000);

$('#testApi').onclick=async()=>{const base=$('#apiUrl').value.replace(/\/$/,'');$('#connectionResult').textContent='Testing…';try{const r=await fetch(`${base}/api/health`);if(!r.ok)throw new Error();const j=await r.json();$('#connectionResult').textContent=`Connected: ${j.service||'AtomX API'} · ${j.status||'ok'}`;toast('API connection successful',base)}catch(e){$('#connectionResult').textContent='Could not reach the backend. Check the URL, server and CORS settings.';toast('API connection failed','Backend did not respond.')}};

$('#exportSnapshot').onclick=()=>{
  const payload={generated_at:new Date().toISOString(),data_source:state.feed,scenario:state.feed==='demo'?state.activeScenario:null,risk:scenarios[state.activeScenario],nodes:state.nodes,recent_alerts:state.alerts.slice(0,10)};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`atomx-snapshot-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();URL.revokeObjectURL(a.href);toast('Snapshot exported','JSON file created from the current console state.');
};

function init(){
  updateScenarioButtons();updateRiskUI();updateNodeUI();updateMetrics();updateBanner();updateAlertPanels();updateMapStates();
  for(let i=0;i<36;i++)createPacket();
  setInterval(()=>{if(!state.paused&&state.feed==='demo')createPacket();},1000);
}
init();
