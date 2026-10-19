import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./check-env.mjs',import.meta.url));
it('impede chaves secret/service_role no build público sem revelar valores',()=>{
 for(const key of ['sb_secret_TESTE_NAO_REAL','e30.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.fake']) {
  const run=spawnSync(process.execPath,[script],{env:{...process.env,VITE_SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:key},encoding:'utf8'});
  expect(run.status).toBe(1);expect(run.stderr).not.toContain(key);
 }
});
it('permite chave pública no build',()=>{
 const run=spawnSync(process.execPath,[script],{env:{...process.env,VITE_SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_TESTE_NAO_REAL'},encoding:'utf8'});
 expect(run.status).toBe(0);
});
