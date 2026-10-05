// GET  → diz ao site em que ponto a instalação está (variáveis, banco, precisa criar master?).
// POST → cria o usuário MASTER uma única vez (só funciona enquanto não existir nenhum perfil).
const {cfg,missing,mail}=require('./_lib');
const json=r=>r.json().catch(()=>null);
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    const miss=missing();
    if(req.method==='GET'){
      if(miss.length)return res.json({configured:false,missing:miss});
      const {U,H}=cfg();
      const r=await fetch(`${U}/rest/v1/profiles?select=id&limit=1`,{headers:H});
      const j=await json(r);
      if(!r.ok||!Array.isArray(j))return res.json({configured:true,db:false,detail:(j&&(j.message||j.hint))||('HTTP '+r.status)});
      return res.json({configured:true,db:true,needed:j.length===0,needCode:!!process.env.SETUP_CODE});
    }
    if(req.method!=='POST')return res.status(405).json({error:'Método inválido'});
    if(miss.length)return res.status(503).json({error:'Faltam variáveis na Vercel: '+miss.join(', ')});
    const {U,H}=cfg(),b=req.body||{},password=String(b.password||'');
    if(password.length<8)return res.status(400).json({error:'Senha mínima de 8 caracteres'});
    if(process.env.SETUP_CODE&&b.code!==process.env.SETUP_CODE)return res.status(403).json({error:'Código de instalação incorreto'});
    const ex=await json(await fetch(`${U}/rest/v1/profiles?select=id&limit=1`,{headers:H}));
    if(!Array.isArray(ex))return res.status(500).json({error:'Banco não preparado. Rode o supabase/schema.sql.'});
    if(ex.length)return res.status(403).json({error:'Master já existe'});
    const name=String(b.display_name||'').trim()||'Master';
    let id=null,created=false;
    const r=await fetch(U+'/auth/v1/admin/users',{method:'POST',headers:H,body:JSON.stringify({email:mail('master'),password,email_confirm:true})});
    const u=await json(r)||{};
    if(r.ok){id=u.id;created=true}
    else{
      // sobra de tentativa anterior: usuário existe no Auth mas sem perfil → reaproveita
      const l=await json(await fetch(U+'/auth/v1/admin/users?per_page=1000',{headers:H}));
      const old=((l&&l.users)||[]).find(x=>x.email===mail('master'));
      if(!old)return res.status(400).json({error:u.msg||u.message||u.error_description||'Falha ao criar usuário'});
      const has=await json(await fetch(`${U}/rest/v1/profiles?id=eq.${encodeURIComponent(old.id)}&select=id`,{headers:H}));
      if(Array.isArray(has)&&has.length)return res.status(403).json({error:'Master já existe'});
      const p=await fetch(`${U}/auth/v1/admin/users/${old.id}`,{method:'PUT',headers:H,body:JSON.stringify({password,email_confirm:true})});
      if(!p.ok)return res.status(500).json({error:'Falha ao definir a senha do master'});
      id=old.id;
    }
    const pr=await fetch(U+'/rest/v1/profiles',{method:'POST',headers:{...H,Prefer:'return=minimal'},body:JSON.stringify({id,username:'master',display_name:name,role:'master'})});
    if(!pr.ok){
      if(created)await fetch(`${U}/auth/v1/admin/users/${id}`,{method:'DELETE',headers:H}).catch(()=>{});
      const e=await json(pr);
      return res.status(500).json({error:'Falha ao criar o perfil: '+((e&&e.message)||pr.status)});
    }
    res.json({ok:true,usuario:'master'});
  }catch(e){res.status(500).json({error:e.message})}
};
