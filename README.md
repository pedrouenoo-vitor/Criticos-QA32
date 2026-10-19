# QA32 V2 — Administração, produtividade e indicadores

Aplicativo React/Vite para Vercel, Supabase Auth + PostgreSQL, XLSX e relatórios gerenciais. Evolução do projeto QA32 já entregue. O código e a migração estão preparados; sua implantação existente ainda não foi alterada nesta entrega.

**Já tem o aplicativo funcionando? Comece por [ATUALIZAR_PARA_V2.md](ATUALIZAR_PARA_V2.md).** Não execute o schema de instalação inicial sobre o banco atual e não reimporte os lotes já salvos.

## Recursos da V2

- Área Administrador protegida pelo banco e pela Function do servidor.
- Criação de usuários no Supabase Auth, perfis administrador/operador e ativação/desativação de acesso.
- Proteção contra rebaixar ou desativar o último administrador ativo.
- Atribuição de itens a operadores, mantendo o proprietário original.
- Produtividade por responsável: lotes, quantidades por unidade, dias com liberação, média diária, prazo médio e SLA.
- Ranking, tendência diária e filtros por data e responsável, incluindo contas sem liberações.
- Relatório gerencial XLSX com cinco abas e impressão para PDF pelo navegador.
- Registro de cada ciclo de liberação e autoria autenticada. Histórico V1 preservado sem autoria presumida.
- Cinco cards: atrasados, vence hoje, atenção, em dia e liberados; percentual de variação por janela ajustável no administrador, inicialmente 15 dias.
- Menu lateral recolhível e modo claro/escuro com preferências guardadas neste navegador.
- Cadastro, edição, importação dos 106 lotes originais, exportação XLSX, filtros e auditoria da versão anterior.

## Instalação em um Supabase NOVO

1. Crie o projeto e execute **`supabase/schema.sql`** uma vez.
2. Execute **`supabase/migrations/002_admin_productivity.sql`**.
3. Crie seu usuário inicial em Authentication → Users.
4. Ajuste seu e-mail em **`supabase/003_primeiro_administrador.sql`** e execute esse script no SQL Editor.
5. Cadastre as variáveis da tabela abaixo na Vercel e publique o código.
6. Entre no aplicativo e importe `dados_originais/CRITICOS QA32.XLSX` se estiver começando sem dados.

Em banco EXISTENTE, execute apenas a migração 002 e a promoção do administrador 003, conforme o guia de atualização.

## Variáveis

| Variável | Onde usar | Tipo |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend/build | Config, URL do projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend/build | Config, chave publishable/anon |
| `SUPABASE_SERVICE_ROLE_KEY` | SOMENTE Function Node do servidor | Secret, chave administrativa secret/service_role |
| `SUPABASE_URL` | Servidor, opcional | Mesma URL; se ausente, usa VITE_SUPABASE_URL |
| `APP_ORIGIN` | Servidor, opcional | Domínio definitivo, sem caminho; se ausente, compara origem com o host da requisição |

Nunca coloque chave administrativa em variáveis `VITE_*`. O build bloqueia uma chave `sb_secret_` ou JWT service_role usada acidentalmente como chave pública. O segredo real fica só em `SUPABASE_SERVICE_ROLE_KEY`, sem prefixo VITE.

Se o projeto usa apenas contas administradas, desabilite a criação pública de contas nas opções de Authentication. A interface não oferece cadastro aberto. A API de criação verifica o JWT no Supabase, consulta o perfil ativo, valida os campos e aplica limite de dez tentativas por administrador/hora antes de criar uma conta. A senha inicial é escolhida pelo administrador e não é retornada nem gravada na auditoria. Cada usuário pode alterá-la em **Minha conta**; a troca inicial é recomendada, mas não é forçada nesta versão.

## Desenvolvimento e testes

Use Node.js **22 ou 24**. Instale com `npm ci` a partir desta pasta. Crie `.env.local` copiando `.env.example` e preencha com seu ambiente de teste.

```powershell
npm ci
npm run dev
```

Vite executa a interface local. Para testar também `/api/admin/users`, use **`npx vercel dev`**, que executa as Vercel Functions, ou publique em um ambiente de teste da Vercel. O servidor Vite simples não executa o código da pasta api.

```powershell
npm test
npm run build
```

Os testes de SQL usam PostgreSQL PGlite local; não acessam seu Supabase. Os testes React usam DOM simulado. Os testes da Function simulam Auth/API para validar autorização e tratamento de erros. O teste de 106 lotes usa o arquivo original incluso em `dados_originais`; no GitHub ele fica fora do repositório e esse teste é ignorado quando o arquivo não está presente.

## Vercel / GitHub

- Framework: **Vite**.
- Root Directory: pasta com `package.json`, `api` e `vercel.json`.
- Build: `npm run build`.
- Output: `dist`.
- Node: 22/24.
- Envie código, `api`, `server`, `scripts`, migrações e `package-lock.json`.
- Não envie `.env.local`, `node_modules`, `dist` ou arquivos reais de `dados_originais`.
- Depois de mudar variáveis, gere um novo deployment.

O segredo é usado pela Vercel Function, sem servidor Python ou processo separado. O banco permanece no Supabase. Custos, limites e disponibilidade são os dos serviços contratados; não foram contratados novos serviços nesta entrega.

## Permissões e dados

| Operação | Operador ativo | Administrador ativo |
|---|---|---|
| Consultar/editar/liberar | Próprios itens e itens atribuídos | Todos os itens |
| Excluir | Somente próprios itens | Todos os itens |
| Atribuir inspeção | Não | Sim |
| Gerenciar usuários/configurações | Não | Sim |
| Produtividade consolidada | Não | Sim |

A autorização é aplicada por RLS e gatilhos, não apenas ocultando botões. Um usuário não pode promover seu perfil pela API. Desativar um perfil bloqueia futuras leituras/gravações; isso não apaga dados que ele já tenha consultado. Administradores consultam todos os dados deste projeto; esta versão é para uma organização por projeto Supabase, sem multiempresa.

O proprietário de um item permanece imutável. A atribuição dá ao operador acesso à inspeção daquele item. A autoria de uma nova liberação é o usuário conectado, gravada pelo banco, sem aceitar um ID forjado pelo cliente. Data de liberação retroativa é permitida se posterior ao recebimento; o histórico mantém também a data real da gravação. O relatório usa a data de liberação informada.

`qa_releases` preserva a produção de itens excluídos. Reabrir anula o ciclo anterior nos indicadores; liberar novamente cria um ciclo válido. Correções de quantidades/datas exigem reabertura. O histórico preserva as alterações. Por rastreabilidade, não há exclusão de contas na interface; use desativação. A exclusão administrativa direta de usuários com registros de liberação pode ser impedida por vínculos do banco.

Registros antigos com data de liberação são migrados como históricos, preservando o responsável textual e deixando o vínculo autenticado vazio. Importar uma planilha com liberações já concluídas segue a mesma regra. Nenhuma migração atribui produtividade antiga ao dono da conta sem evidência.

## Metodologia

- Cards: quantidade atual versus quantidade na posição registrada ao final de N dias atrás; padrão 15. O histórico da auditoria reconstrói a posição passada. Dias sem histórico não são inventados; base anterior inexistente ou zero resulta em Sem base quando não há percentual finito.
- Os cards respeitam busca e fornecedor. A seleção de status afeta somente a fila, para que o card de liberados continue visível e útil.
- Produtividade: ciclos válidos pela data de liberação, filtrados pelo período. Comparação com período imediatamente anterior de mesma duração.
- SLA: lotes liberados até o deadline / lotes liberados com deadline. Sem deadline fica fora do denominador.
- Tempo médio: dias corridos do recebimento à liberação. Média diária: lotes / todos os dias corridos do intervalo, incluindo zeros.
- Quantidade: somada separadamente por unidade; nunca soma PC com KG.
- Prazos e referência diária usam São Paulo e dias corridos. A data da tela é atualizada a cada minuto; o botão Atualizar busca mudanças de outros acessos.

Configurações são globais ao projeto e persistem no Supabase. Tema e menu são preferências locais do navegador. A aplicação não usa Realtime: atualize a tela para consultar mudanças de outras pessoas.

## Relatório gerencial

Em Administrador → Produtividade, selecione datas e responsável. **Relatório XLSX** gera Resumo, Produtividade, Liberacoes, Tendencia e Metodologia. **Imprimir / PDF** abre um documento formatado para A4 paisagem; escolha Salvar como PDF no diálogo do navegador. Permita o popup do relatório, se necessário.

Máximo de 367 dias por relatório na interface. Importações têm limite de 15 MB e 500 registros por vez. Consultas são paginadas na API, mas itens/histórico/liberações acessíveis são carregados em memória: bases muito grandes precisam de agregações e filtros no servidor. O histórico e o livro de liberações não substituem backups do banco. Configure backups no seu plano e mantenha exportações externas.

## Estrutura

`src/App.jsx`: telas principais. `src/components/Admin.jsx`: administração e relatórios. `ItemModal.jsx`: edição/liberação. `analytics.js`: indicadores e reconstrução histórica. `reports.js`: XLSX e impressão. `workspace.js`: configurações/perfis/consultas. `db.js`: CRUD. `server/admin-users.js`: autenticação e criação no servidor. `api/admin/users.js`: entrada da Function. `supabase/migrations/002_admin_productivity.sql`: atualização sem apagar itens.

Veja **VALIDACAO.md** para resultados e limites. Fontes técnicas: documentação oficial Supabase Auth Admin/RLS e Vercel Functions.
