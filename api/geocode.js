// Geocodificação inteligente: normaliza o texto, usa CEP (ViaCEP), Nominatim/OSM com vários
// fallbacks restritos à Bahia e, por fim, Photon. Sempre devolve a precisão do resultado.
const BB={w:-46.7,e:-37.3,s:-18.4,n:-8.4};
const inBA=(la,lo)=>la>=BB.s&&la<=BB.n&&lo>=BB.w&&lo<=BB.e;
const UA={'User-Agent':'MaxForteFleet/1.0 (admin@maxforte.app)'};
function clean(q){
  return q.replace(/\bposto\b[^,\-]*?(?=,|-|$)/gi,'').replace(/\bav\.?(?=\s)/gi,'Avenida').replace(/\bpç\.?(?=\s)/gi,'Praça')
    .replace(/\brod\.?(?=\s)/gi,'Rodovia').replace(/\btrav\.?(?=\s)/gi,'Travessa').replace(/\bestr\.?(?=\s)/gi,'Estrada')
    .replace(/\br\.(?=\s)/gi,'Rua').replace(/\bbr[\s-]?(\d{3})/gi,'BR-$1').replace(/\bba[\s-]?(\d{3})/gi,'BA-$1')
    .replace(/\b(n[º°o.]*|numero|número)\s*(?=\d)/gi,'').replace(/\bs\/?n\b/gi,'').replace(/\s+/g,' ').replace(/\s+,/g,',').replace(/^[\s,\-–]+/,'').trim();
}
async function nom(p){
  const u=new URL('https://nominatim.openstreetmap.org/search');
  Object.entries({format:'jsonv2',addressdetails:1,limit:5,countrycodes:'br','accept-language':'pt-BR',...p}).forEach(([k,v])=>u.searchParams.set(k,v));
  try{const r=await fetch(u,{headers:UA});return r.ok?await r.json():[];}catch{return[];}
}
const prec=t=>['house','building','residential','commercial'].includes(t)?'exato':['road','highway','street','footway'].includes(t)?'rua':'aproximado';
const fromNom=a=>a.map(x=>({lat:+x.lat,lng:+x.lon,label:x.display_name,precision:prec(x.addresstype||x.type)})).filter(x=>inBA(x.lat,x.lng));
module.exports=async(req,res)=>{
  const raw=String(req.query.q||'').trim();
  if(raw.length<3)return res.status(400).json({error:'Digite o endereço'});
  let q=clean(raw);const tried=[];
  const cep=raw.match(/\b(\d{5})-?(\d{3})\b/);
  if(cep){
    try{const v=await fetch(`https://viacep.com.br/ws/${cep[1]}${cep[2]}/json/`).then(r=>r.json());
      if(!v.erro){const num=(raw.replace(cep[0],'').match(/\b\d{1,5}\b/)||[''])[0];
        q=`${v.logradouro} ${num}, ${v.bairro}, ${v.localidade}, ${v.uf}`.replace(/\s+,/g,',');}}catch{}
  }
  const hasBA=/\b(bahia|ba)\b/i.test(q);
  const vb=`${BB.w},${BB.n},${BB.e},${BB.s}`;
  const noNum=q.replace(/\b\d{1,5}\b/g,'').replace(/\s+/g,' ').replace(/,\s*,/g,',').trim();
  const parts=q.split(/\s*[,\-–]\s*/).filter(Boolean);
  const attempts=[
    {q:hasBA?q:q+', Bahia',viewbox:vb,bounded:1},
    {q:noNum+(hasBA?'':', Bahia'),viewbox:vb,bounded:1},
    {q:q+', Bahia, Brasil'},
    parts.length>2?{q:parts.slice(-3).join(', ')+(hasBA?'':', Bahia'),viewbox:vb,bounded:1}:null,
    parts.length>1?{q:parts.slice(-2).join(', ')+', Bahia',viewbox:vb,bounded:1}:null,
  ].filter(Boolean);
  for(const a of attempts){
    const r=fromNom(await nom(a));tried.push(a.q);
    if(r.length){
      const seen=new Set(),out=r.filter(x=>{const k=x.lat.toFixed(4)+x.lng.toFixed(4);if(seen.has(k))return false;seen.add(k);return true;});
      return res.json({results:out,query:a.q});
    }
    await new Promise(s=>setTimeout(s,1100));
  }
  try{
    const j=await fetch(`https://photon.komoot.io/api/?limit=5&lat=-12.97&lon=-38.5&q=${encodeURIComponent(q+' Bahia')}`).then(r=>r.json());
    const out=(j.features||[]).map(f=>({lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],
      label:[f.properties.name,f.properties.street,f.properties.city,f.properties.state].filter(Boolean).join(', '),precision:'aproximado'})).filter(x=>inBA(x.lat,x.lng));
    if(out.length)return res.json({results:out,query:q});
  }catch{}
  res.json({results:[],tried});
};
