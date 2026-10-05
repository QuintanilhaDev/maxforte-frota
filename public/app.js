const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SIT=['Operando','Em rota','Manutenção','Parado'],SC={Operando:'#34d399','Em rota':'#60a5fa','Manutenção':'#fbbf24',Parado:'#f87171'};
let sb,me=null,postos=[],veic=[],tab='map',selPosto=null,selChip=null,vf={q:'',s:'',p:''};
const TZ='America/Bahia';

/* ---------- util ---------- */
function toast(m){const d=document.createElement('div');d.textContent=m;$('toast').appendChild(d);setTimeout(()=>d.remove(),3200)}
async function api(path,method='GET',body){
  const {data}=await sb.auth.getSession();
  const r=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(data.session?.access_token||'')},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Erro '+r.status);return j}
function modal(html){$('mbox').innerHTML=html;$('mod').hidden=false}
function closeMod(){$('mod').hidden=true;$('mbox').innerHTML=''}
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
// ===== Voz: escolhe a voz mais natural e feminina disponível em cada navegador =====
let voices=[];
function loadV(){try{voices=speechSynthesis.getVoices()||[]}catch(e){voices=[]}}
if('speechSynthesis' in window){loadV();speechSynthesis.onvoiceschanged=loadV}
const MALE=/antonio|ant[oô]nio|daniel|felipe|ricardo|jorge|male\b|masculin|paulo|jo[aã]o|luis|lu[ií]s/i;
function scoreVoice(v){
  const n=v.name||'',l=(v.lang||'').replace('_','-').toLowerCase();
  if(!l.startsWith('pt'))return -9999;
  let s=0;
  if(l==='pt-br')s+=200;else s-=100;                      // pt-PT só como último recurso
  if(MALE.test(n))s-=1000;                                // voz feminina
  if(/natural|neural/i.test(n))s+=300;                    // Edge: "Microsoft Francisca Online (Natural)"
  if(/online/i.test(n))s+=60;
  if(/premium|enhanced|aprimorad|siri/i.test(n))s+=250;   // Safari/iOS/macOS: vozes premium
  if(/francisca/i.test(n))s+=60;if(/thalita/i.test(n))s+=50;
  if(/luciana/i.test(n))s+=40;if(/fernanda|vit[oó]ria/i.test(n))s+=30;
  if(/google/i.test(n))s+=140;                            // Chrome: "Google português do Brasil"
  if(/x-.*-network|network/i.test(n))s+=80;               // Android: vozes de rede soam melhor
  if(/maria/i.test(n))s+=10;
  if(v.localService===false)s+=20;
  return s;
}
function bestVoice(){
  loadV();
  return voices.map(v=>({v,s:scoreVoice(v)})).filter(x=>x.s>-5000).sort((a,b)=>b.s-a.s)[0]?.v||null;
}
// Chrome carrega as vozes de forma assíncrona: espera até 2s antes de desistir
function waitVoices(){
  return new Promise(res=>{
    loadV();if(voices.length)return res();
    let t=0;const i=setInterval(()=>{loadV();if(voices.length||++t>20){clearInterval(i);res()}},100);
  });
}
async function speak(txt){
  if(!('speechSynthesis' in window))return;
  await waitVoices();
  const v=bestVoice();
  const u=new SpeechSynthesisUtterance(txt);
  u.lang='pt-BR';
  if(v){u.voice=v;u.lang=v.lang}
  const natural=v&&/natural|neural|premium|enhanced|aprimorad|google|network/i.test(v.name);
  // vozes naturais soam melhor sem distorção; vozes simples ganham um leve ajuste
  u.pitch=natural?1:1.05;u.rate=natural?1:.94;u.volume=1;
  speechSynthesis.cancel();speechSynthesis.speak(u);
}
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
  setTimeout(async()=>{await done;$('login').hidden=true;$('app').hidden=false;$('whoName').textContent=me.display_name;buildNav();go('map')},5000);
};
$('out').onclick=async()=>{await sb.auth.signOut();location.reload()};

/* ---------- dados ---------- */
async function loadAll(){
  const [a,b]=await Promise.all([sb.from('postos').select('*').order('numero'),sb.from('veiculos').select('*').order('placa')]);
  if(a.error||b.error)throw new Error((a.error||b.error).message);
  postos=a.data;veic=b.data}
const counts=()=>{const c={};veic.forEach(v=>{if(v.posto_id)c[v.posto_id]=(c[v.posto_id]||0)+1});return c};
const pName=id=>{const p=postos.find(x=>x.id===id);return p?`#${p.numero}${p.nome?' · '+p.nome:''}`:'—'};
async function refresh(){await loadAll();go(tab,true)}

/* ---------- navegação ---------- */
function buildNav(){
  const t=[['map','Mapa'],['postos','Postos'],['veic','Veículos'],['alocar','Alocar'],...(me.role==='master'?[['users','Usuários']]:[]),['perfil','Meu perfil']];
  $('nav').innerHTML=t.map(([k,l])=>`<button data-k="${k}">${l}</button>`).join('');
  $('nav').onclick=e=>{const k=e.target.dataset.k;if(k)go(k)}}
function go(k,keep){
  if(tab==='map'&&k!=='map')Holo.dispose();
  tab=k;selChip=null;if(!keep)window.scrollTo(0,0);
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  ({map:vMap,postos:vPostos,veic:vVeic,alocar:vAlocar,users:vUsers,perfil:vPerfil})[k]()}

/* ---------- mapa ---------- */
function vMap(){
  const f=isFem(me),c=counts(),al=Object.values(c).reduce((a,b)=>a+b,0);
  $('view').innerHTML=`<h1 class="title"><b>${esc(first(me.display_name))}</b>, seja bem-vind${f?'a':'o'} ao painel administrativo de frota da Max Forte</h1>
  <div class="holowrap"><div id="holo"></div><div class="hint">Arraste para girar · role para zoom · toque num posto</div><aside class="pp" id="pp"></aside></div>
  <div class="kpis">${[[postos.length,'Postos'],[veic.length,'Veículos'],[al,'Alocados'],[veic.length-al,'Sem posto'],[veic.filter(v=>v.situacao==='Manutenção').length,'Em manutenção']].map(([n,l])=>`<div class="kpi"><b>${n}</b><span>${l}</span></div>`).join('')}</div>
  ${postos.length?'':'<p class="sub" style="text-align:center">Nenhum posto cadastrado ainda. Vá em <b>Postos</b> para adicionar o primeiro.</p>'}`;
  Holo.init($('holo'),p=>{selPosto=p.id;Holo.setPostos(postos,counts(),selPosto);openPP(p)});
  Holo.setPostos(postos,c,selPosto=null)}
function openPP(p){
  const vs=veic.filter(v=>v.posto_id===p.id),pp=$('pp');pp.classList.remove('open');
  pp.innerHTML=`<button class="x" aria-label="Fechar" onclick="closePP()">×</button><h3>Posto #${esc(p.numero)}</h3><p class="sub" style="margin:2px 0 14px">${esc(p.nome||'')}${p.nome?' · ':''}${esc(p.endereco)}</p>
  <div class="big">${vs.length}</div><div class="sub">veículo${vs.length===1?'':'s'} neste posto</div>
  <div class="plates">${vs.map((v,i)=>`<span class="plate" style="animation-delay:${i*50+250}ms" title="${v.situacao}">${esc(v.placa)}</span>`).join('')||'<span class="sub">Nenhum veículo alocado.</span>'}</div>
  <div class="acts" style="justify-content:flex-start"><button class="btn sm" onclick="go('alocar')">Alocar veículos</button><button class="btn sm" onclick="formPosto('${p.id}')">Editar posto</button></div>`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>pp.classList.add('open')))}
function closePP(){$('pp').classList.remove('open');selPosto=null;Holo.setPostos(postos,counts(),null)}

/* ---------- CSV ---------- */
function csv(nome,cab,linhas){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const t='\ufeff'+[cab,...linhas].map(l=>l.map(q).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'})),el=document.createElement('a');
  el.href=url;el.download=nome;document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function expPostos(){const c=counts();csv('postos-maxforte.csv',['Numero','Nome','Endereco','Latitude','Longitude','Veiculos'],postos.map(p=>[p.numero,p.nome||'',p.endereco,p.lat,p.lng,c[p.id]||0]))}
function expVeic(){csv('veiculos-maxforte.csv',['Placa','Situacao','Posto'],vFiltrados().map(v=>[v.placa,v.situacao,v.posto_id?pName(v.posto_id):'Sem posto']))}

/* ---------- postos ---------- */
function vPostos(){
  const c=counts();
  $('view').innerHTML=`<div class="bar"><h2 style="margin:0;flex:1">Postos</h2><button class="btn auto" onclick="expPostos()">⬇ CSV</button><button class="btn pri auto" onclick="formPosto()">+ Novo posto</button></div>
  <div class="tw"><table class="tbl"><tr><th>Nº</th><th>Nome</th><th>Endereço</th><th>Veículos</th><th></th></tr>
  ${postos.map(p=>`<tr><td><b>#${esc(p.numero)}</b></td><td>${esc(p.nome||'—')}</td><td class="wrap">${esc(p.endereco)}<br><small class="sub">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</small></td><td>${c[p.id]||0}</td>
  <td><button class="btn sm" onclick="formPosto('${p.id}')">Editar</button> <button class="btn sm danger" onclick="delPosto('${p.id}')">Excluir</button></td></tr>`).join('')||'<tr><td colspan="5" class="sub">Nenhum posto.</td></tr>'}</table></div>`}
let cands=[],geoAddr='',manual=false;
function formPosto(id){
  const p=id?postos.find(x=>x.id===id):{numero:'',nome:'',endereco:'',lat:'',lng:''};cands=[];geoAddr=id?p.endereco:'';manual=false;
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
  $('sv').disabled=true;
  const row={numero,nome:$('pnm').value.trim()||null,endereco,lat,lng};
  const {error}=id?await sb.from('postos').update(row).eq('id',id):await sb.from('postos').insert(row);
  if(error){$('me').textContent=error.code==='23505'?'Já existe um posto com essa numeração.':error.message;$('sv').disabled=false;return}
  closeMod();toast('Posto salvo');await refresh()}
async function delPosto(id){
  const n=veic.filter(v=>v.posto_id===id).length;
  if(!confirm(`Excluir este posto?${n?` Os ${n} veículos nele ficarão sem posto.`:''}`))return;
  const {error}=await sb.from('postos').delete().eq('id',id);if(error)return toast(error.message);toast('Posto excluído');await refresh()}

/* ---------- veículos ---------- */
const normPlaca=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,''),okPlaca=s=>/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(s);
const vFiltrados=()=>veic.filter(v=>(!vf.q||v.placa.includes(normPlaca(vf.q)))&&(!vf.s||v.situacao===vf.s)&&(!vf.p||(vf.p==='none'?!v.posto_id:v.posto_id===vf.p)));
function vVeic(){
  const l=vFiltrados();
  $('view').innerHTML=`<div class="bar"><h2 style="margin:0;flex:1">Veículos <span class="tag">${l.length}/${veic.length}</span></h2><button class="btn auto" onclick="expVeic()">⬇ CSV</button><button class="btn pri auto" onclick="formVeic()">+ Novo veículo</button></div>
  <div class="bar"><input id="fq" placeholder="Buscar placa" value="${esc(vf.q)}"><select id="fs"><option value="">Todas as situações</option>${SIT.map(s=>`<option ${vf.s===s?'selected':''}>${s}</option>`).join('')}</select>
  <select id="fp"><option value="">Todos os postos</option><option value="none" ${vf.p==='none'?'selected':''}>Sem posto</option>${postos.map(p=>`<option value="${p.id}" ${vf.p===p.id?'selected':''}>#${esc(p.numero)}</option>`).join('')}</select></div>
  <div class="tw"><table class="tbl"><tr><th>Placa</th><th>Situação</th><th>Posto</th><th></th></tr>
  ${l.map(v=>`<tr><td><b style="font-family:ui-monospace,monospace;letter-spacing:.08em">${esc(v.placa)}</b></td><td><span class="dot" style="background:${SC[v.situacao]}"></span>${v.situacao}</td><td>${esc(pName(v.posto_id))}</td>
  <td><button class="btn sm" onclick="formVeic('${v.id}')">Editar</button> <button class="btn sm danger" onclick="delVeic('${v.id}')">Excluir</button></td></tr>`).join('')||'<tr><td colspan="4" class="sub">Nenhum veículo.</td></tr>'}</table></div>`;
  const re=()=>{vf={q:$('fq').value,s:$('fs').value,p:$('fp').value};vVeic();const q=$('fq');q.focus();q.setSelectionRange(99,99)};
  $('fq').oninput=re;$('fs').onchange=re;$('fp').onchange=re}
function formVeic(id){
  const v=id?veic.find(x=>x.id===id):null;
  modal(`<h2>${v?'Editar veículo':'Novo veículo'}</h2>
  ${v?`<label>Placa<input id="vp" value="${esc(v.placa)}" maxlength="8" style="text-transform:uppercase"></label>`:`<label>Placa(s) — uma por linha ou separadas por espaço<textarea id="vp" rows="3" style="text-transform:uppercase" placeholder="ABC1D23"></textarea></label>`}
  <div class="row"><label>Situação<select id="vs">${SIT.map(s=>`<option ${v&&v.situacao===s?'selected':''}>${s}</option>`).join('')}</select></label>
  <label>Posto<select id="vpo"><option value="">Sem posto</option>${postos.map(p=>`<option value="${p.id}" ${v&&v.posto_id===p.id?'selected':''}>#${esc(p.numero)}${p.nome?' · '+esc(p.nome):''}</option>`).join('')}</select></label></div>
  <p class="err" id="me"></p><div class="acts"><button class="btn" onclick="closeMod()">Cancelar</button><button class="btn pri auto" id="sv" onclick="saveVeic('${id||''}')">Salvar</button></div>`)}
async function saveVeic(id){
  const raw=$('vp').value,list=id?[normPlaca(raw)]:[...new Set(raw.split(/[\s,;]+/).map(normPlaca).filter(Boolean))];
  const bad=list.filter(p=>!okPlaca(p));
  if(!list.length||bad.length){$('me').textContent=bad.length?`Placa inválida: ${bad.join(', ')} (formato ABC1D23 ou ABC1234)`:'Informe a placa.';return}
  $('sv').disabled=true;const base={situacao:$('vs').value,posto_id:$('vpo').value||null,updated_at:new Date().toISOString()};
  const {error}=id?await sb.from('veiculos').update({...base,placa:list[0]}).eq('id',id):await sb.from('veiculos').insert(list.map(placa=>({...base,placa})));
  if(error){$('me').textContent=error.code==='23505'?'Alguma dessas placas já está cadastrada.':error.message;$('sv').disabled=false;return}
  closeMod();toast('Veículo(s) salvo(s)');await refresh()}
async function delVeic(id){if(!confirm('Excluir este veículo?'))return;const {error}=await sb.from('veiculos').delete().eq('id',id);if(error)return toast(error.message);toast('Excluído');await refresh()}

/* ---------- alocar (drag & drop + toque) ---------- */
function vAlocar(){
  const cols=[{id:'',t:'Sem posto',s:'Disponíveis'},...postos.map(p=>({id:p.id,t:'#'+p.numero+(p.nome?' · '+p.nome:''),s:p.endereco}))];
  $('view').innerHTML=`<h2>Alocar veículos</h2><p class="sub">Arraste a placa até o posto. No celular: toque na placa e depois toque na coluna de destino.</p><div class="board" id="board">
  ${cols.map(c=>{const l=veic.filter(v=>(v.posto_id||'')===c.id);return `<div class="col" data-id="${c.id}"><h4><span>${esc(c.t)}<small>${esc(c.s.slice(0,48))}</small></span><span class="tag">${l.length}</span></h4>
  ${l.map(v=>`<div class="chip" draggable="true" data-v="${v.id}">${esc(v.placa)}<small>${v.situacao}</small></div>`).join('')}</div>`}).join('')}</div>`;
  const b=$('board');
  b.ondragstart=e=>{const c=e.target.closest('.chip');if(!c)return;e.dataTransfer.setData('text/plain',c.dataset.v);e.dataTransfer.effectAllowed='move';setTimeout(()=>c.classList.add('drag'),0)};
  b.ondragend=e=>{e.target.classList?.remove('drag');b.querySelectorAll('.over').forEach(x=>x.classList.remove('over'))};
  b.ondragover=e=>{const c=e.target.closest('.col');if(!c)return;e.preventDefault();b.querySelectorAll('.over').forEach(x=>x!==c&&x.classList.remove('over'));c.classList.add('over')};
  b.ondrop=e=>{const c=e.target.closest('.col');if(!c)return;e.preventDefault();move(e.dataTransfer.getData('text/plain'),c.dataset.id)};
  b.onclick=e=>{const ch=e.target.closest('.chip'),col=e.target.closest('.col');
    if(ch){selChip=selChip===ch.dataset.v?null:ch.dataset.v;b.querySelectorAll('.chip').forEach(x=>x.classList.toggle('sel',x.dataset.v===selChip));b.querySelectorAll('.col').forEach(x=>x.classList.toggle('tgt',!!selChip));return}
    if(col&&selChip)move(selChip,col.dataset.id)}}
async function move(vid,pid){
  const v=veic.find(x=>x.id===vid);if(!v||(v.posto_id||'')===pid){selChip=null;return vAlocar()}
  const old=v.posto_id;v.posto_id=pid||null;selChip=null;vAlocar(); // otimista
  const {error}=await sb.from('veiculos').update({posto_id:pid||null,updated_at:new Date().toISOString()}).eq('id',vid);
  if(error){v.posto_id=old;vAlocar();return toast('Erro: '+error.message)}
  toast(`${v.placa} → ${pid?pName(pid):'Sem posto'}`)}

/* ---------- usuários / perfil ---------- */
async function vUsers(){
  $('view').innerHTML='<p class="sub">Carregando…</p>';
  try{const us=await api('users');
  $('view').innerHTML=`<div class="bar"><h2 style="margin:0;flex:1">Administradores</h2><button class="btn pri auto" onclick="formUser()">+ Novo administrador</button></div>
  <div class="tw"><table class="tbl"><tr><th>Usuário</th><th>Nome</th><th>Gênero</th><th>Papel</th><th></th></tr>
  ${us.map(u=>`<tr><td>${esc(u.username)}</td><td>${esc(u.display_name)}</td><td>${u.gender==='F'?'Feminino':u.gender==='M'?'Masculino':'Auto'}</td><td><span class="tag">${u.role}</span></td>
  <td><button class="btn sm" onclick='formUser(${JSON.stringify(u).replace(/'/g,"&#39;")})'>Editar</button> ${u.id!==me.id?`<button class="btn sm danger" onclick="delUser('${u.id}')">Excluir</button>`:''}</td></tr>`).join('')}</table></div>`;
  }catch(e){$('view').innerHTML=`<p class="err">${esc(e.message)}</p>`}}
function formUser(u){
  const ed=!!u;u=u||{};
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