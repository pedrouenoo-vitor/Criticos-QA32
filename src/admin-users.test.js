import {describe,it,expect,vi} from 'vitest';
import {makeCreateUserHandler} from './admin-users';
const env={SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'server-test'};
const form={email:'novo@example.com',password:'Initialpassword123',display_name:'Novo',role:'operator'};
function fixture({role='admin',active=true,authError=null,rateError=null,createError=null,profileError=null}={}) {
 const created=vi.fn(async()=>({data:{user:{id:'new-id',email:form.email}},error:createError}));
 const update=vi.fn(()=>({eq:()=>({select:async()=>({data:profileError?null:[{id:'new-id'}],error:profileError})})}));
 const service={auth:{getUser:async()=>({data:{user:authError?null:{id:'admin'}},error:authError}),admin:{createUser:created}},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role,active}})})}),update})};
 const caller={rpc:vi.fn(async()=>({error:rateError}))};
 const handler=makeCreateUserHandler({env,clientFactory:(url,key)=>key==='server-test'?service:caller});
 const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
 const request={method:'POST',headers:{authorization:'Bearer user-token',host:'qa.example.com',origin:'https://qa.example.com'},body:form};
 return {handler,response,request,created,caller,update};
}
describe('Criação administrativa de usuários',()=>{
 it('nega solicitações sem autenticação',async()=>{const f=fixture();f.request.headers.authorization='';await f.handler(f.request,f.response);expect(f.response.code).toBe(401);expect(f.created).not.toHaveBeenCalled();});
 it.each([{role:'operator'},{active:false},{authError:{message:'expired'}}])('nega operador, desativado ou token inválido %o',async opts=>{const f=fixture(opts);await f.handler(f.request,f.response);expect([401,403]).toContain(f.response.code);expect(f.created).not.toHaveBeenCalled();});
 it('valida senha e não cria conta inválida',async()=>{const f=fixture();f.request.body={...form,password:'123'};await f.handler(f.request,f.response);expect(f.response.code).toBe(400);expect(f.created).not.toHaveBeenCalled();});
 it('aplica limite persistente antes de criar conta',async()=>{const f=fixture({rateError:{}});await f.handler(f.request,f.response);expect(f.response.code).toBe(429);expect(f.created).not.toHaveBeenCalled();});
 it('cria somente após verificar admin; não retorna senha nem chave',async()=>{const f=fixture();await f.handler(f.request,f.response);expect(f.response.code).toBe(201);expect(f.caller.rpc).toHaveBeenCalledWith('qa_reserve_user_creation');const body=JSON.stringify(f.response.body);expect(body).not.toContain(form.password);expect(body).not.toContain('server-test');expect(f.created).toHaveBeenCalledOnce();});
 it('não ignora falha parcial de perfil',async()=>{const f=fixture({profileError:{}});await f.handler(f.request,f.response);expect(f.response.code).toBe(409);expect(f.response.body.error).toContain('operador');});
 it('bloqueia origem diferente e métodos não autorizados',async()=>{const f=fixture();f.request.headers.origin='https://outro.example';await f.handler(f.request,f.response);expect(f.response.code).toBe(403);f.request.method='GET';await f.handler(f.request,f.response);expect(f.response.code).toBe(405);});
});


describe('Isolamento de integração Supabase QA32',()=>{
 it('prioriza URL e chave QA32_* mesmo com integração antiga configurada',async()=>{
  const used=[];
  const service={auth:{getUser:async()=>({data:{user:{id:'admin'}}}),admin:{createUser:async()=>({data:{user:{id:'new-id',email:form.email}}})}},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:'admin',active:true}})})}),update:()=>({eq:()=>({select:async()=>({data:[{id:'new-id'}]})})})})};
  const caller={rpc:async()=>({error:null})};
  const envWithIntegration={...env,SUPABASE_URL:'https://outro.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'old-secret',QA32_SUPABASE_URL:'https://qa32.supabase.co',QA32_SUPABASE_SERVICE_ROLE_KEY:'qa32-secret'};
  const handler=makeCreateUserHandler({env:envWithIntegration,clientFactory:(url,key)=>{used.push([url,key]);return key==='qa32-secret'?service:caller;}});
  const response={setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
  await handler({method:'POST',headers:{authorization:'Bearer token',host:'qa.example.com',origin:'https://qa.example.com'},body:form},response);
  expect(response.code).toBe(201);
  expect(used[0]).toEqual(['https://qa32.supabase.co','qa32-secret']);
  expect(used[1]).toEqual(['https://qa32.supabase.co','public-test']);
 });
});
