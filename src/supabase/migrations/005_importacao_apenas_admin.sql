-- QA32 V2.3: impedir inserções em lote por operadores no Supabase.
-- Execute após 004_visibilidade_compartilhada.sql. Não altera dados existentes.
-- Importante: o banco não consegue distinguir muitas chamadas individuais de
-- cadastro de uma importação automatizada. Para bloquear toda automação,
-- será necessária uma API controlada e limites de taxa.
begin;
create or replace function public.qa_v23_bulk_insert_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.qa_is_admin()
     and (select count(*) from inserted_qa_items) > 1 then
    raise exception 'Importação em lote permitida somente ao administrador';
  end if;
  return null;
end;
$$;
revoke all on function public.qa_v23_bulk_insert_guard() from public, anon, authenticated;
drop trigger if exists qa_v23_bulk_insert_guard on public.qa_items;
create trigger qa_v23_bulk_insert_guard
  after insert on public.qa_items
  referencing new table as inserted_qa_items
  for each statement execute function public.qa_v23_bulk_insert_guard();
commit;
