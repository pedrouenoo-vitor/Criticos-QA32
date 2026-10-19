# QA32 V2 — publicação segura no GitHub e Vercel

## 1. Antes de atualizar
- Exporte os registros do QA32 e mantenha uma cópia do repositório atual.
- Se disponível, faça backup do Supabase. **Não execute `supabase/schema.sql` no banco existente.**
- Esta entrega contém código; não executa alterações no seu Supabase, GitHub ou Vercel automaticamente.

## 2. Banco Supabase existente
1. No SQL Editor do **mesmo projeto** usado pelo QA32 atual, execute `supabase/migrations/002_admin_productivity.sql`.
2. No arquivo `supabase/003_primeiro_administrador.sql`, substitua o e-mail de exemplo pelo e-mail do login existente e execute no SQL Editor.
3. Confirme que os registros antigos permanecem na tabela `qa_items`.

## 3. GitHub
1. Extraia este ZIP e abra a pasta `qa32_v2`.
2. Envie **o conteúdo da pasta** para a raiz do repositório `Criticos-QA32` (o `package.json` deve ficar na raiz do repositório, não dentro de outra pasta).
3. Preserve o histórico do GitHub; faça commit das mudanças na branch conectada à Vercel.
4. Não envie `.env.local`, `node_modules`, `dist`, senhas ou dados pessoais.

## 4. Vercel
- Framework Preset: Vite
- Root Directory: raiz com `package.json`, `api` e `vercel.json`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: versão 22 ou superior compatível com Vite 7

Variáveis de ambiente de produção:
- `VITE_SUPABASE_URL`: URL do Supabase existente
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave pública publishable/anon do mesmo projeto
- `SUPABASE_SERVICE_ROLE_KEY`: **chave secreta**, somente no ambiente servidor da Vercel; nunca usar prefixo `VITE_`

Após configurar, publique um novo deployment e abra o endereço atual. O endpoint `api/admin/users.js` deve ser servido como Vercel Function.

## 5. Validação funcional
- Entre novamente no sistema como administrador.
- Confira quantidades da base anterior, o card de liberados, percentuais e modo escuro.
- Teste recolher/expandir menu, criação de operador e atribuição de item.
- Libere um item com operador de teste e confirme produtividade no administrador.
- Exporte o XLSX gerencial e use Imprimir / Salvar como PDF.

## 6. Testes locais
```bash
npm ci
npm test
npm run build
```
Para testar as Vercel Functions localmente, use `npx vercel dev` em um ambiente de teste.

**Observação de validação desta cópia:** a instalação de dependências não foi concluída neste ambiente de preparação; portanto, não é correto afirmar que os testes e o build foram executados com sucesso nesta revisão. O arquivo `VALIDACAO.md` descreve testes informados pela entrega original em 17/10/2026, não uma nova execução.
