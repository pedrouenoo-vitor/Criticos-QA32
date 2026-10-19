# QA32 V2.2 — Leitura compartilhada e lançamentos individuais

1. Faça backup do banco Supabase e mantenha o ZIP anterior como rollback do código.
2. No Supabase do QA32 (`zlpmhafjnvpygaqrfdam`), abra SQL Editor → New query.
3. Abra `supabase/migrations/004_visibilidade_compartilhada.sql`, copie todo o conteúdo e execute **Run**. Não execute `schema.sql` ou `002` novamente.
4. Substitua o conteúdo da raiz do repositório GitHub pelo conteúdo deste ZIP (preserve `src/`, `api/`, `server/`, `scripts/`). Faça commit na `main`.
5. Na Vercel, publique o commit e confira que as variáveis `QA32_SUPABASE_URL` e `QA32_SUPABASE_SERVICE_ROLE_KEY` continuam corretas.
6. Teste com uma conta de operador: o painel deve mostrar os itens históricos e os de outros operadores; ao abrir item de outro usuário, apenas visualização; ao criar item próprio, deve poder editar e liberar; a opção Importar Excel não deve aparecer.
7. Teste com admin: importação Excel e gerenciamento de todos os itens devem continuar funcionando.

**Atenção:** o RLS impede UPDATE e DELETE em itens de terceiros, mesmo via API direta. A importação Excel é removida da interface dos operadores. O banco permite múltiplos INSERTs pendentes do próprio usuário, pois não consegue distinguir importação em lote de vários lançamentos individuais. Se for necessário bloquear *tecnicamente* qualquer importação por API, será necessária uma função administrativa exclusiva para importação.

Os registros anteriores são preservados. Itens antigos atribuídos a outro operador continuam pertencendo ao autor original: apenas o proprietário ou admin pode liberar.
