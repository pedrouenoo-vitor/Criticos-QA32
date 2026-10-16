import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
it('schema PostgreSQL: CRUD, auditoria, versões e isolamento RLS',async()=>{
 const pg=new PGlite();
 try{
 await pg.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
 insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
 await pg.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 await pg.exec(`set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
 const insert=await pg.query(`insert into public.qa_items(lot,material,quantity,received_at,deadline) values('001','002',10,'2026-10-01','2026-10-16') returning id,version`);
 const id=insert.rows[0].id;expect(insert.rows[0].version).toBe(1);
 await pg.query(`update public.qa_items set description='Rebite' where id=$1 and version=1`,[id]);
 const updated=await pg.query(`select version from public.qa_items where id=$1`,[id]);expect(updated.rows[0].version).toBe(2);
 expect((await pg.query(`update public.qa_items set description='stale' where id=$1 and version=1 returning id`,[id])).rows).toHaveLength(0);
 expect((await pg.query('select * from public.qa_history')).rows).toHaveLength(2);
 await expect(pg.query(`insert into public.qa_history(owner_id,item_id,operation) values(auth.uid(),$1,'DELETE')`,[id])).rejects.toThrow();
 await pg.exec(`set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`);
 expect((await pg.query('select * from public.qa_items')).rows).toHaveLength(0);
 expect((await pg.query('select * from public.qa_history')).rows).toHaveLength(0);
 await expect(pg.query(`insert into public.qa_items(owner_id,lot,material,quantity,received_at) values('11111111-1111-4111-8111-111111111111','hack','x',1,'2026-10-01')`)).rejects.toThrow();
 expect((await pg.query(`delete from public.qa_items where id=$1 returning id`,[id])).rows).toHaveLength(0);
 await pg.exec(`set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
 await pg.query('delete from public.qa_items where id=$1',[id]);
 expect((await pg.query('select * from public.qa_history')).rows).toHaveLength(3);
 }finally{await pg.close();}
},30000);
