import {db} from './db';
function check(error) {
  if(!error) return;
  if(error.code==='PGRST205'||error.code==='42P01') throw Error('Banco ainda não atualizado. Execute a migração 002_admin_productivity.sql no mesmo projeto Supabase.');
  throw error;
}
async function paged(table,order='id') {
  let all=[],from=0;
  while(true) {
    const {data,error}=await db.from(table).select('*').order(order).range(from,from+499);
    check(error); all.push(...data);
    if(data.length<500) return all;
    from+=500;
  }
}
export async function loadProfile(id) {
  const {data,error}=await db.from('qa_profiles').select('*').eq('id',id).single();check(error);return data;
}
export async function loadWorkspace() {
  const [items,history,releases,settingsResponse]=await Promise.all([
    paged('qa_items'),paged('qa_history'),paged('qa_releases'),db.from('qa_settings').select('*').eq('id',1).single(),
  ]);
  check(settingsResponse.error);return {items,history,releases,settings:settingsResponse.data};
}
export async function loadProfiles(){return paged('qa_profiles');}
export async function saveProfile(id,patch) {
  const {data,error}=await db.from('qa_profiles').update({display_name:patch.display_name,role:patch.role,active:patch.active}).eq('id',id).select();
  check(error);if(!data.length) throw Error('Perfil não alterado. Confira sua permissão.');
}
export async function saveSettings(settings,days,attention) {
  const {data,error}=await db.from('qa_settings').update({comparison_days:days,attention_days:attention}).eq('id',1).eq('version',settings.version).select();
  check(error);if(!data.length) throw Error('As configurações foram alteradas por outra sessão. Atualize e tente novamente.');
}
export async function createUser(form) {
  const {data,error}=await db.auth.getSession();check(error);
  if(!data.session) throw Error('Sessão expirada. Entre novamente.');
  const response=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(form)});
  const result=await response.json().catch(()=>({error:'A Function administrativa não está disponível. Publique na Vercel ou use vercel dev para testar a criação de contas.'}));
  if(!response.ok) throw Error(result.error||'Não foi possível criar o usuário.');return result.user;
}
