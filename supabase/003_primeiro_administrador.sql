-- Execute somente no SQL Editor do Supabase, após a migração 002.
-- Substitua o e-mail abaixo pelo seu login JÁ EXISTENTE.
-- Este script não cria uma conta nem altera senhas.
do $$
declare target_id uuid;
begin
 select id into target_id from auth.users where lower(email)=lower('SUBSTITUA_PELO_SEU_EMAIL');
 if target_id is null then raise exception 'E-mail não encontrado. Substitua o e-mail no script pelo seu login existente.'; end if;
 update public.qa_profiles set role='admin',active=true where id=target_id;
 if not found then raise exception 'Perfil não encontrado. Execute a migração 002 primeiro.'; end if;
end;$$;
