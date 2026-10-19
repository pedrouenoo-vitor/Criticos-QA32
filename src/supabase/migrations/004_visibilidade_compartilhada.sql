-- QA32 V2.2: leitura compartilhada; escrita exclusiva ao proprietário ou admin.
-- Aplicar somente DEPOIS da migração 002, no banco existente. Não recria tabelas.
begin;
-- Substituir políticas anteriores para não deixar permissões aditivas de UPDATE.
drop policy if exists own_select on public.qa_items;
drop policy if exists own_update on public.qa_items;
drop policy if exists own_history on public.qa_history;
drop policy if exists releases_read on public.qa_releases;
create policy own_select on public.qa_items for select to authenticated
 using ((select public.qa_is_active()));
create policy own_update on public.qa_items for update to authenticated
 using ((select public.qa_is_active()) and (owner_id=(select auth.uid()) or (select public.qa_is_admin())))
 with check ((select public.qa_is_active()) and (owner_id=(select auth.uid()) or (select public.qa_is_admin())));
create policy own_history on public.qa_history for select to authenticated
 using ((select public.qa_is_active()));
create policy releases_read on public.qa_releases for select to authenticated
 using ((select public.qa_is_active()));
-- Impedir importação de linhas já liberadas por operadores via API direta.
-- A importação em lote de registros ainda pendentes é controlada na interface,
-- mas o banco não distingue um lote de vários cadastros individuais.
create or replace function public.qa_v22_insert_guard() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.qa_is_active() then
   raise exception 'Usuário ativo necessário';
 end if;
 if not public.qa_is_admin() and NEW.released_at is not null then
   raise exception 'Somente administrador pode importar itens previamente liberados';
 end if;
 return NEW;
end;$$;
revoke all on function public.qa_v22_insert_guard() from public,anon,authenticated;
drop trigger if exists qa_v22_insert_guard on public.qa_items;
create trigger qa_v22_insert_guard before insert on public.qa_items
 for each row execute function public.qa_v22_insert_guard();
commit;
