// Impede publicar uma chave administrativa no JavaScript do navegador.
const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
let role='';
try{role=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role||'';}catch{}
if(key.startsWith('sb_secret_')||role==='service_role') {
  console.error('Build interrompido: VITE_SUPABASE_PUBLISHABLE_KEY deve ser publishable/anon. A chave administrativa pertence somente a SUPABASE_SERVICE_ROLE_KEY, sem VITE_.');
  process.exit(1);
}
if(!process.env.VITE_SUPABASE_URL||!key) console.warn('Sem variáveis públicas: este build exibirá a tela de configuração. Cadastre as variáveis na Vercel e gere novo deploy.');
