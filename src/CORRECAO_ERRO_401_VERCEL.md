# QA32 V2 — Correção do erro 401 na criação de usuários

## Causa identificada
O frontend utiliza `VITE_SUPABASE_URL` do projeto QA32, enquanto a Function priorizava `SUPABASE_URL` da integração `supabase-emerald-tree` (outro projeto). Isso pode rejeitar o token de login com HTTP 401.

## O que foi corrigido
No arquivo `server/admin-users.js`, a Function agora prioriza `QA32_SUPABASE_URL` e `QA32_SUPABASE_SERVICE_ROLE_KEY`, mantendo compatibilidade com as configurações anteriores. O segredo não é exposto ao navegador. Foi incluído teste de regressão.

## Passo a passo na Vercel
1. Envie **o conteúdo** da pasta `qa32_v2` para a raiz do repositório GitHub (sem pasta adicional).
2. Vercel → projeto `criticos-qa-32` → Settings → Environment Variables.
3. Adicione `QA32_SUPABASE_URL` com o valor `https://zlpmhafjnvpygaqrfdam.supabase.co` em Production.
4. Adicione `QA32_SUPABASE_SERVICE_ROLE_KEY` com a chave **service_role do projeto QA32** em Production. Obtenha-a em Supabase → projeto QA32 → Project Settings → API Keys → Legacy anon, service_role API keys. Marque como sensível/secret quando possível. **Não compartilhe nem publique a chave.**
5. Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` também pertencem ao projeto QA32.
6. Faça um novo deployment da branch principal.
7. Saia e entre novamente no aplicativo; em Administrador → Usuários, teste o cadastro.
8. Se falhar, verifique Vercel → Logs → `/api/admin/users` e o código HTTP.

## Segurança e dados
Não exclua a integração antiga; não execute SQL novamente; não modifique o banco ou usuários existentes. Nunca use `VITE_` nem `NEXT_PUBLIC_` em uma chave service_role.
