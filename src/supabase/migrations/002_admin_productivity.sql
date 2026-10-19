-- QA32 V2: executar APÓS o schema.sql da V1. Não apaga nem recria os itens.
-- Pode ser executado novamente: não redefine administradores nem configurações.
begin;

create table if not exists public.qa_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 1 and 120),
 email text not null,
 role text not null default 'operator' check(role in ('operator','admin')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.qa_profiles enable row level security;

create or replace function public.qa_is_active() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.qa_profiles p where p.id=(select auth.uid()) and p.active);
$$;
create or replace function public.qa_is_admin() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.qa_profiles p where p.id=(select auth.uid()) and p.role='admin' and p.active);
$$;
revoke all on function public.qa_is_active(), public.qa_is_admin() from public,anon;
grant execute on function public.qa_is_active(), public.qa_is_admin() to authenticated;

insert into public.qa_profiles(id,display_name,email)
 select id,coalesce(nullif(left(trim(raw_user_meta_data->>'display_name'),120),''),split_part(email,'@',1),'Usuário'),coalesce(email,'')
 from auth.users on conflict(id) do nothing;

create or replace function public.qa_new_user() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 insert into public.qa_profiles(id,display_name,email)
 values(NEW.id,coalesce(nullif(left(trim(NEW.raw_user_meta_data->>'display_name'),120),''),nullif(split_part(NEW.email,'@',1),''),'Usuário'),coalesce(NEW.email,''))
 on conflict(id) do nothing;
 return NEW;
end;$$;
drop trigger if exists qa_new_user on auth.users;
create trigger qa_new_user after insert on auth.users for each row execute function public.qa_new_user();
revoke all on function public.qa_new_user() from public,anon,authenticated;

-- Serializa mudanças de perfil e impede desativar/rebaixar o último administrador.
create or replace function public.qa_guard_profile() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(87320217);
 if NEW.id<>OLD.id then raise exception 'ID do perfil é imutável'; end if;
 NEW.created_at=OLD.created_at;
 if OLD.role='admin' and OLD.active and (NEW.role<>'admin' or not NEW.active) then
  if not exists(select 1 from public.qa_profiles where role='admin' and active and id<>OLD.id) then
   raise exception 'É necessário manter pelo menos um administrador ativo';
  end if;
 end if;
 return NEW;
end;$$;
drop trigger if exists qa_guard_profile on public.qa_profiles;
create trigger qa_guard_profile before update on public.qa_profiles for each row execute function public.qa_guard_profile();
revoke all on function public.qa_guard_profile() from public,anon,authenticated;

drop policy if exists profiles_read on public.qa_profiles;
create policy profiles_read on public.qa_profiles for select to authenticated
 using(id=(select auth.uid()) or (select public.qa_is_admin()));
drop policy if exists profiles_admin_update on public.qa_profiles;
create policy profiles_admin_update on public.qa_profiles for update to authenticated
 using((select public.qa_is_admin())) with check((select public.qa_is_admin()));
revoke all on public.qa_profiles from anon,authenticated;
grant select on public.qa_profiles to authenticated;
grant update(display_name,role,active) on public.qa_profiles to authenticated;
grant all on public.qa_profiles to service_role;

create table if not exists public.qa_settings (
 id integer primary key check(id=1),
 comparison_days integer not null default 15 check(comparison_days between 1 and 365),
 attention_days integer not null default 2 check(attention_days between 1 and 30),
 version bigint not null default 1,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null
);
insert into public.qa_settings(id) values(1) on conflict(id) do nothing;
alter table public.qa_settings enable row level security;
drop policy if exists settings_read on public.qa_settings;
create policy settings_read on public.qa_settings for select to authenticated using((select public.qa_is_active()));
drop policy if exists settings_write on public.qa_settings;
create policy settings_write on public.qa_settings for update to authenticated using((select public.qa_is_admin())) with check((select public.qa_is_admin()));
revoke all on public.qa_settings from anon,authenticated;
grant select on public.qa_settings to authenticated;
grant update(comparison_days,attention_days) on public.qa_settings to authenticated;
create or replace function public.qa_settings_version() returns trigger language plpgsql set search_path='' as $$
begin NEW.version=OLD.version+1; NEW.updated_at=now(); NEW.updated_by=auth.uid(); return NEW; end;$$;
drop trigger if exists qa_settings_version on public.qa_settings;
create trigger qa_settings_version before update on public.qa_settings for each row execute function public.qa_settings_version();
revoke all on function public.qa_settings_version() from public,anon,authenticated;

alter table public.qa_items add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.qa_items add column if not exists released_by uuid references auth.users(id) on delete set null;
alter table public.qa_history add column if not exists actor_id uuid references auth.users(id) on delete set null;

create table if not exists public.qa_releases (
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null, -- sem FK ao item: exclusão não apaga produtividade
 owner_id uuid not null references auth.users(id) on delete restrict,
 actor_id uuid references auth.users(id) on delete set null,
 actor_name text not null,
 lot text not null, material text not null, description text not null,
 quantity numeric not null, unit text not null,
 received_on date not null, deadline_on date, released_on date not null,
 legacy boolean not null default false,
 recorded_at timestamptz not null default now(),
 voided_at timestamptz, voided_by uuid references auth.users(id) on delete set null
);
create unique index if not exists qa_releases_active_item on public.qa_releases(item_id) where voided_at is null;
create index if not exists qa_releases_date_actor on public.qa_releases(released_on,actor_id);
alter table public.qa_releases enable row level security;
drop policy if exists releases_read on public.qa_releases;
create policy releases_read on public.qa_releases for select to authenticated
 using((select public.qa_is_active()) and (owner_id=(select auth.uid()) or actor_id=(select auth.uid()) or (select public.qa_is_admin())));
revoke all on public.qa_releases from anon,authenticated;
grant select on public.qa_releases to authenticated;

-- Migração conservadora: autoria de liberações antigas não é deduzida do dono.
insert into public.qa_releases(item_id,owner_id,actor_name,lot,material,description,quantity,unit,received_on,deadline_on,released_on,legacy)
 select i.id,i.owner_id,coalesce(nullif(trim(i.responsible),''),'Histórico sem responsável'),i.lot,i.material,i.description,i.quantity,i.unit,i.received_at,i.deadline,i.released_at,true
 from public.qa_items i where i.released_at is not null
 and not exists(select 1 from public.qa_releases r where r.item_id=i.id);

drop policy if exists own_select on public.qa_items;
drop policy if exists own_insert on public.qa_items;
drop policy if exists own_update on public.qa_items;
drop policy if exists own_delete on public.qa_items;
create policy own_select on public.qa_items for select to authenticated using
 ((select public.qa_is_active()) and (owner_id=(select auth.uid()) or assigned_to=(select auth.uid()) or (select public.qa_is_admin())));
create policy own_insert on public.qa_items for insert to authenticated with check
 ((select public.qa_is_active()) and owner_id=(select auth.uid()));
create policy own_update on public.qa_items for update to authenticated using
 ((select public.qa_is_active()) and (owner_id=(select auth.uid()) or assigned_to=(select auth.uid()) or (select public.qa_is_admin()))) with check
 ((select public.qa_is_active()) and (owner_id=(select auth.uid()) or assigned_to=(select auth.uid()) or (select public.qa_is_admin())));
create policy own_delete on public.qa_items for delete to authenticated using
 ((select public.qa_is_active()) and (owner_id=(select auth.uid()) or (select public.qa_is_admin())));
drop policy if exists own_history on public.qa_history;
create policy own_history on public.qa_history for select to authenticated using
 ((select public.qa_is_active()) and (owner_id=(select auth.uid()) or (select public.qa_is_admin()) or exists(select 1 from public.qa_items i where i.id=item_id and i.assigned_to=(select auth.uid()))));

create or replace function public.qa_before_write() returns trigger
 language plpgsql security definer set search_path='' as $$
declare profile_name text;
begin
 if NEW.released_at > (now() at time zone 'America/Sao_Paulo')::date then
  raise exception 'A data de liberação não pode estar no futuro';
 end if;
 if TG_OP='UPDATE' then
  if NEW.assigned_to is distinct from OLD.assigned_to and not public.qa_is_admin() then raise exception 'Apenas administrador pode atribuir responsáveis'; end if;
  if NEW.owner_id<>OLD.owner_id or NEW.id<>OLD.id then raise exception 'Identidade do registro é imutável'; end if;
  if OLD.released_at is not null and NEW.released_at is not null then
   if NEW.quantity is distinct from OLD.quantity or NEW.unit is distinct from OLD.unit
    or NEW.received_at is distinct from OLD.received_at or NEW.deadline is distinct from OLD.deadline
    or NEW.released_at is distinct from OLD.released_at or NEW.released_by is distinct from OLD.released_by
    or NEW.responsible is distinct from OLD.responsible or NEW.lot is distinct from OLD.lot
    or NEW.material is distinct from OLD.material then
    raise exception 'Reabra o item antes de corrigir quantidade, prazo ou liberação';
   end if;
  elsif OLD.released_at is null and NEW.released_at is not null then
   select display_name into profile_name from public.qa_profiles where id=auth.uid() and active;
   if profile_name is null then raise exception 'A liberação exige um usuário ativo'; end if;
   NEW.released_by=auth.uid(); NEW.responsible=profile_name;
  elsif NEW.released_at is null then
   NEW.released_by=null;
  end if;
  NEW.version=OLD.version+1; NEW.created_at=OLD.created_at;
 else
  -- INSERT com liberação já preenchida é dado histórico importado/cadastrado.
  if NEW.assigned_to is not null and not public.qa_is_admin() then raise exception 'Apenas administrador pode atribuir responsáveis'; end if;
  NEW.released_by=null; NEW.version=1; NEW.created_at=now();
 end if;
 NEW.updated_at=now();return NEW;
end;$$;
revoke all on function public.qa_before_write() from public,anon,authenticated;

create or replace function public.qa_record_release() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and OLD.released_at is not null and NEW.released_at is null then
  update public.qa_releases set voided_at=now(),voided_by=auth.uid() where item_id=NEW.id and voided_at is null;
 elsif NEW.released_at is not null then
  if TG_OP='INSERT' or OLD.released_at is null then
   insert into public.qa_releases(item_id,owner_id,actor_id,actor_name,lot,material,description,quantity,unit,received_on,deadline_on,released_on,legacy)
   values(NEW.id,NEW.owner_id,NEW.released_by,NEW.responsible,NEW.lot,NEW.material,NEW.description,NEW.quantity,NEW.unit,NEW.received_at,NEW.deadline,NEW.released_at,NEW.released_by is null);
  end if;
 end if;
 return NEW;
end;$$;
drop trigger if exists qa_record_release on public.qa_items;
create trigger qa_record_release after insert or update on public.qa_items for each row execute function public.qa_record_release();
revoke all on function public.qa_record_release() from public,anon,authenticated;

create or replace function public.qa_audit() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' then
  insert into public.qa_history(owner_id,item_id,operation,old_record,actor_id) values(OLD.owner_id,OLD.id,TG_OP,to_jsonb(OLD),auth.uid());
  return OLD;
 elsif TG_OP='INSERT' then
  insert into public.qa_history(owner_id,item_id,operation,new_record,actor_id) values(NEW.owner_id,NEW.id,TG_OP,to_jsonb(NEW),auth.uid());
 else
  insert into public.qa_history(owner_id,item_id,operation,old_record,new_record,actor_id) values(NEW.owner_id,NEW.id,TG_OP,to_jsonb(OLD),to_jsonb(NEW),auth.uid());
 end if;
 return NEW;
end;$$;
revoke all on function public.qa_audit() from public,anon,authenticated;

-- Limite persistente de criação de contas (10 tentativas por administrador/hora).
create table if not exists public.qa_user_creation_log (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now()
);
create index if not exists qa_user_creation_actor_time on public.qa_user_creation_log(actor_id,requested_at);
alter table public.qa_user_creation_log enable row level security;
revoke all on public.qa_user_creation_log from public,anon,authenticated;
create or replace function public.qa_reserve_user_creation() returns void
 language plpgsql security definer set search_path='' as $$
begin
 if not public.qa_is_admin() then raise exception 'Acesso restrito ao administrador'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.qa_user_creation_log where actor_id=auth.uid() and requested_at>now()-interval '1 hour')>=10 then
  raise exception 'Limite de 10 tentativas de criação por hora atingido';
 end if;
 insert into public.qa_user_creation_log(actor_id) values(auth.uid());
end;$$;
revoke all on function public.qa_reserve_user_creation() from public,anon;
grant execute on function public.qa_reserve_user_creation() to authenticated;
commit;
