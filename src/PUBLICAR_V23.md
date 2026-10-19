# QA32 V2.3 — Importação e exportação exclusivas do administrador

## Diagnóstico

Na V2.2, o menu de importação já era exclusivo do administrador, mas os botões **Exportar Excel** (Painel) e **Exportar base acessível** (Ajuda) eram exibidos a todos. Além disso, a RLS permitia que operadores inserissem vários itens pendentes em uma requisição.

## Instalação

1. Faça backup do Supabase e confirme que a migração `004_visibilidade_compartilhada.sql` já foi executada.
2. No SQL Editor do **mesmo projeto Supabase QA32**, execute apenas `supabase/migrations/005_importacao_apenas_admin.sql`. Se ocorrer erro, pare e envie a mensagem.
3. Atualize os arquivos do GitHub na raiz do repositório (inclusive `src/App.jsx`) e aguarde o novo deployment Vercel. Preserve as variáveis `QA32_SUPABASE_URL` e `QA32_SUPABASE_SERVICE_ROLE_KEY` que corrigiram o 401.
4. Faça login como operador e confira: nenhum botão de importação ou exportação, acesso de leitura a todos os itens e permissão de salvar/liberar somente itens próprios. Faça login como administrador e confira os dois botões de exportação, importação e produtividade.

## Limitação importante

Com acesso de leitura aos registros, um operador tecnicamente consegue copiar dados visíveis, inclusive usando ferramentas do navegador. Ocultar botões não impede cópias nem chamadas diretas à API de leitura. O SQL 005 bloqueia uma requisição que insira vários itens, mas não consegue impedir que alguém automatize várias inserções individuais. A exigência de bloqueio absoluto de exportação/importação requer mudança de arquitetura, como uma API intermediária que controla consultas e cadastros, ou redução do acesso de leitura — incompatível com a visualização compartilhada irrestrita.

Não execute `supabase/schema.sql` no banco existente.
