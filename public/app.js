const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SIT=['Operando','Em rota','Manutenção','Parado','Em devolução','Devolvido'],SC={Operando:'#34d399','Em rota':'#60a5fa','Manutenção':'#fbbf24',Parado:'#f87171','Em devolução':'#fb923c',Devolvido:'#6b7280'};
let sb,me=null,tab='map',selPosto=null,selChip=null,vf={q:'',s:'',p:'',t:'',f:'',dev:false},modalKind=null,backTo=null;
const TZ='America/Bahia';

/* ---------- util ---------- */
function toast(m){const d=document.createElement('div');d.textContent=m;$('toast').appendChild(d);setTimeout(()=>d.remove(),3200)}
async function api(path,method='GET',body){
  const {data}=await sb.auth.getSession();
  const r=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(data.session?.access_token||'')},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Erro '+r.status);return j}
function modal(html,kind='form',wide=false){$('mbox').innerHTML=html;$('mbox').classList.toggle('wide',wide);$('mod').hidden=false;modalKind=kind}
let fichaTabBack='resumo';
function closeMod(noBack){fichaTabBack=typeof fichaTab==='string'?fichaTab:'resumo';$('mod').hidden=true;$('mbox').innerHTML='';modalKind=null;fichaId=null;
  if(!noBack&&backTo){const b=backTo;backTo=null;if(byId.get(b))return ficha(b,fichaTabBack)}backTo=null;if(pendingFlush)schedule()}
$('mod').addEventListener('mousedown',e=>{if(e.target.id==='mod')closeMod()});
addEventListener('keydown',e=>{if(e.key==='Escape')closeMod()});
const first=n=>(n||'').trim().split(/\s+/)[0]||'';
const cap=n=>n.charAt(0).toUpperCase()+n.slice(1);
function isFem(p){
  if(p.gender==='F')return true;if(p.gender==='M')return false;
  const n=first(p.display_name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const masc=['luca','joshua','elias','jonas','mica','noa','nikita','jose','zeca','tomas','lucas','matias','jonatas','ananias','tobias'];
  const fem=['beatriz','isabel','raquel','ingrid','karen','carmen','ruth','miriam','rachel','nicole','michele','aline','eliane','simone','denise','lais','thais','iris','alice','joyce','luciene','elen','ellen','rebeca','jessica','vivian','viviane','tais','helen','marilene','solange','lorena'];
  if(masc.includes(n))return false;if(fem.includes(n))return true;
  return n.endsWith('a')||/(ane|ene|ine|ice|ise)$/.test(n)}
function greet(){const h=+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hour12:false,timeZone:TZ}).format(new Date())%24;return h>=5&&h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'}

/* ---------- login + orb ---------- */
let voices=[];function loadV(){voices=speechSynthesis.getVoices()}
if('speechSynthesis' in window){loadV();speechSynthesis.onvoiceschanged=loadV}
function speak(txt){
  if(!('speechSynthesis' in window))return;
  const u=new SpeechSynthesisUtterance(txt);u.lang='pt-BR';
  const pt=voices.filter(v=>/pt[-_]BR/i.test(v.lang));
  u.voice=pt.find(v=>/female|feminina|maria|luciana|francisca|vitoria|google portugu/i.test(v.name))||pt[0]||null;
  u.pitch=1.15;u.rate=.95;speechSynthesis.cancel();speechSynthesis.speak(u)}
const showErr=m=>{$('lerr').textContent=m;$('lb').disabled=true};
(async()=>{
  let b;
  try{const r=await fetch('/api/bootstrap');b=await r.json()}
  catch{return showErr('A API do site não respondeu. Confira no README o passo "Se a página não abre" (pasta raiz da Vercel).')}
  if(!b.configured)return showErr('Faltam variáveis de ambiente na Vercel: '+(b.missing||[]).join(', ')+'. Adicione-as em Settings → Environment Variables e faça Redeploy.');
  if(!b.db)return showErr('O banco ainda não está pronto: rode o arquivo supabase/schema.sql no SQL Editor do Supabase. Detalhe: '+(b.detail||''));
  try{const cfg=await (await fetch('/api/config')).json();
    if(!cfg.url||!cfg.anon)throw 0;
    sb=supabase.createClient(cfg.url,cfg.anon,{auth:{persistSession:false,autoRefreshToken:true}});
  }catch{return showErr('Não consegui carregar a configuração do Supabase.')}
  if(b.needed){$('lf').hidden=true;$('sf').hidden=false;$('scw').hidden=!b.needCode}
})();
$('sf').onsubmit=async e=>{
  e.preventDefault();$('serr').textContent='';
  const n=$('sn').value.trim(),p=$('sp').value;
  if(p.length<8)return $('serr').textContent='A senha precisa ter pelo menos 8 caracteres.';
  if(p!==$('sp2').value)return $('serr').textContent='As senhas não coincidem.';
  $('sb').disabled=true;
  try{
    const r=await fetch('/api/bootstrap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p,display_name:n,code:$('sc').value.trim()})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Erro '+r.status);
    $('sf').hidden=true;$('lf').hidden=false;$('u').value='master';$('p').value='';$('lerr').textContent='Master criado! Entre com o usuário "master" e a senha que você definiu.';$('p').focus();
  }catch(err){$('serr').textContent=err.message}
  $('sb').disabled=false};
$('lf').onsubmit=async e=>{
  e.preventDefault();if(!sb)return;
  if('speechSynthesis' in window){const p=new SpeechSynthesisUtterance(' ');p.volume=0;speechSynthesis.speak(p)} // libera áudio no gesto do usuário
  const u=$('u').value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,''),p=$('p').value;
  $('lb').disabled=true;$('lerr').textContent='';
  const {data,error}=await sb.auth.signInWithPassword({email:u+'@maxforte.app',password:p});
  if(error){$('lerr').textContent='Usuário ou senha inválidos.';$('lb').disabled=false;return}
  const {data:pr}=await sb.from('profiles').select('*').eq('id',data.user.id).maybeSingle();
  if(!pr){$('lerr').textContent='Perfil não encontrado. Fale com o master.';await sb.auth.signOut();$('lb').disabled=false;return}
  me=pr;$('lf').style.height=$('lf').offsetHeight+'px';void $('lf').offsetHeight;$('lf').classList.add('orb');
  const done=loadAll().catch(err=>{console.error(err)});
  setTimeout(()=>speak(`${greet()}, ${first(me.display_name)}`),2000);
  setTimeout(async()=>{await done;$('login').hidden=true;$('app').hidden=false;$('whoName').textContent=me.display_name;buildNav();go('map');startLive()},5000);
};
$('out').onclick=async()=>{await sb.auth.signOut();location.reload()};

/* ---------- formatação ---------- */
const brl=n=>n==null||n===''||isNaN(n)?'—':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=n=>n==null||n===''||isNaN(n)?'—':Number(n).toLocaleString('pt-BR');
const kmLim=n=>n==null?'—':n>=9999?'Ilimitado':num(n);
const compact=n=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(n);
const dt=s=>{if(!s)return'—';const [y,m,d]=String(s).slice(0,10).split('-');return `${d}/${m}/${y}`};
const dtm=s=>s?new Date(s).toLocaleString('pt-BR',{timeZone:TZ,dateStyle:'short',timeStyle:'short'}):'—';
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const mesLbl=s=>{const [y,m]=String(s).slice(0,7).split('-');return MESES[+m-1]+'/'+y.slice(2)};
const todayISO=()=>new Date().toLocaleDateString('sv-SE',{timeZone:TZ});
const daysTo=s=>s?Math.round((Date.parse(String(s).slice(0,10))-Date.parse(todayISO()))/864e5):null;
const nz=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const pnum=s=>{s=String(s).trim().replace(/\s/g,'').replace(/^R\$/,'');if(!s)return null;if(s.includes(',')||/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return isNaN(n)?NaN:n}; // aceita 1.234,50 · 31.500 · 1234.5
const normPlaca=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,''),okPlaca=s=>/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(s);
const sumBy=(arr,p,f='valor')=>arr.reduce((a,r)=>r.placa===p?a+(+r[f]||0):a,0);

/* ---------- dados ---------- */
let postos=[],veic=[],kms=[],desp=[],mult=[],revs=[],lavs=[],byId=new Map(),byPlaca=new Map();const missing=new Set();
const TBL={postos:'numero',veiculos:'placa',km_mensal:'mes',despesas:'data',multas:'data_hora',revisoes:'data',lavagens:'data'};
async function fetchAll(t,ord){ // páginas de 1000 linhas (limite do Supabase)
  let out=[],from=0;
  for(;;){const {data,error}=await sb.from(t).select('*').order(ord).order('id').range(from,from+999);
    if(error)throw error;out=out.concat(data||[]);if(!data||data.length<1000)break;from+=1000}
  return out}
async function loadTables(list){
  const names=(list&&list.length?list:Object.keys(TBL)).filter(n=>TBL[n]);
  const rs=await Promise.all(names.map(n=>fetchAll(n,TBL[n]).then(d=>[n,d],e=>[n,null,e])));
  for(const [n,d,e] of rs){
    if(!d){if(n==='postos'||n==='veiculos')throw e;missing.add(n);continue}
    missing.delete(n);
    if(n==='postos')postos=d;else if(n==='veiculos')veic=d;else if(n==='km_mensal')kms=d;else if(n==='despesas')desp=d;else if(n==='multas')mult=d;else if(n==='revisoes')revs=d;else lavs=d}
  byId=new Map(veic.map(v=>[v.id,v]));byPlaca=new Map(veic.map(v=>[v.placa,v]));banner()}
const loadAll=()=>loadTables(null);
const sig=()=>JSON.stringify([postos,veic,kms,desp,mult,revs,lavs]);
function banner(){const b=$('banner');if(b){b.hidden=!missing.size;b.innerHTML=missing.size?'⚠ Falta rodar o arquivo <b>supabase/update_2.sql</b> no Supabase (SQL Editor) para liberar os dados completos da frota.':''}}
const ativo=v=>v.situacao!=='Devolvido',ativos=()=>veic.filter(ativo);
const counts=()=>{const c={};veic.forEach(v=>{if(v.posto_id)c[v.posto_id]=(c[v.posto_id]||0)+1});return c};
const pName=id=>{const p=postos.find(x=>x.id===id);return p?`#${p.numero}${p.nome?' · '+p.nome:''}`:'—'};
const errText=e=>e.code==='23505'?'Já existe um registro com esse valor (placa/numeração duplicada).':['42703','PGRST204','42P01','PGRST205'].includes(e.code)?'Falta rodar o supabase/update_2.sql no Supabase.':e.message;
let lastWrite=0;
async function refresh(){lastWrite=Date.now();await loadAll();liveRender()}

/* ---------- TEMPO REAL ---------- */
let ch=null,dirty=new Set(),flushT=0,pendingFlush=false,busy=false,rtOk=false,tick=0,pollT=0;
const WATCH=['postos','veiculos','profiles','km_mensal','despesas','multas','revisoes','lavagens'];
function setLive(st){const e=$('live');if(!e)return;e.className='live '+st;e.lastChild.textContent=st==='on'?'Ao vivo':st==='warn'?'Sincronizando…':'Offline'}
function startLive(){
  stopLive();if(!sb)return;
  ch=sb.channel('maxforte-live');
  WATCH.forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},()=>{dirty.add(t);schedule()}));
  ch.subscribe(st=>{rtOk=st==='SUBSCRIBED';setLive(rtOk?'on':st==='CLOSED'?'off':'warn')});
  // rede de segurança: confere por conta própria (30 s com tempo real ativo, 10 s sem) e ao voltar para a aba
  pollT=setInterval(()=>{tick++;if(!document.hidden&&(!rtOk||tick%3===0)){dirty.add('~');schedule()}},10000);
  document.addEventListener('visibilitychange',onVis)}
function stopLive(){clearInterval(pollT);clearTimeout(flushT);document.removeEventListener('visibilitychange',onVis);if(ch){sb.removeChannel(ch);ch=null}}
function onVis(){if(!document.hidden){dirty.add('~');schedule()}}
function schedule(){clearTimeout(flushT);flushT=setTimeout(flush,350)}
async function flush(){
  if(modalKind==='form'||busy){pendingFlush=true;return}   // não atrapalha quem está digitando/arrastando
  pendingFlush=false;const d=[...dirty];dirty.clear();if(!d.length)return;
  const poll=d.includes('~'),before=poll?sig():null;
  try{await loadTables(poll?null:d.filter(x=>TBL[x]))}catch(e){console.error(e);return setLive('warn')}
  if(poll&&sig()===before&&!d.includes('profiles'))return;   // nada mudou
  liveRender(d);
  if(tab==='users'&&(poll||d.includes('profiles')))vUsers();
  if(Date.now()-lastWrite>5000)toast('🔄 Dados atualizados em tempo real')}
function liveRender(){
  if(tab==='map')updateMap();
  else if(tab!=='perfil'&&tab!=='users'){
    const ae=document.activeElement,id=ae&&ae.id,ss=ae&&ae.selectionStart,se=ae&&ae.selectionEnd,sy=window.scrollY;
    VIEWS[tab]();window.scrollTo(0,sy);
    const el=id&&$(id);if(el&&['INPUT','TEXTAREA'].includes(el.tagName)){el.focus();try{el.setSelectionRange(ss,se)}catch{}}}
  if(modalKind==='ficha')renderFicha()}

/* ---------- navegação ---------- */
const VIEWS={map:()=>vMap(),painel:()=>vPainel(),postos:()=>vPostos(),veic:()=>vVeic(),alocar:()=>vAlocar(),oper:()=>vOper(),users:()=>vUsers(),perfil:()=>vPerfil()};
function buildNav(){
  const t=[['map','Mapa'],['painel','Painel'],['postos','Postos'],['veic','Veículos'],['alocar','Alocar'],['oper','Operação'],...(me.role==='master'?[['users','Usuários']]:[]),['perfil','Meu perfil']];
  $('nav').innerHTML=t.map(([k,l])=>`<button data-k="${k}">${l}</button>`).join('');
  $('nav').onclick=e=>{const k=e.target.dataset.k;if(k)go(k)};
  if(!$('live'))$('whoName').insertAdjacentHTML('beforebegin','<span class="live warn" id="live" title="Conexão em tempo real com o banco de dados"><i></i><b>Sincronizando…</b></span>');
  if(!$('banner'))$('app').querySelector('header').insertAdjacentHTML('afterend','<div id="banner" class="banner" hidden></div>');
  banner()}
function go(k,keep){
  if(tab==='map'&&k!=='map')Holo.dispose();
  tab=k;selChip=null;if(!keep)window.scrollTo(0,0);
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  VIEWS[k]()}

/* ---------- mapa ---------- */
function kpis(l){return l.map(([n,t])=>`<div class="kpi"><b>${n}</b><span>${t}</span></div>`).join('')}
function kpiMap(){const at=ativos(),al=at.filter(v=>v.posto_id).length;
  return kpis([[postos.length,'Postos'],[at.length,'Veículos ativos'],[al,'Alocados'],[at.length-al,'Sem posto'],[at.filter(v=>v.situacao==='Manutenção').length,'Em manutenção']])}
function vMap(){
  const f=isFem(me),c=counts();
  $('view').innerHTML=`<h1 class="title"><b>${esc(first(me.display_name))}</b>, seja bem-vind${f?'a':'o'} ao painel administrativo de frota da Max Forte</h1>
  <div class="holowrap"><div id="holo"></div><div class="hint">Arraste para girar · role para zoom · toque num posto</div><aside class="pp" id="pp"></aside></div>
  <div class="kpis" id="kpis">${kpiMap()}</div>
  <p class="sub" id="noPostos" style="text-align:center" ${postos.length?'hidden':''}>Nenhum posto cadastrado ainda. Vá em <b>Postos</b> para adicionar o primeiro.</p>`;
  Holo.init($('holo'),p=>{selPosto=p.id;Holo.setPostos(postos,counts(),selPosto);openPP(p)});
  Holo.setPostos(postos,c,selPosto=null)}
function updateMap(){   // atualiza o holograma sem recriá-lo (mantém a rotação e o painel aberto)
  if(!$('holo'))return vMap();
  $('kpis').innerHTML=kpiMap();$('noPostos').hidden=postos.length>0;
  const sel=selPosto&&postos.find(p=>p.id===selPosto);if(selPosto&&!sel)closePP();
  Holo.setPostos(postos,counts(),sel?sel.id:null);if(sel)openPP(sel,true)}
function openPP(p,live){
  const vs=veic.filter(v=>v.posto_id===p.id),pp=$('pp');if(!live)pp.classList.remove('open');
  pp.innerHTML=`<button class="x" aria-label="Fechar" onclick="closePP()">×</button><h3>Posto #${esc(p.numero)}</h3><p class="sub" style="margin:2px 0 14px">${esc(p.nome||'')}${p.nome?' · ':''}${esc(p.endereco)}</p>
  <div class="big">${vs.length}</div><div class="sub">veículo${vs.length===1?'':'s'} neste posto</div>
  <div class="plates">${vs.map((v,i)=>`<span class="plate click" style="${live?'animation:none;opacity:1':`animation-delay:${i*50+250}ms`}" title="${esc(v.modelo||'')} · ${v.situacao}" onclick="ficha('${v.id}')">${esc(v.placa)}</span>`).join('')||'<span class="sub">Nenhum veículo alocado.</span>'}</div>
  <div class="acts" style="justify-content:flex-start"><button class="btn sm" onclick="go('alocar')">Alocar veículos</button><button class="btn sm" onclick="formPosto('${p.id}')">Editar posto</button></div>`;
  if(!live)requestAnimationFrame(()=>requestAnimationFrame(()=>pp.classList.add('open')))}
function closePP(){$('pp').classList.remove('open');selPosto=null;Holo.setPostos(postos,counts(),null)}

/* ---------- CSV ---------- */
function csv(nome,cab,linhas){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const t='\ufeff'+[cab,...linhas].map(l=>l.map(q).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'})),el=document.createElement('a');
  el.href=url;el.download=nome;document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function expPostos(){const c=counts();csv('postos-maxforte.csv',['Numero','Nome','Endereco','Latitude','Longitude','Veiculos'],postos.map(p=>[p.numero,p.nome||'',p.endereco,p.lat,p.lng,c[p.id]||0]))}

/* ---------- postos ---------- */
const IGN=new Set(['DEVOLVIDO','EM DEVOLUCAO']);
function planPend(){   // nomes de posto da planilha que ainda não têm posto cadastrado
  const reg=new Set(postos.flatMap(p=>[nz(p.nome),nz(p.numero)]).filter(Boolean)),m=new Map();
  ativos().forEach(v=>{const k=nz(v.posto_planilha);if(!k||IGN.has(k)||reg.has(k))return;const o=m.get(k)||{nome:v.posto_planilha,n:0};o.n++;m.set(k,o)});
  return [...m.values()].sort((a,b)=>b.n-a.n||a.nome.localeCompare(b.nome))}
function matchAlloc(){   // veículos sem posto cujo posto na planilha bate com o nome/nº de um posto cadastrado
  const by=new Map();postos.forEach(p=>[nz(p.nome),nz(p.numero)].filter(Boolean).forEach(k=>by.set(k,p)));
  const res=new Map();
  ativos().filter(v=>!v.posto_id&&v.posto_planilha).forEach(v=>{const p=by.get(nz(v.posto_planilha));if(p){if(!res.has(p.id))res.set(p.id,{p,ids:[]});res.get(p.id).ids.push(v.id)}});
  return [...res.values()]}
async function autoAlloc(only){
  let m=matchAlloc();if(only)m=m.filter(x=>x.p.id===only);
  const tot=m.reduce((a,x)=>a+x.ids.length,0);
  if(!tot)return toast('Nenhum veículo para alocar pela planilha.');
  if(!confirm(`Alocar ${tot} veículo(s) nos postos indicados pela planilha?\n\n`+m.map(x=>`#${x.p.numero}${x.p.nome?' · '+x.p.nome:''}: ${x.ids.length}`).join('\n')))return;
  lastWrite=Date.now();
  for(const x of m){const {error}=await sb.from('veiculos').update({posto_id:x.p.id,updated_at:new Date().toISOString()}).in('id',x.ids);if(error)return toast('Erro: '+errText(error))}
  toast(`${tot} veículo(s) alocado(s)`);await refresh()}
let planList=[];
function vPostos(){
  const c=counts();planList=planPend();const ma=matchAlloc().reduce((a,x)=>a+x.ids.length,0);
  $('view').innerHTML=`<div class="bar"><h2 style="margin:0;flex:1">Postos <span class="tag">${postos.length}</span></h2>${ma?`<button class="btn auto" onclick="autoAlloc()">⚡ Alocar pela planilha (${ma})</button>`:''}<button class="btn auto" onclick="expPostos()">⬇ CSV</button><button class="btn pri auto" onclick="formPosto()">+ Novo posto</button></div>
  ${planList.length?`<details class="plan"><summary>📋 Postos citados na planilha ainda não cadastrados <span class="tag">${planList.length}</span></summary><p class="sub" style="margin:8px 0">Toque num nome para cadastrar com o endereço. Se o nome do posto cadastrado for igual ao da planilha, os veículos podem ser alocados automaticamente.</p>
  <div class="chips2">${planList.map((x,i)=>`<button class="chip2" onclick="formPosto('',${i})">${esc(x.nome)} <b>${x.n}</b></button>`).join('')}</div></details>`:''}
  <div class="tw"><table class="tbl"><tr><th>Nº</th><th>Nome</th><th>Endereço</th><th>Veículos</th><th></th></tr>
  ${postos.map(p=>`<tr><td><b>#${esc(p.numero)}</b></td><td>${esc(p.nome||'—')}</td><td class="wrap">${esc(p.endereco)}<br><small class="sub">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</small></td><td>${c[p.id]||0}</td>
  <td><button class="btn sm" onclick="formPosto('${p.id}')">Editar</button> <button class="btn sm danger" onclick="delPosto('${p.id}')">Excluir</button></td></tr>`).join('')||'<tr><td colspan="5" class="sub">Nenhum posto.</td></tr>'}</table></div>`}
let cands=[],geoAddr='',manual=false;
function formPosto(id,pre){
  const base=typeof pre==='number'&&planList[pre]?{nome:planList[pre].nome}:{};
  const p=id?postos.find(x=>x.id===id):{numero:'',nome:base.nome||'',endereco:'',lat:'',lng:''};cands=[];geoAddr=id?p.endereco:'';manual=false;
  modal(`<h2>${id?'Editar':'Novo'} posto</h2>
  <div class="row"><label>Numeração<input id="pn" value="${esc(p.numero)}"></label><label>Nome (opcional)<input id="pnm" value="${esc(p.nome||'')}"></label></div>
  <label>Endereço completo<textarea id="pe" rows="2" placeholder="Ex.: Av. Tancredo Neves, 1000, Caminho das Árvores, Salvador - BA">${esc(p.endereco)}</textarea></label>
  <button class="btn" id="geoBtn" onclick="geo()">📍 Localizar no mapa</button><div id="geoRes" style="margin-top:10px"></div>
  <div class="row" style="margin-top:12px"><label>Latitude<input id="pla" value="${p.lat}" inputmode="decimal"></label><label>Longitude<input id="plo" value="${p.lng}" inputmode="decimal"></label></div>
  <p class="sub" id="gs" style="margin:0">${id?'Coordenadas atuais. Edite o endereço e clique em Localizar para recalcular.':'Digite o endereço e clique em Localizar.'}</p>
  <p class="err" id="me"></p><div class="acts"><button class="btn" onclick="closeMod()">Cancelar</button><button class="btn pri auto" id="sv" onclick="savePosto('${id||''}')">Salvar</button></div>`);
  $('pla').oninput=$('plo').oninput=()=>{manual=true}}
async function geo(){
  const q=$('pe').value.trim();if(q.length<4){$('me').textContent='Digite o endereço.';return}
  $('geoBtn').disabled=true;$('geoBtn').textContent='Procurando…';$('me').textContent='';
  try{const r=await fetch('/api/geocode?q='+encodeURIComponent(q)),j=await r.json();cands=j.results||[];
    if(!cands.length){$('geoRes').innerHTML='<p class="warn">Não encontrei esse endereço. Tente incluir cidade e bairro (ou CEP), ou informe latitude/longitude manualmente.</p>'}
    else{$('geoRes').innerHTML=cands.map((c,i)=>`<label class="cand"><input type="radio" name="cd" value="${i}" ${i?'':'checked'} onchange="pick(${i})">${esc(c.label)}<br><small class="${c.precision==='aproximado'?'warn':'ok'}">Precisão: ${c.precision}</small></label>`).join('');pick(0)}
  }catch{$('me').textContent='Falha na busca. Verifique a conexão.'}
  $('geoBtn').disabled=false;$('geoBtn').textContent='📍 Localizar no mapa'}
function pick(i){const c=cands[i];manual=false;geoAddr=$('pe').value.trim();$('pla').value=c.lat.toFixed(6);$('plo').value=c.lng.toFixed(6);
  $('gs').innerHTML=c.precision==='aproximado'?'<span class="warn">Localização aproximada (só rua/bairro/cidade). Confira ou ajuste lat/lng.</span>':'<span class="ok">Localização encontrada.</span>'}
async function savePosto(id){
  const numero=$('pn').value.trim(),endereco=$('pe').value.trim();let lat=parseFloat($('pla').value.replace(',','.')),lng=parseFloat($('plo').value.replace(',','.'));
  if(!numero||!endereco){$('me').textContent='Numeração e endereço são obrigatórios.';return}
  if(isNaN(lat)||isNaN(lng)||(!manual&&endereco!==geoAddr)){await geo();if(cands.length)$('me').textContent='Confira o local sugerido abaixo (veja a precisão) e clique em Salvar novamente.';return}
  if(lat<-18.4||lat>-8.4||lng<-46.7||lng>-37.3){$('me').textContent='Coordenadas fora da Bahia. Confira o endereço.';return}
  $('sv').disabled=true;lastWrite=Date.now();
  const row={numero,nome:$('pnm').value.trim()||null,endereco,lat,lng};
  const {error}=id?await sb.from('postos').update(row).eq('id',id):await sb.from('postos').insert(row);
  if(error){$('me').textContent=error.code==='23505'?'Já existe um posto com essa numeração.':error.message;$('sv').disabled=false;return}
  closeMod();toast('Posto salvo');await refresh();
  const np=postos.find(x=>x.numero===numero);if(np&&matchAlloc().some(m=>m.p.id===np.id))autoAlloc(np.id)}
async function delPosto(id){
  const n=veic.filter(v=>v.posto_id===id).length;
  if(!confirm(`Excluir este posto?${n?` Os ${n} veículos nele ficarão sem posto.`:''}`))return;
  lastWrite=Date.now();const {error}=await sb.from('postos').delete().eq('id',id);if(error)return toast(error.message);toast('Posto excluído');await refresh()}

/* ---------- campos de cada tipo de registro (formulários genéricos) ---------- */
const EMPS=['MAX FORTE','MAX CONFIÁVEL','MAX SERVIÇOS'],TIPOV=['CARRO','MOTO'];
const ENT={
 veiculos:{nome:'veículo',f:[
  {g:'Identificação',k:'placa',l:'Placa',t:'placa',req:1},{k:'tipo',l:'Tipo',t:'sel',o:TIPOV},{k:'modelo',l:'Marca/modelo'},{k:'empresa',l:'Empresa',t:'sel',o:EMPS},
  {k:'numero_frota',l:'Nº na frota'},{k:'situacao',l:'Situação',t:'sel',o:SIT,req:1},{k:'posto_id',l:'Posto (mapa)',t:'posto'},{k:'posto_planilha',l:'Posto (nome na planilha)'},{k:'supervisor',l:'Supervisor'},
  {g:'Contrato',k:'fornecedor',l:'Fornecedor/locadora'},{k:'situacao_contrato',l:'Situação do contrato',t:'sel',o:['ATIVO','OUTROS']},{k:'valor_locacao',l:'Valor da locação (R$)',t:'money'},{k:'valor_contratado',l:'Valor contratado (R$)',t:'money'},
  {k:'prazo_meses',l:'Prazo (meses)',t:'num'},{k:'data_recebimento',l:'Data de recebimento',t:'date'},{k:'devolucao_prevista',l:'Devolução prevista',t:'date'},{k:'km_entrega',l:'KM de entrega',t:'num'},
  {g:'Quilometragem e combustível',k:'km_atual',l:'KM atual',t:'num'},{k:'km_contratado',l:'KM contratado/mês (9999 = ilimitado)',t:'num'},{k:'km_locadora',l:'KM da locadora',t:'num'},
  {k:'custo_por',l:'Combustível por conta de',t:'sel',o:['CLIENTE','MAX FORTE','CONFIÁVEL']},{k:'status_combustivel',l:'Regra de combustível',w:'full'},
  {g:'Equipamentos',k:'rastreador',l:'Rastreador'},{k:'tag',l:'TAG',t:'bool'},{k:'seguro',l:'Seguro',t:'bool'},{k:'data_plotagem',l:'Data da plotagem',t:'date'},
  {g:'Observações',k:'obs',l:'Observações',t:'area',w:'full'}]},
 despesas:{nome:'despesa',f:[{k:'data',l:'Data',t:'date',req:1},{k:'empresa',l:'Empresa',t:'sel',o:EMPS},{k:'tipo',l:'Tipo (nota, recibo...)'},{k:'placa',l:'Placa',t:'placa'},
  {k:'prestador',l:'Integrante / prestador'},{k:'cliente',l:'Cliente'},{k:'servico',l:'Serviço realizado',w:'full'},{k:'valor',l:'Valor (R$)',t:'money',req:1},{k:'obs',l:'Observações',t:'area',w:'full'}]},
 multas:{nome:'multa',f:[{k:'data_hora',l:'Data e hora',t:'dtm',req:1},{k:'tipo',l:'Tipo',t:'sel',o:TIPOV},{k:'ait',l:'Nº do AIT'},{k:'placa',l:'Placa',t:'placa',req:1},
  {k:'locadora',l:'Locadora'},{k:'condutor',l:'Condutor'},{k:'local',l:'Local',w:'full'},{k:'municipio',l:'Município - UF'},{k:'valor',l:'Valor (R$)',t:'money',req:1},{k:'infracao',l:'Infração',t:'area',w:'full'}]},
 revisoes:{nome:'revisão',f:[{k:'data',l:'Data',t:'date',req:1},{k:'placa',l:'Placa',t:'placa',req:1},{k:'tipo',l:'Tipo',t:'sel',o:TIPOV},{k:'servico',l:'Serviço (revisão, troca...)'},
  {k:'ultima_rev',l:'Última revisão (km)',t:'num'},{k:'prox_rev',l:'Próxima revisão (km)',t:'num'},{k:'descricao',l:'Descrição',w:'full'},
  {k:'item1',l:'Item 1'},{k:'valor1',l:'Valor 1',t:'money'},{k:'item2',l:'Item 2'},{k:'valor2',l:'Valor 2',t:'money'},{k:'item3',l:'Item 3'},{k:'valor3',l:'Valor 3',t:'money'},
  {k:'custo_total',l:'Custo total (vazio = soma dos itens)',t:'money'},{k:'obs',l:'Observações',t:'area',w:'full'}]},
 lavagens:{nome:'lavagem',f:[{k:'data',l:'Data',t:'date',req:1},{k:'placa',l:'Placa',t:'placa',req:1},{k:'posto',l:'Posto'},{k:'vtr',l:'VTR',t:'sel',o:TIPOV},{k:'valor',l:'Valor (R$)',t:'money',req:1}]}};
const SQLT={veiculos:'veiculos',despesas:'despesas',multas:'multas',revisoes:'revisoes',lavagens:'lavagens'};
function fld(f,v){
  const id='f_'+f.k,val=v==null?'':v;let inp;
  if(f.t==='sel')inp=`<select id="${id}"><option value=""></option>${f.o.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  else if(f.t==='posto')inp=`<select id="${id}"><option value="">Sem posto</option>${postos.map(p=>`<option value="${p.id}" ${p.id===val?'selected':''}>#${esc(p.numero)}${p.nome?' · '+esc(p.nome):''}</option>`).join('')}</select>`;
  else if(f.t==='bool')inp=`<select id="${id}"><option value=""></option><option value="1" ${val===true?'selected':''}>Sim</option><option value="0" ${val===false?'selected':''}>Não</option></select>`;
  else if(f.t==='area')inp=`<textarea id="${id}" rows="2">${esc(val)}</textarea>`;
  else if(f.t==='date')inp=`<input id="${id}" type="date" value="${esc(String(val).slice(0,10))}">`;
  else if(f.t==='dtm')inp=`<input id="${id}" type="datetime-local" value="${val?new Date(val).toLocaleString('sv-SE',{timeZone:TZ}).replace(' ','T').slice(0,16):''}">`;
  else inp=`<input id="${id}" value="${esc(val)}" ${f.t==='placa'?'maxlength="8" style="text-transform:uppercase" list="dl_placas"':''} ${f.t==='money'||f.t==='num'?'inputmode="decimal"':''}>`;
  return `<label class="${f.w==='full'?'full':''}">${esc(f.l)}${f.req?' *':''}${inp}</label>`}
function formEnt(table,id,pre){
  const cfg=ENT[table],r=id?(table==='veiculos'?byId.get(id):(OPS[table]?OPS[table].arr().find(x=>x.id===id):null)):(pre||{});
  if(id&&!r)return toast('Registro não encontrado (foi removido por outro administrador).');
  if(modalKind==='ficha')backTo=fichaId;
  let h=`<h2>${id?'Editar':'Novo(a)'} ${cfg.nome}</h2><datalist id="dl_placas">${veic.map(v=>`<option value="${esc(v.placa)}">`).join('')}</datalist><div class="fgrid">`;
  cfg.f.forEach(f=>{if(f.g)h+=`<h4 class="fg">${esc(f.g)}</h4>`;h+=fld(f,r[f.k])});
  modal(h+`</div><p class="err" id="me"></p><div class="acts"><button class="btn" onclick="closeMod()">Cancelar</button><button class="btn pri auto" id="sv" onclick="saveEnt('${table}','${id||''}')">Salvar</button></div>`,'form',true)}
async function saveEnt(table,id){
  const cfg=ENT[table],row={},fail=m=>{$('me').textContent=m};
  for(const f of cfg.f){
    const s=$('f_'+f.k).value.trim();let v;
    if(f.t==='bool')v=s===''?null:s==='1';
    else if(f.t==='num'||f.t==='money'){v=pnum(s);if(Number.isNaN(v))return fail(`Valor inválido em "${f.l}".`);if(v!==null&&f.t==='num')v=Math.round(v)}
    else if(f.t==='placa'){v=s?normPlaca(s):null;if(v&&!okPlaca(v))return fail(`Placa inválida em "${f.l}" (formato ABC1D23 ou ABC1234).`)}
    else if(f.t==='dtm')v=s?new Date(s+':00-03:00').toISOString():null;
    else v=s||null;
    if(f.req&&v===null)return fail(`Preencha "${f.l}".`);
    row[f.k]=v}
  if(table==='lavagens')row.mes=row.data.slice(0,7)+'-01';
  if(table==='revisoes'&&row.custo_total===null&&(row.valor1!=null||row.valor2!=null||row.valor3!=null))row.custo_total=(row.valor1||0)+(row.valor2||0)+(row.valor3||0);
  if(table==='veiculos')row.updated_at=new Date().toISOString();
  $('sv').disabled=true;lastWrite=Date.now();
  const {error}=id?await sb.from(table).update(row).eq('id',id):await sb.from(table).insert(row);
  if(error){fail(errText(error));$('sv').disabled=false;return}
  closeMod();toast('Salvo');await refresh()}
async function delEnt(table,id){
  if(!confirm(`Excluir ${ENT[table].nome}?`))return;
  lastWrite=Date.now();const {error}=await sb.from(table).delete().eq('id',id);if(error)return toast(errText(error));toast('Excluído');await refresh()}

/* ---------- veículos: lista ---------- */
const pl=p=>{if(!p)return'—';const v=byPlaca.get(p);return v?`<a class="pl" onclick="ficha('${v.id}')">${esc(p)}</a>`:`<span class="pl off" title="Placa não cadastrada na frota">${esc(p)}</span>`};
const icon=t=>t==='MOTO'?'🏍️':t==='CARRO'?'🚗':'';
const sitHtml=s=>`<span class="dot" style="background:${SC[s]||'#888'}"></span>${esc(s)}`;
const vFiltrados=()=>{const q=nz(vf.q);
  return veic.filter(v=>(vf.dev||vf.s==='Devolvido'||ativo(v))&&(!q||nz([v.placa,v.modelo,v.supervisor,v.posto_planilha,v.fornecedor].join(' ')).includes(q))&&(!vf.s||v.situacao===vf.s)&&(!vf.t||v.tipo===vf.t)&&(!vf.f||v.fornecedor===vf.f)&&(!vf.p||(vf.p==='none'?!v.posto_id:v.posto_id===vf.p)))};
function expVeic(){const cols=ENT.veiculos.f.filter(f=>f.k!=='posto_id');
  csv('veiculos-maxforte.csv',[...cols.map(f=>f.l),'Posto (mapa)'],vFiltrados().map(v=>[...cols.map(f=>v[f.k]===true?'Sim':v[f.k]===false?'Não':v[f.k]),v.posto_id?pName(v.posto_id):'']))}
function vVeic(){
  const l=vFiltrados(),forn=[...new Set(veic.map(v=>v.fornecedor).filter(Boolean))].sort();
  $('view').innerHTML=`<div class="bar"><h2 style="margin:0;flex:1">Veículos <span class="tag">${l.length}/${veic.length}</span></h2><button class="btn auto" onclick="expVeic()">⬇ CSV</button><button class="btn pri auto" onclick="formVeic()">+ Novo veículo</button></div>
  <div class="bar"><input id="fq" placeholder="Buscar placa, modelo, supervisor, posto…" value="${esc(vf.q)}">
  <select id="fs"><option value="">Todas as situações</option>${SIT.map(s=>`<option ${vf.s===s?'selected':''}>${s}</option>`).join('')}</select>
  <select id="ft"><option value="">Carros e motos</option>${TIPOV.map(t=>`<option value="${t}" ${vf.t===t?'selected':''}>${t==='CARRO'?'Carros':'Motos'}</option>`).join('')}</select>
  <select id="ff"><option value="">Todos os fornecedores</option>${forn.map(f=>`<option ${vf.f===f?'selected':''}>${esc(f)}</option>`).join('')}</select>
  <select id="fp"><option value="">Todos os postos</option><option value="none" ${vf.p==='none'?'selected':''}>Sem posto</option>${postos.map(p=>`<option value="${p.id}" ${vf.p===p.id?'selected':''}>#${esc(p.numero)}</option>`).join('')}</select>
  <label class="chk"><input type="checkbox" id="fd" ${vf.dev?'checked':''}> incluir devolvidos</label></div>
  <div class="tw"><table class="tbl"><tr><th>Placa</th><th>Veículo</th><th>Situação</th><th>Posto</th><th>Supervisor</th><th>KM atual</th><th>Devolução</th><th></th></tr>
  ${l.map(v=>{const dd=daysTo(v.devolucao_prevista);return `<tr><td><a class="pl" onclick="ficha('${v.id}')">${esc(v.placa)}</a></td><td>${icon(v.tipo)} ${esc(v.modelo||'—')}${v.fornecedor?`<br><small class="sub">${esc(v.fornecedor)}</small>`:''}</td><td>${sitHtml(v.situacao)}</td>
  <td class="wrap">${v.posto_id?esc(pName(v.posto_id)):v.posto_planilha?`<span class="sub" title="Posto informado na planilha (ainda não alocado)">${esc(v.posto_planilha)}</span>`:'—'}</td><td>${esc(v.supervisor||'—')}</td><td>${num(v.km_atual)}</td>
  <td>${v.devolucao_prevista?`${dt(v.devolucao_prevista)}${dd!=null&&dd<=60&&ativo(v)?`<br><small class="${dd<0?'bad':'warn'}">${dd<0?'vencido há '+(-dd)+' d':'em '+dd+' d'}</small>`:''}`:'—'}</td>
  <td class="nw"><button class="btn sm" onclick="ficha('${v.id}')">Ficha</button> <button class="btn sm" onclick="formEnt('veiculos','${v.id}')">Editar</button> <button class="btn sm danger" onclick="delVeic('${v.id}')">Excluir</button></td></tr>`}).join('')||'<tr><td colspan="8" class="sub">Nenhum veículo.</td></tr>'}</table></div>`;
  const re=()=>{vf={q:$('fq').value,s:$('fs').value,t:$('ft').value,f:$('ff').value,p:$('fp').value,dev:$('fd').checked};vVeic();const q=$('fq');q.focus();q.setSelectionRange(999,999)};
  $('fq').oninput=re;['fs','ft','ff','fp','fd'].forEach(i=>$(i).onchange=re)}
function formVeic(id){
  if(id)return formEnt('veiculos',id);
  modal(`<h2>Novo veículo</h2><label>Placa(s) — uma por linha ou separadas por espaço<textarea id="vp" rows="3" style="text-transform:uppercase" placeholder="ABC1D23"></textarea></label>
  <div class="row"><label>Situação<select id="vs">${SIT.map(s=>`<option>${s}</option>`).join('')}</select></label>
  <label>Posto<select id="vpo"><option value="">Sem posto</option>${postos.map(p=>`<option value="${p.id}">#${esc(p.numero)}${p.nome?' · '+esc(p.nome):''}</option>`).join('')}</select></label></div>
  <p class="sub" style="margin:0">Depois, abra a ficha do veículo para completar contrato, KM e demais dados.</p>
  <p class="err" id="me"></p><div class="acts"><button class="btn" onclick="closeMod()">Cancelar</button><button class="btn pri auto" id="sv" onclick="saveVeic()">Salvar</button></div>`)}
async function saveVeic(){
  const list=[...new Set($('vp').value.split(/[\s,;]+/).map(normPlaca).filter(Boolean))],bad=list.filter(p=>!okPlaca(p));
  if(!list.length||bad.length){$('me').textContent=bad.length?`Placa inválida: ${bad.join(', ')} (formato ABC1D23 ou ABC1234)`:'Informe a placa.';return}
  $('sv').disabled=true;lastWrite=Date.now();const base={situacao:$('vs').value,posto_id:$('vpo').value||null,updated_at:new Date().toISOString()};
  const {error}=await sb.from('veiculos').insert(list.map(placa=>({...base,placa})));
  if(error){$('me').textContent=errText(error);$('sv').disabled=false;return}
  closeMod();toast('Veículo(s) salvo(s)');await refresh()}
async function delVeic(id){if(!confirm('Excluir este veículo? O histórico mensal de KM dele também será apagado.'))return;lastWrite=Date.now();const {error}=await sb.from('veiculos').delete().eq('id',id);if(error)return toast(errText(error));toast('Excluído');closeMod(true);await refresh()}

/* ---------- ficha do veículo ---------- */
let fichaId=null,fichaTab='resumo';
const lastRev=p=>revs.filter(r=>r.placa===p).sort((a,b)=>(b.data||'').localeCompare(a.data||''))[0];
function kv(l){return `<div class="kvs">${l.map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v==null||v===''?'—':v}</b></div>`).join('')}</div>`}
function vbars(items,fmt){const mx=Math.max(1e-9,...items.map(i=>i.v));
  return items.length?`<div class="vb">${items.map(i=>`<div class="vbi" title="${esc(i.l)}: ${fmt(i.v,0)}"><span class="vbv">${fmt(i.v,1)}</span><i style="height:${Math.max(3,i.v/mx*100)}%"></i><span class="vbl">${esc(i.l)}</span></div>`).join('')}</div>`:'<p class="sub">Sem dados.</p>'}
function hbars(items,fmt=num){const mx=Math.max(1,...items.map(i=>i.v));
  return items.length?`<div class="hb">${items.map(i=>`<div class="hbi"><span class="hbl" title="${esc(i.l)}">${esc(i.l)}</span><div class="hbt"><i style="width:${Math.max(2,i.v/mx*100)}%"></i></div><b>${fmt(i.v)}</b></div>`).join('')}</div>`:'<p class="sub">Sem dados.</p>'}
function ficha(id,tabKey){
  const v=byId.get(id);if(!v)return;
  if(tabKey)fichaTab=tabKey;if(fichaId!==id&&!tabKey)fichaTab='resumo';
  fichaId=id;backTo=null;modal('','ficha',true);renderFicha()}
function renderFicha(){
  const v=byId.get(fichaId);if(!v){closeMod(true);return toast('Este veículo foi removido.')}
  const mine=k=>OPS[k].arr().filter(r=>r.placa===v.placa),kmv=kms.filter(k=>k.veiculo_id===v.id);
  const T=[['resumo','Resumo'],['contrato','Contrato'],['km','Quilometragem',kmv.length],['revisoes','Revisões',mine('revisoes').length],['despesas','Despesas',mine('despesas').length],['multas','Multas',mine('multas').length],['lavagens','Lavagens',mine('lavagens').length]];
  const old=$('mbox').querySelector('.fbody'),sy=old?old.scrollTop:0;
  $('mbox').innerHTML=`<div class="fh"><div><span class="plate big">${esc(v.placa)}</span> <span class="fsub">${icon(v.tipo)} ${esc(v.modelo||'')}</span></div><div class="fsit">${sitHtml(v.situacao)}</div>
   <div class="fa"><button class="btn sm" onclick="formEnt('veiculos','${v.id}')">✎ Editar dados</button><button class="btn sm" onclick="closeMod(true)" aria-label="Fechar">✕</button></div></div>
   <div class="ftabs">${T.map(([k,l,n])=>`<button class="${fichaTab===k?'on':''}" onclick="fichaTab='${k}';renderFicha()">${l}${n?` <span class="cnt">${n}</span>`:''}</button>`).join('')}</div>
   <div class="fbody">${fichaBody(v,mine,kmv)}</div>`;
  const nb=$('mbox').querySelector('.fbody');if(nb)nb.scrollTop=sy}
function fichaBody(v,mine,kmv){
  if(fichaTab==='resumo'){
    const rv=lastRev(v.placa),dd=daysTo(v.devolucao_prevista),falta=rv&&rv.prox_rev&&v.km_atual?rv.prox_rev-v.km_atual:null;
    const al=[];if(falta!=null&&falta<=1500)al.push(`<div class="alert ${falta<=0?'bad':''}">🔧 ${falta<=0?'Revisão vencida':'Revisão próxima'}: faltam ${num(falta)} km para ${num(rv.prox_rev)} km.</div>`);
    if(dd!=null&&dd<=60&&ativo(v))al.push(`<div class="alert ${dd<0?'bad':''}">📅 Devolução prevista ${dt(v.devolucao_prevista)} (${dd<0?'vencida há '+(-dd)+' dias':'em '+dd+' dias'}).</div>`);
    return al.join('')+`<div class="stats">${[[num(v.km_atual),'KM atual'],[kmLim(v.km_contratado),'KM contratado/mês'],[rv&&rv.prox_rev?num(rv.prox_rev):'—','Próxima revisão (km)'],[brl(sumBy(desp,v.placa)),'Despesas'],[brl(sumBy(mult,v.placa)),'Multas'],[brl(sumBy(lavs,v.placa)),'Lavagens']].map(([n,t])=>`<div class="stat"><b>${n}</b><span>${t}</span></div>`).join('')}</div>`+
    kv([['Tipo',icon(v.tipo)+' '+esc(v.tipo||'')],['Marca/modelo',esc(v.modelo)],['Empresa',esc(v.empresa)],['Nº na frota',esc(v.numero_frota)],['Posto (mapa)',v.posto_id?esc(pName(v.posto_id)):'Sem posto'],['Posto na planilha',esc(v.posto_planilha)],['Supervisor',esc(v.supervisor)],['Fornecedor',esc(v.fornecedor)]])+(v.obs?`<p class="obs">📝 ${esc(v.obs)}</p>`:'')}
  if(fichaTab==='contrato'){
    const dd=daysTo(v.devolucao_prevista),marg=v.valor_contratado!=null&&v.valor_locacao!=null?v.valor_contratado-v.valor_locacao:null;
    return kv([['Fornecedor/locadora',esc(v.fornecedor)],['Empresa',esc(v.empresa)],['Situação do contrato',esc(v.situacao_contrato)],['Prazo',v.prazo_meses?v.prazo_meses+' meses':null],
      ['Valor da locação',brl(v.valor_locacao)],['Valor contratado',brl(v.valor_contratado)],['Margem (contratado − locação)',marg==null?null:`<span class="${marg<0?'bad':'ok'}">${brl(marg)}</span>`],['Combustível por conta de',esc(v.custo_por)],
      ['Regra de combustível',esc(v.status_combustivel)],['Recebimento',dt(v.data_recebimento)],['Devolução prevista',v.devolucao_prevista?dt(v.devolucao_prevista)+(dd!=null?` <small class="${dd<0?'bad':''}">(${dd<0?'há '+(-dd)+' d':'em '+dd+' d'})</small>`:''):null],['KM de entrega',num(v.km_entrega)],
      ['KM contratado/mês',kmLim(v.km_contratado)],['KM da locadora',kmLim(v.km_locadora)],['Seguro',v.seguro?'Sim':v.seguro===false?'Não':null],['TAG',v.tag?'Sim':v.tag===false?'Não':null],['Rastreador',esc(v.rastreador)],['Plotagem',dt(v.data_plotagem)]])}
  if(fichaTab==='km'){
    const l=[...kmv].sort((a,b)=>b.mes.localeCompare(a.mes));
    return `<h4 class="fg">KM rodados por mês</h4>`+vbars([...l].reverse().filter(k=>k.km_total!=null).map(k=>({l:mesLbl(k.mes),v:k.km_total})),n=>compact(n))+
    `<div class="tw"><table class="tbl"><tr><th>Mês</th><th>KM 1/4</th><th>KM 2/4</th><th>KM 3/4</th><th>KM 4/4</th><th>KM total</th><th>Combustível (cartão)</th><th>Posto</th><th>Supervisor</th></tr>
    ${l.map(k=>`<tr><td>${mesLbl(k.mes)}</td><td>${num(k.km1)}</td><td>${num(k.km2)}</td><td>${num(k.km3)}</td><td>${num(k.km4)}</td><td><b>${num(k.km_total)}</b></td><td>${brl(k.comb_cartao)}</td><td class="wrap">${esc(k.posto_planilha||'—')}</td><td>${esc(k.supervisor||'—')}</td></tr>`).join('')||'<tr><td colspan="9" class="sub">Sem histórico mensal.</td></tr>'}</table></div>`}
  const t=fichaTab,rows=mine(t).sort((a,b)=>String(OPS[t].dt(b)||'').localeCompare(String(OPS[t].dt(a)||''))),tot=rows.reduce((a,r)=>a+(+OPS[t].val(r)||0),0);
  return `<div class="bar"><span class="sub" style="margin:0;flex:1">${rows.length} registro(s) · total <b>${brl(tot)}</b></span><button class="btn pri auto" onclick="formEnt('${t}','',{placa:'${v.placa}'})">+ Adicionar</button></div>`+opTable(t,rows,true)}

/* ---------- operação: despesas, multas, revisões, lavagens ---------- */
const OPS={
 despesas:{t:'Despesas',arr:()=>desp,dt:r=>r.data,val:r=>r.valor,cols:[['Data',r=>dt(r.data)],['Empresa',r=>esc(r.empresa||'—')],['Tipo',r=>esc(r.tipo||'—')],['Placa',r=>pl(r.placa),'','placa'],['Prestador',r=>esc(r.prestador||'—'),'wrap'],['Cliente',r=>esc(r.cliente||'—')],['Serviço',r=>esc(r.servico||'—')+(r.obs?`<br><small class="sub">${esc(r.obs)}</small>`:''),'wrap'],['Valor',r=>brl(r.valor),'r']],hay:r=>[r.empresa,r.tipo,r.placa,r.prestador,r.cliente,r.servico,r.obs]},
 multas:{t:'Multas',arr:()=>mult,dt:r=>r.data_hora,val:r=>r.valor,cols:[['Data/hora',r=>dtm(r.data_hora)],['Placa',r=>pl(r.placa),'','placa'],['Condutor',r=>esc(r.condutor||'—'),'wrap'],['Local',r=>esc(r.local||'—')+(r.municipio?`<br><small class="sub">${esc(r.municipio)}</small>`:''),'wrap'],['Infração',r=>esc(r.infracao||'—'),'wrap'],['AIT',r=>esc(r.ait||'—')],['Valor',r=>brl(r.valor),'r']],hay:r=>[r.placa,r.condutor,r.local,r.municipio,r.infracao,r.ait,r.locadora]},
 revisoes:{t:'Revisões',arr:()=>revs,dt:r=>r.data,val:r=>r.custo_total,cols:[['Data',r=>dt(r.data)],['Placa',r=>pl(r.placa),'','placa'],['Serviço',r=>esc(r.servico||'—')+(r.descricao?`<br><small class="sub">${esc(r.descricao)}</small>`:''),'wrap'],['Última (km)',r=>num(r.ultima_rev)],['Próxima (km)',r=>num(r.prox_rev)],['Custo',r=>brl(r.custo_total),'r']],hay:r=>[r.placa,r.servico,r.descricao,r.item1,r.item2,r.item3,r.obs]},
 lavagens:{t:'Lavagens',arr:()=>lavs,dt:r=>r.data,val:r=>r.valor,cols:[['Data',r=>dt(r.data)],['Placa',r=>pl(r.placa),'','placa'],['Posto',r=>esc(r.posto||'—'),'wrap'],['VTR',r=>esc(r.vtr||'—')],['Valor',r=>brl(r.valor),'r']],hay:r=>[r.placa,r.posto,r.vtr]}};
function opTable(t,rows,mini,lim){
  const o=OPS[t],cols=mini?o.cols.filter(c=>c[3]!=='placa'):o.cols,show=lim?rows.slice(0,lim):rows;
  return `<div class="tw"><table class="tbl"><tr>${cols.map(c=>`<th class="${c[2]==='r'?'r':''}">${c[0]}</th>`).join('')}<th></th></tr>
  ${show.map(r=>`<tr>${cols.map(c=>`<td class="${c[2]||''}">${c[1](r)}</td>`).join('')}<td class="nw"><button class="btn sm" onclick="formEnt('${t}','${r.id}')">Editar</button> <button class="btn sm danger" onclick="delEnt('${t}','${r.id}')">Excluir</button></td></tr>`).join('')||`<tr><td colspan="${cols.length+1}" class="sub">Nenhum registro.</td></tr>`}</table></div>`}
let op={t:'despesas',q:'',m:'',lim:100};
function opRows(){const o=OPS[op.t],q=nz(op.q);
  return o.arr().filter(r=>(!op.m||String(o.dt(r)||'').slice(0,7)===op.m)&&(!q||nz(o.hay(r).join(' ')).includes(q))).sort((a,b)=>String(o.dt(b)||'').localeCompare(String(o.dt(a)||'')))}
function vOper(){
  const o=OPS[op.t],all=o.arr(),rows=opRows(),tot=rows.reduce((a,r)=>a+(+o.val(r)||0),0),ms=[...new Set(all.map(r=>String(o.dt(r)||'').slice(0,7)).filter(Boolean))].sort().reverse();
  $('view').innerHTML=`<div class="stabs">${Object.keys(OPS).map(k=>`<button class="${op.t===k?'on':''}" onclick="op={t:'${k}',q:'',m:'',lim:100};vOper()">${OPS[k].t} <span class="cnt">${OPS[k].arr().length}</span></button>`).join('')}</div>
  <div class="bar"><input id="oq" placeholder="Buscar…" value="${esc(op.q)}"><select id="om"><option value="">Todos os meses</option>${ms.map(m=>`<option value="${m}" ${op.m===m?'selected':''}>${mesLbl(m)}</option>`).join('')}</select>
  <button class="btn auto" onclick="expOp()">⬇ CSV</button><button class="btn pri auto" onclick="formEnt('${op.t}')">+ Novo(a)</button></div>
  <div class="totline"><span><b>${rows.length}</b> registro(s)</span><span>Total: <b>${brl(tot)}</b></span>${missing.size?'<span class="warn">⚠ rode o update_2.sql</span>':''}</div>
  ${opTable(op.t,rows,false,op.lim)}${rows.length>op.lim?`<p style="text-align:center"><button class="btn" onclick="op.lim+=100;vOper()">Mostrar mais (${rows.length-op.lim})</button></p>`:''}`;
  const re=()=>{op.q=$('oq').value;op.m=$('om').value;op.lim=100;vOper();const q=$('oq');q.focus();q.setSelectionRange(999,999)};$('oq').oninput=re;$('om').onchange=re}
function expOp(){const o=OPS[op.t],f=ENT[op.t].f;csv(op.t+'-maxforte.csv',f.map(x=>x.l),opRows().map(r=>f.map(x=>x.t==='dtm'?dtm(r[x.k]):r[x.k])))}

/* ---------- painel ---------- */
const rs=n=>'R$ '+compact(n);
function revAlerts(){
  const last=new Map();revs.forEach(r=>{if(!r.placa||!r.prox_rev)return;const o=last.get(r.placa);if(!o||(r.data||'')>(o.data||''))last.set(r.placa,r)});
  const out=[];last.forEach((r,p)=>{const v=byPlaca.get(p);if(!v||!ativo(v)||!v.km_atual)return;const falta=r.prox_rev-v.km_atual;if(falta<=1500)out.push({v,r,falta})});
  return out.sort((a,b)=>a.falta-b.falta)}
const grp=(arr,mk,vf)=>{const m=new Map();arr.forEach(r=>{const k=mk(r);if(!k)return;m.set(k,(m.get(k)||0)+(+vf(r)||0))});return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]))};
const topN=(arr,kf,n=8)=>{const m=new Map();arr.forEach(r=>{const k=kf(r);if(k)m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([l,v])=>({l,v}))};
function vPainel(){
  const at=ativos(),cur=todayISO().slice(0,7),mark=k=>mesLbl(k)+(k.slice(0,7)===cur?'*':'');
  const ra=revAlerts(),dev=at.filter(v=>v.devolucao_prevista&&daysTo(v.devolucao_prevista)<=60).sort((a,b)=>a.devolucao_prevista.localeCompare(b.devolucao_prevista));
  const kmM=grp(kms,k=>k.mes,k=>k.km_total).map(([k,v])=>({l:mark(k),v})),combM=grp(kms,k=>k.mes,k=>k.comb_cartao).map(([k,v])=>({l:mark(k),v})),despM=grp(desp,r=>r.data&&r.data.slice(0,7)+'-01',r=>r.valor).map(([k,v])=>({l:mark(k),v}));
  const cpk=grp(kms.filter(k=>k.km_total>0&&k.comb_cartao>0),k=>k.mes,k=>k.comb_cartao).map(([k,v])=>({l:mark(k),v:v/(kms.filter(x=>x.mes===k&&x.km_total>0&&x.comb_cartao>0).reduce((a,x)=>a+x.km_total,0)||1)}));
  const multV=new Map();mult.forEach(m=>{if(m.placa)multV.set(m.placa,(multV.get(m.placa)||0)+(+m.valor||0))});
  const multTop=[...multV.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([l,v])=>({l,v}));
  const tM=mult.reduce((a,m)=>a+(+m.valor||0),0),tD=desp.reduce((a,m)=>a+(+m.valor||0),0),tL=lavs.reduce((a,m)=>a+(+m.valor||0),0);
  $('view').innerHTML=`<h2>Painel da frota</h2>${missing.size?'<p class="warn">⚠ Alguns dados ainda não estão disponíveis: rode o supabase/update_2.sql.</p>':''}
  <div class="kpis">${kpis([[at.length,'Frota ativa'],[at.filter(v=>v.tipo==='CARRO').length,'Carros'],[at.filter(v=>v.tipo==='MOTO').length,'Motos'],[dev.length,'Devoluções ≤ 60 dias'],[ra.length,'Revisões a fazer'],[rs(tM),'Multas (total)'],[rs(tD),'Despesas (total)'],[rs(tL),'Lavagens (total)']])}</div>
  <div class="pgrid">
   <section class="pcard"><h3>🔧 Atenção: revisões</h3>${ra.length?ra.slice(0,8).map(x=>`<div class="li" onclick="ficha('${x.v.id}','resumo')"><b>${esc(x.v.placa)}</b><span>${esc(x.v.modelo||'')}</span><em class="${x.falta<=0?'bad':'warn'}">${x.falta<=0?'vencida':'faltam '+num(x.falta)+' km'}</em></div>`).join('')+(ra.length>8?`<p class="sub">+ ${ra.length-8} outros</p>`:''):'<p class="sub">Nenhuma revisão próxima. ✅</p>'}</section>
   <section class="pcard"><h3>📅 Atenção: devoluções previstas</h3>${dev.length?dev.slice(0,8).map(v=>{const d=daysTo(v.devolucao_prevista);return `<div class="li" onclick="ficha('${v.id}','contrato')"><b>${esc(v.placa)}</b><span>${esc(v.fornecedor||v.modelo||'')}</span><em class="${d<0?'bad':'warn'}">${d<0?'há '+(-d)+' d':'em '+d+' d'}</em></div>`}).join('')+(dev.length>8?`<p class="sub">+ ${dev.length-8} outros (veja em Veículos)</p>`:''):'<p class="sub">Nenhuma devolução nos próximos 60 dias. ✅</p>'}</section>
   <section class="pcard"><h3>🛣️ KM rodados por mês</h3>${vbars(kmM,n=>compact(n))}<p class="sub fn">* mês em andamento</p></section>
   <section class="pcard"><h3>⛽ Combustível no cartão (R$)</h3>${vbars(combM,n=>compact(n))}<p class="sub fn">* mês em andamento</p></section>
   <section class="pcard"><h3>📈 Custo de combustível por km (R$/km)</h3>${vbars(cpk,(n)=>n.toFixed(2).replace('.',','))}<p class="sub fn">Combustível no cartão ÷ KM rodados (veículos com os dois dados)</p></section>
   <section class="pcard"><h3>💸 Despesas por mês (R$)</h3>${vbars(despM,n=>compact(n))}</section>
   <section class="pcard"><h3>🏢 Frota por fornecedor</h3>${hbars(topN(at,v=>v.fornecedor))}</section>
   <section class="pcard"><h3>👤 Frota por supervisor</h3>${hbars(topN(at,v=>v.supervisor))}</section>
   <section class="pcard"><h3>📍 Frota por posto (planilha)</h3>${hbars(topN(at,v=>v.posto_planilha))}</section>
   <section class="pcard"><h3>🚨 Multas por veículo (R$)</h3>${hbars(multTop,n=>brl(n))}</section>
  </div>`}

/* ---------- alocar (drag & drop + toque) ---------- */
let aqv='';
function applyAq(){const q=nz(aqv),b=$('board');if(b)b.querySelectorAll('.chip').forEach(c=>c.hidden=!!q&&!c.dataset.s.includes(q))}
function vAlocar(){
  const ob=$('board'),sl=ob?ob.scrollLeft:0,sy=window.scrollY,at=ativos();
  const cols=[{id:'',t:'Sem posto',s:'Disponíveis'},...postos.map(p=>({id:p.id,t:'#'+p.numero+(p.nome?' · '+p.nome:''),s:p.endereco}))];
  $('view').innerHTML=`<div class="bar"><h2 style="margin:0;flex:1">Alocar veículos</h2><input id="aq" placeholder="Filtrar por placa, modelo, posto da planilha…" value="${esc(aqv)}"></div>
  <p class="sub">Arraste a placa até o posto. No celular: toque na placa e depois toque na coluna de destino.</p><div class="board" id="board">
  ${cols.map(c=>{const l=at.filter(v=>(v.posto_id||'')===c.id);return `<div class="col ${selChip?'tgt':''}" data-id="${c.id}"><h4><span>${esc(c.t)}<small>${esc(c.s.slice(0,48))}</small></span><span class="tag">${l.length}</span></h4>
  ${l.map(v=>`<div class="chip ${selChip===v.id?'sel':''}" draggable="true" data-v="${v.id}" data-s="${esc(nz([v.placa,v.modelo,v.supervisor,v.posto_planilha].join(' ')))}" style="border-left:3px solid ${SC[v.situacao]||'#888'}" title="${esc(v.situacao)}${v.posto_planilha?' · planilha: '+esc(v.posto_planilha):''}">${esc(v.placa)}<small>${esc(v.modelo||v.situacao)}</small></div>`).join('')}</div>`}).join('')}</div>`;
  const b=$('board');b.scrollLeft=sl;window.scrollTo(0,sy);applyAq();
  $('aq').oninput=()=>{aqv=$('aq').value;applyAq()};
  b.ondragstart=e=>{const c=e.target.closest('.chip');if(!c)return;busy=true;e.dataTransfer.setData('text/plain',c.dataset.v);e.dataTransfer.effectAllowed='move';setTimeout(()=>c.classList.add('drag'),0)};
  b.ondragend=e=>{busy=false;e.target.classList?.remove('drag');b.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));if(pendingFlush)schedule()};
  b.ondragover=e=>{const c=e.target.closest('.col');if(!c)return;e.preventDefault();b.querySelectorAll('.over').forEach(x=>x!==c&&x.classList.remove('over'));c.classList.add('over')};
  b.ondrop=e=>{const c=e.target.closest('.col');if(!c)return;e.preventDefault();busy=false;move(e.dataTransfer.getData('text/plain'),c.dataset.id)};
  b.onclick=e=>{const ch=e.target.closest('.chip'),col=e.target.closest('.col');
    if(ch){selChip=selChip===ch.dataset.v?null:ch.dataset.v;b.querySelectorAll('.chip').forEach(x=>x.classList.toggle('sel',x.dataset.v===selChip));b.querySelectorAll('.col').forEach(x=>x.classList.toggle('tgt',!!selChip));return}
    if(col&&selChip)move(selChip,col.dataset.id)}}
async function move(vid,pid){
  const v=byId.get(vid);if(!v||(v.posto_id||'')===pid){selChip=null;return vAlocar()}
  const old=v.posto_id;v.posto_id=pid||null;selChip=null;vAlocar();lastWrite=Date.now(); // otimista
  const {error}=await sb.from('veiculos').update({posto_id:pid||null,updated_at:new Date().toISOString()}).eq('id',vid);
  if(error){v.posto_id=old;vAlocar();return toast('Erro: '+errText(error))}
  toast(`${v.placa} → ${pid?pName(pid):'Sem posto'}`)}

/* ---------- usuários / perfil ---------- */
let usersCache=[];
async function vUsers(){
  if(!$('view').querySelector('.tbl'))$('view').innerHTML='<p class="sub">Carregando…</p>';
  try{const us=usersCache=await api('users');
  $('view').innerHTML=`<div class="bar"><h2 style="margin:0;flex:1">Administradores</h2><button class="btn pri auto" onclick="formUser()">+ Novo administrador</button></div>
  <div class="tw"><table class="tbl"><tr><th>Usuário</th><th>Nome</th><th>Gênero</th><th>Papel</th><th></th></tr>
  ${us.map(u=>`<tr><td>${esc(u.username)}</td><td>${esc(u.display_name)}</td><td>${u.gender==='F'?'Feminino':u.gender==='M'?'Masculino':'Auto'}</td><td><span class="tag">${u.role}</span></td>
  <td><button class="btn sm" onclick="formUser('${u.id}')">Editar</button> ${u.id!==me.id?`<button class="btn sm danger" onclick="delUser('${u.id}')">Excluir</button>`:''}</td></tr>`).join('')}</table></div>`;
  }catch(e){$('view').innerHTML=`<p class="err">${esc(e.message)}</p>`}}
function formUser(uid){
  let u=uid?usersCache.find(x=>x.id===uid):null;const ed=!!u;u=u||{};
  modal(`<h2>${ed?'Editar':'Novo'} administrador</h2>
  <label>Usuário (login)<input id="uu" value="${esc(u.username||'')}" ${ed?'disabled':''} autocapitalize="none"></label>
  <label>Nome de exibição<input id="un" value="${esc(u.display_name||'')}"></label>
  <label>Tratamento na saudação<select id="ug"><option value="">Automático (pelo nome)</option><option value="M" ${u.gender==='M'?'selected':''}>Masculino (bem-vindo)</option><option value="F" ${u.gender==='F'?'selected':''}>Feminino (bem-vinda)</option></select></label>
  <label>${ed?'Nova senha (deixe vazio para manter)':'Senha (mín. 6)'}<input id="up" type="password" autocomplete="new-password"></label>
  <p class="err" id="me"></p><div class="acts"><button class="btn" onclick="closeMod()">Cancelar</button><button class="btn pri auto" id="sv" onclick="saveUser('${u.id||''}')">Salvar</button></div>`)}
async function saveUser(id){
  $('sv').disabled=true;const b={display_name:$('un').value.trim(),gender:$('ug').value,password:$('up').value||undefined};
  try{if(id)await api('users','PATCH',{...b,id});else await api('users','POST',{...b,username:$('uu').value});
    closeMod();toast('Salvo');if(id===me.id){me.display_name=b.display_name;me.gender=b.gender||null;$('whoName').textContent=me.display_name}go('users')}
  catch(e){$('me').textContent=e.message;$('sv').disabled=false}}
async function delUser(id){if(!confirm('Excluir este administrador?'))return;try{await api('users?id='+id,'DELETE');toast('Excluído');go('users')}catch(e){toast(e.message)}}
function vPerfil(){
  $('view').innerHTML=`<h2>Meu perfil</h2><div class="card" style="text-align:left;margin:0;max-width:460px;width:100%;transition:none">
  <label>Usuário<input value="${esc(me.username)}" disabled></label><label>Nome de exibição<input id="un" value="${esc(me.display_name)}"></label>
  <label>Tratamento na saudação<select id="ug"><option value="">Automático</option><option value="M" ${me.gender==='M'?'selected':''}>Masculino</option><option value="F" ${me.gender==='F'?'selected':''}>Feminino</option></select></label>
  <label>Nova senha (opcional)<input id="up" type="password" autocomplete="new-password"></label><p class="err" id="me"></p>
  <button class="btn pri" id="sv" onclick="saveMe()">Salvar alterações</button></div>`}
async function saveMe(){
  const b={display_name:$('un').value.trim(),gender:$('ug').value,password:$('up').value||undefined};
  if(!b.display_name){$('me').textContent='Informe o nome.';return}
  $('sv').disabled=true;try{await api('users','PATCH',b);me.display_name=b.display_name;me.gender=b.gender||null;$('whoName').textContent=me.display_name;toast('Perfil atualizado');$('up').value=''}catch(e){$('me').textContent=e.message}$('sv').disabled=false}