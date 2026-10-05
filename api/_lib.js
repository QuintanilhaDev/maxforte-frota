// Utilitários compartilhados pelas funções da API.
const NEED=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'];
exports.missing=()=>NEED.filter(k=>!String(process.env[k]||'').trim());
// Lê as variáveis na hora do uso (e remove "/" final e espaços colados sem querer).
exports.cfg=()=>{
  const U=String(process.env.SUPABASE_URL||'').trim().replace(/\/+$/,'');
  const S=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
  const A=String(process.env.SUPABASE_ANON_KEY||'').trim();
  // Chaves novas (sb_secret_...) NÃO são JWT: vão só em "apikey". A chave antiga (eyJ...) vai nos dois.
  const H={apikey:S,'Content-Type':'application/json'};
  if(S.startsWith('eyJ'))H.Authorization='Bearer '+S;
  return {U,S,A,H};
};
// Devolve o perfil de quem fez a chamada (ou null se o token for inválido).
exports.me=async req=>{
  const {U,A,H}=exports.cfg();
  const t=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!t)return null;
  const r=await fetch(U+'/auth/v1/user',{headers:{apikey:A,Authorization:'Bearer '+t}});
  if(!r.ok)return null;
  const u=await r.json();
  const p=await fetch(`${U}/rest/v1/profiles?id=eq.${encodeURIComponent(u.id)}&select=*`,{headers:H}).then(r=>r.json());
  return Array.isArray(p)&&p[0]||null;
};
exports.mail=u=>`${u}@maxforte.app`;
exports.cleanUser=u=>String(u||'').toLowerCase().replace(/[^a-z0-9._-]/g,'');
