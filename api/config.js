const {missing,cfg}=require('./_lib');
module.exports=(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const m=missing();if(m.length)return res.json({configured:false,missing:m});
  const {U,A}=cfg();res.json({configured:true,url:U,anon:A});
};
