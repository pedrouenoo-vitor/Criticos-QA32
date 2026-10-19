-- Executar uma vez em um projeto Supabase novo, pelo SQL Editor.
-- Não apaga dados. Transação impede instalação incompleta.
begin;
create table public.qa_items (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 lot text not null check(length(trim(lot))>0),
 material text not null check(length(trim(material))>0),
 description text not null default '', supplier text not null default '',
 quantity numeric not null check(quantity>=0 and quantity<1e20),
 unit text not null default 'PC',
 received_at date not null,
 deadline date,
 released_at date,
 responsible text not null default '', notes text not null default '',
 mrp_level text not null default '', sap_status text not null default '',
 stock numeric, safety_stock numeric, coverage_days numeric,
 version bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,lot,material),
 check(deadline is null or deadline>=received_at),
 check(released_at is null or (released_at>=received_at and length(trim(responsible))>0))
);
create index qa_items_owner_deadline_idx on public.qa_items(owner_id,deadline);
alter table public.qa_items enable row level security;
create policy own_select on public.qa_items for select to authenticated using ((select auth.uid())=owner_id);
create policy own_insert on public.qa_items for insert to authenticated with check ((select auth.uid())=owner_id);
create policy own_update on public.qa_items for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy own_delete on public.qa_items for delete to authenticated using ((select auth.uid())=owner_id);
revoke all on public.qa_items from anon;
grant select,insert,update,delete on public.qa_items to authenticated;

create table public.qa_history (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 item_id uuid not null,
 operation text not null check(operation in ('INSERT','UPDATE','DELETE')),
 old_record jsonb, new_record jsonb,
 changed_at timestamptz not null default now()
);
create index qa_history_owner_time_idx on public.qa_history(owner_id,changed_at desc);
alter table public.qa_history enable row level security;
create policy own_history on public.qa_history for select to authenticated using ((select auth.uid())=owner_id);
revoke all on public.qa_history from anon,authenticated;
grant select on public.qa_history to authenticated;

create function public.qa_before_write() returns trigger language plpgsql set search_path='' as $$
begin
 if NEW.released_at > (now() at time zone 'America/Sao_Paulo')::date then
  raise exception 'A data de liberação não pode estar no futuro';
 end if;
 if TG_OP='UPDATE' then
  if NEW.owner_id<>OLD.owner_id or NEW.id<>OLD.id then raise exception 'Identidade do registro é imutável'; end if;
  NEW.version=OLD.version+1; NEW.created_at=OLD.created_at;
 else NEW.version=1; NEW.created_at=now(); end if;
 NEW.updated_at=now();return NEW;
end;$$;
create trigger qa_before_write before insert or update on public.qa_items for each row execute function public.qa_before_write();

create function public.qa_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' then
  insert into public.qa_history(owner_id,item_id,operation,old_record) values(OLD.owner_id,OLD.id,TG_OP,to_jsonb(OLD));
  return OLD;
 elsif TG_OP='INSERT' then
  insert into public.qa_history(owner_id,item_id,operation,new_record) values(NEW.owner_id,NEW.id,TG_OP,to_jsonb(NEW));
 else
  insert into public.qa_history(owner_id,item_id,operation,old_record,new_record) values(NEW.owner_id,NEW.id,TG_OP,to_jsonb(OLD),to_jsonb(NEW));
 end if;
 return NEW;
end;$$;
create trigger qa_audit after insert or update or delete on public.qa_items for each row execute function public.qa_audit();
revoke all on function public.qa_audit() from public,anon,authenticated;
revoke all on function public.qa_before_write() from public,anon,authenticated;
commit;
