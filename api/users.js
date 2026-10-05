const {cfg,me,mail,cleanUser}=require('./_lib');
const json=r=>r.json().catch(()=>null);
module.exports=async(req,res)=>{
  try{
    const {U,H}=cfg();
    const m=await me(req);if(!m)return res.status(401).json({error:'Não autenticado'});
    const master=m.role==='master',b=req.body||{};
    if(req.method==='GET'){
      if(!master)return res.status(403).json({error:'Apenas master'});
      return res.json(await json(await fetch(U+'/rest/v1/profiles?select=*&order=created_at',{headers:H}))||[]);
    }
    if(req.method==='POST'){
      if(!master)return res.status(403).json({error:'Apenas master'});
      const username=cleanUser(b.username),name=String(b.display_name||'').trim(),pw=String(b.password||'');
      if(!username||!name||pw.length<6)return res.status(400).json({error:'Preencha usuário, nome e senha (mín. 6)'});
      const r=await fetch(U+'/auth/v1/admin/users',{method:'POST',headers:H,body:JSON.stringify({email:mail(username),password:pw,email_confirm:true})});
      const u=await json(r)||{};if(!r.ok)return res.status(400).json({error:u.msg||u.message||'Esse usuário já existe?'});
      const g=['M','F'].includes(b.gender)?b.gender:null;
      const pr=await fetch(U+'/rest/v1/profiles',{method:'POST',headers:{...H,Prefer:'return=minimal'},body:JSON.stringify({id:u.id,username,display_name:name,gender:g,role:'admin'})});
      if(!pr.ok){await fetch(`${U}/auth/v1/admin/users/${u.id}`,{method:'DELETE',headers:H}).catch(()=>{});return res.status(500).json({error:'Falha ao criar o perfil'})}
      return res.json({ok:true});
    }
    if(req.method==='PATCH'){
      const id=b.id||m.id;
      if(id!==m.id&&!master)return res.status(403).json({error:'Sem permissão'});
      if(b.password&&String(b.password).length<6)return res.status(400).json({error:'Senha mínima de 6 caracteres'});
      const upd={};
      if(b.display_name)upd.display_name=String(b.display_name).trim();
      if('gender' in b)upd.gender=['M','F'].includes(b.gender)?b.gender:null;
      if(Object.keys(upd).length){
        const r=await fetch(`${U}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:H,body:JSON.stringify(upd)});
        if(!r.ok)return res.status(500).json({error:'Falha ao salvar o perfil'});
      }
      if(b.password){
        const r=await fetch(`${U}/auth/v1/admin/users/${id}`,{method:'PUT',headers:H,body:JSON.stringify({password:String(b.password)})});
        if(!r.ok)return res.status(400).json({error:'Falha ao trocar senha'});
      }
      return res.json({ok:true});
    }
    if(req.method==='DELETE'){
      const id=req.query.id;
      if(!master)return res.status(403).json({error:'Apenas master'});
      if(id===m.id)return res.status(400).json({error:'Você não pode excluir a si mesmo'});
      const r=await fetch(`${U}/auth/v1/admin/users/${encodeURIComponent(id)}`,{method:'DELETE',headers:H});
      if(!r.ok)return res.status(400).json({error:'Falha ao excluir'});
      return res.json({ok:true});
    }
    res.status(405).json({error:'Método inválido'});
  }catch(e){res.status(500).json({error:e.message})}
};
