import {createClient} from '@supabase/supabase-js';

// Importado somente pela Function /api/admin/users, nunca pelo frontend.
export function makeCreateUserHandler({clientFactory=createClient,env=process.env}={}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST') {res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido.'});}
    const token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1];
    if(!token) return res.status(401).json({error:'Entre novamente na sua conta.'});
    // QA32_* evita credenciais de outra integração Supabase na Vercel.
    // As variáveis próprias são sempre prioritárias, sem expor segredo ao frontend.
    const url=env.QA32_SUPABASE_URL||env.SUPABASE_URL||env.VITE_SUPABASE_URL;
    const publicKey=env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const secret=env.QA32_SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!publicKey||!secret) return res.status(503).json({error:'Configure QA32_SUPABASE_URL e QA32_SUPABASE_SERVICE_ROLE_KEY na Vercel.'});
    if(req.headers.origin) {
      try {
        const origin=new URL(req.headers.origin);
        if(env.APP_ORIGIN ? origin.origin!==new URL(env.APP_ORIGIN).origin : origin.host!==req.headers.host)
          return res.status(403).json({error:'Origem não autorizada.'});
      } catch {return res.status(403).json({error:'Origem inválida.'});}
    }
    const service=clientFactory(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    try {
      const {data:auth,error:authError}=await service.auth.getUser(token);
      if(authError||!auth?.user) return res.status(401).json({error:'Sessão inválida ou expirada.'});
      const {data:profile,error:profileError}=await service.from('qa_profiles').select('role,active').eq('id',auth.user.id).single();
      if(profileError||profile?.role!=='admin'||!profile.active) return res.status(403).json({error:'Acesso restrito ao administrador ativo.'});
      let body=req.body;
      if(typeof body==='string') {try{body=JSON.parse(body);}catch{return res.status(400).json({error:'Conteúdo JSON inválido.'});}}
      if(!body||typeof body!=='object'||JSON.stringify(body).length>4096) return res.status(400).json({error:'Solicitação inválida.'});
      const {email,password,display_name,role='operator'}=body;
      if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254
        ||typeof display_name!=='string'||!display_name.trim()||display_name.trim().length>120
        ||typeof password!=='string'||password.length<12||password.length>128||!/[a-zA-Z]/.test(password)||!/\d/.test(password)
        ||!['operator','admin'].includes(role))
        return res.status(400).json({error:'Informe nome, e-mail válido, perfil e senha de 12 a 128 caracteres com letras e números.'});
      const caller=clientFactory(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
      const {error:rateError}=await caller.rpc('qa_reserve_user_creation');
      if(rateError) return res.status(429).json({error:'Criação não autorizada ou limite de 10 tentativas por hora atingido. Atualize sua sessão e tente mais tarde.'});
      const {data,error}=await service.auth.admin.createUser({email:email.trim().toLowerCase(),password,email_confirm:true,user_metadata:{display_name:display_name.trim()}});
      if(error||!data?.user) return res.status(400).json({error:'Não foi possível criar a conta. Confira se o e-mail já está cadastrado e se a senha atende à política do Supabase.'});
      const {data:profileRows,error:saveError}=await service.from('qa_profiles').update({display_name:display_name.trim(),role,active:true}).eq('id',data.user.id).select('id');
      if(saveError||!profileRows?.length) return res.status(409).json({error:'A conta foi criada como operador, mas o perfil solicitado não foi aplicado. Atualize a lista e ajuste o perfil antes de repetir o cadastro.'});
      return res.status(201).json({user:{id:data.user.id,email:data.user.email,display_name:display_name.trim(),role}});
    } catch {return res.status(500).json({error:'Falha ao criar a conta. Confira a lista de usuários antes de tentar novamente.'});}
  };
}
