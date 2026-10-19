# Atualizar o QA32 funcionando para a V2

Você vai atualizar **o mesmo projeto Supabase, repositório GitHub e site Vercel**. Não é necessário importar a planilha novamente. Esta entrega é um pacote de atualização; ainda não foi aplicada na sua conta nem publicada no seu site.

## 1. Antes de começar

No aplicativo atual, exporte a base completa em Ajuda. Guarde também o código atual do GitHub. Se seu plano Supabase oferecer backup do banco, faça um backup antes da migração. A exportação dos itens não substitui um backup de usuários e histórico.

## 2. Atualizar o banco, preservando os itens

1. Extraia este ZIP.
2. Abra `qa32_v2/supabase/migrations/002_admin_productivity.sql` no VS Code ou Bloco de Notas.
3. Use **Ctrl+A → Ctrl+C** para copiar tudo.
4. No **mesmo projeto Supabase que o site usa**, abra **SQL Editor → New query**.
5. Cole e clique em **Run**. Espere **Success. No rows returned**.

**Não execute `schema.sql` no banco que já está funcionando.** Esse arquivo é a instalação base para um banco novo. Para sua atualização, use somente a migração **002** e o passo seguinte.

A migração 002 acrescenta perfis, configurações e registros de liberação, mantém a tabela `qa_items` e o histórico existente, e atualiza as regras de acesso. Pode ser executada novamente sem zerar itens ou restaurar configurações antigas. Se aparecer erro, não apague tabelas: copie o texto completo e peça diagnóstico antes de continuar.

## 3. Tornar seu login administrador

1. Abra `supabase/003_primeiro_administrador.sql`.
2. Substitua **somente** `SUBSTITUA_PELO_SEU_EMAIL` pelo e-mail com que você já entra no aplicativo. Mantenha as aspas.
3. Copie o código inteiro, cole em outra consulta do SQL Editor e clique em **Run**.

Este passo altera o perfil do seu login existente. Não cria outra conta nem muda a senha. Só o SQL Editor/servidor pode conceder o primeiro perfil administrativo; não há promoção automática de quem entrar primeiro.

## 4. Configurar a criação de usuários na Vercel

As duas variáveis que você já cadastrou permanecem:

| Key na Vercel | Tipo | Valor |
|---|---|---|
| `VITE_SUPABASE_URL` | Config | URL atual do seu projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Config | Sua chave pública publishable ou anon |
| **`SUPABASE_SERVICE_ROLE_KEY`** | **Secret** | Chave administrativa do mesmo projeto Supabase |

1. No Supabase, abra **Project Settings → API Keys**.
2. Copie a chave administrativa **secret** (iniciada por `sb_secret_`) ou a antiga **service_role**, conforme disponível no projeto. Essa chave deve permanecer somente no servidor.
3. Na Vercel, abra o projeto → **Settings → Environment Variables → Add Environment Variable**.
4. Em **Key**, coloque exatamente **`SUPABASE_SERVICE_ROLE_KEY`**, **sem `VITE_`**.
5. Selecione **Secret**, cole a chave em Value e selecione **Production**.
6. Salve. Não coloque essa chave no código, em arquivo público, no GitHub ou em mensagem.

A Function `/api/admin/users` usa a chave só no servidor, valida o token do usuário e exige perfil de administrador ativo. O frontend não acessa a chave. Há um limite de dez tentativas de criação por administrador a cada hora.

Se quiser usar Preview, utilize preferencialmente um Supabase de teste separado. Não cadastre a chave de produção em previews de código não revisado.

## 5. Atualizar o código do GitHub e publicar

1. Abra o repositório já conectado à Vercel.
2. Substitua os arquivos da versão anterior pelo **conteúdo de `qa32_v2`**, mantendo `package.json` na mesma raiz usada antes.
3. Inclua as pastas novas **`api`**, **`server`**, **`scripts`**, **`src/components`** e **`supabase/migrations`**. Inclua também `package-lock.json` atualizado.
4. Não envie `node_modules`, `dist`, `.env.local` nem `dados_originais`.
5. Faça commit/push para a branch de produção. Se não houver deploy automático, use **Deployments → Redeploy**.
6. Aguarde **Ready** e abra seu endereço atual. Use **Ctrl+Shift+R**.
7. Saia e entre novamente com seu login. A aba **Administrador** deverá aparecer.

Não é necessário trocar o endereço do site nem recriar o projeto Supabase. Os registros existentes devem continuar na fila, com as novas colunas e recursos disponíveis.

## 6. Conferir a V2

- Confira se a quantidade de itens continua correta.
- Na lateral, clique no botão **Recolher menu lateral**; clique no ícone para expandir.
- No topo, use o ícone da **lua** para ativar o modo escuro e o **sol** para voltar.
- Confira o quinto card: **ITENS LIBERADOS**, que tem contagem própria mesmo quando a fila está filtrada para pendentes.
- Em **Administrador → Usuários**, ajuste seu nome de exibição e crie uma conta de teste de operador.
- Para atribuir trabalho ao novo operador, abra o lápis de um item pendente e selecione **Atribuir inspeção a**. Ele verá os próprios itens e os que lhe foram atribuídos.
- Entre como operador em outro navegador/computador, abra o item e registre sua data de liberação.
- No administrador, clique em Atualizar e confira **Produtividade**. O responsável será o usuário que confirmou a liberação, e não o proprietário do lote.
- Gere o **Relatório XLSX** e teste **Imprimir / PDF**. O PDF é salvo pelo diálogo de impressão do navegador.

## 7. Ajustar os percentuais dos cards

Em **Administrador → Indicadores**, altere **Dias de comparação dos cards**, inicialmente **15**. O valor permitido é de 1 a 365 dias. O cálculo compara a quantidade atual com a posição registrada no final da data de referência anterior.

Você ajusta a **janela de dias**, não o percentual diretamente. A fórmula é `(atual − anterior) ÷ anterior × 100`. Por exemplo, 12 atrasados hoje e 10 na data anterior = **+20%**. Menos atrasados é uma melhora; mais liberados é uma melhora. Os demais cards mostram apenas a direção da mudança.

O histórico só começa quando os registros entraram no aplicativo. Se você importou ontem, ainda não há uma posição registrada de 15 dias atrás. O card mostra **Sem base**, sem inventar dados históricos. Ajuste para uma janela com dados disponíveis ou aguarde formar histórico. Uma base anterior com zero e valor atual maior que zero também resulta em Sem base, pois não existe percentual finito.

Também é possível alterar a janela de atenção entre 1 e 30 dias; isso não muda o deadline gravado de nenhum lote.

## 8. O que acontece com liberações antigas

Elas permanecem salvas. Como a V1 usava um nome textual, a migração preserva esse nome e identifica os registros como **Histórico sem vínculo**. Não atribui esses lotes ao dono da conta por suposição.

As novas liberações V2 vinculam o ID do usuário autenticado e o nome de exibição no momento da liberação. Para corrigir quantidade, datas, lote ou autoria de um item já liberado, reabra o item antes. Reabrir anula o ciclo anterior no relatório, preserva a auditoria e permite um novo ciclo de liberação. Excluir o item não apaga a produtividade já registrada.

## 9. Se algo não funcionar

| Situação | O que conferir |
|---|---|
| Erro dizendo banco não atualizado | Execute a migração 002 no mesmo projeto da URL configurada na Vercel. |
| Aba Administrador não aparece | Execute 003 com o e-mail correto e entre novamente. |
| Criar usuário retorna erro de configuração | Confira `SUPABASE_SERVICE_ROLE_KEY` como Secret e faça novo deploy. |
| Function administrativa não disponível | Confira se a pasta `api/admin/users.js` foi enviada e o Root Directory aponta à raiz com package.json e api. |
| Erro ao criar usuário com e-mail já usado | Use Gerenciar na conta existente; não repita o cadastro. |
| Usuário não vê itens de outro dono | O administrador deve atribuir o item a ele. |
| Usuário desativado ainda tem tela aberta | Ele perde acesso nas próximas consultas/gravações; o botão Atualizar valida o perfil. Dados já vistos não podem ser retirados da memória do navegador. |
| Percentual mostra Sem base | Ainda não existe histórico suficiente, ou a base anterior era zero. |
| Último administrador não pode ser rebaixado | É uma proteção: mantenha pelo menos um administrador ativo. |

Se precisar voltar a interface anterior, restaure o commit V1 no GitHub. **Não remova as novas tabelas/colunas.** Como a V2 muda atribuição/autoria e acesso, a reversão completa deve ser planejada com backup; não há migração destrutiva automática de retorno.
