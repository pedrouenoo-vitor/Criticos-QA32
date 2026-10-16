# QA32 · Vercel + Supabase

Versão web do controle de qualidade, pronta para abrir no VS Code e publicar pela Vercel. Interface React/Vite, banco PostgreSQL e login Supabase, importação/exportação XLSX. O Streamlit foi substituído por uma aplicação web estática; não é necessário hospedar um servidor Python.

**O pacote está pronto; a criação do projeto na sua conta Supabase e a publicação na Vercel ainda precisam ser executadas. Não há credenciais ou serviços remotos já configurados neste ZIP.**

## Caminho mais direto

1. Criar um projeto no Supabase e executar o arquivo `supabase/schema.sql`.
2. Criar seu usuário em Authentication → Users.
3. Enviar o código ao GitHub e importar esse repositório na Vercel.
4. Cadastrar na Vercel as duas variáveis do `.env.example` e publicar.
5. Entrar no site e importar o arquivo original em Importar Excel.

## 1. Criar o banco Supabase

1. Entre em https://supabase.com/dashboard e escolha **New project** na sua organização.
2. Dê um nome, por exemplo `criticos-qa32`, escolha a região adequada e uma senha forte para o banco. Guarde a senha no seu gerenciador; ela não será colocada no site.
3. Aguarde a criação do projeto.
4. Abra **SQL Editor → New query**.
5. No VS Code abra `supabase/schema.sql`, copie o conteúdo inteiro e cole no editor SQL.
6. Clique **Run**. Esse arquivo cria `qa_items`, `qa_history`, índices, validações, gatilhos e políticas RLS. Execute uma vez num projeto novo. Uma segunda execução informa que as tabelas já existem; não apague tabelas para tentar novamente.
7. Em **Table Editor**, confirme a existência das duas tabelas e que RLS está ativado.

O script inclui uma transação e não contém comandos para apagar tabelas. Alterações posteriores de esquema devem ser feitas por migrações específicas.

## 2. Criar seu acesso

1. Abra **Authentication → Users → Add user → Create new user**.
2. Informe seu e-mail e uma senha forte. Para uma conta criada por você como administrador, use a opção de confirmar automaticamente o e-mail, se disponível.
3. Em **Authentication → Sign In / Providers**, confirme que o provedor de e-mail está habilitado. Os nomes podem variar conforme a versão do painel.
4. Se você não quiser permitir criação de contas por chamadas externas à API, desabilite **Allow new users to sign up**. A interface já não oferece cadastro público.
5. Para trocar uma senha esquecida nesta versão, use o gerenciamento administrativo do Supabase. A interface não implementa recuperação por e-mail.

**Cada conta possui sua própria fila.** Outro login não vê seus lotes. Esta entrega não tem equipe compartilhada, convites ou perfis de administrador na interface. Se precisar de uma fila única para vários inspetores, será necessário adicionar organizações, membros e políticas de acesso; não desative RLS para compartilhar dados.

## 3. Obter as duas configurações

No painel Supabase procure o endereço do projeto em **Connect / Project settings → Data API**, e a chave em **Project settings → API Keys**:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL HTTPS do projeto, como `https://xxxxxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave **publishable**, normalmente iniciada por `sb_publishable_`; projetos antigos também aceitam a chave pública `anon` |

A chave pública identifica o projeto; o acesso aos registros é autorizado pela sessão do usuário e pelas políticas RLS. **Nunca use `service_role`, `sb_secret_`, senha do banco ou connection string em variáveis `VITE_*`.** Essas variáveis entram no JavaScript público gerado pelo build.

## 4. Executar no VS Code antes de publicar

1. Instale Node.js **22 ou 24 LTS**: https://nodejs.org . Reabra o VS Code após instalar.
2. Extraia o ZIP e abra a pasta que contém `package.json`.
3. Copie `.env.example` para `.env.local` e substitua os dois valores pelos do seu projeto.
4. No terminal da pasta, execute:

```powershell
npm ci
npm run dev
```

5. Abra o endereço informado, normalmente `http://127.0.0.1:5173`.
6. Entre usando a conta criada no passo 2.

Se as variáveis estiverem ausentes, o aplicativo exibe uma tela de configuração. Depois de editar `.env.local`, pare com Ctrl+C e reinicie `npm run dev`.

## 5. Subir para o GitHub

1. Crie um repositório **privado**, por exemplo `criticos-qa32-web`.
2. Na pasta do projeto, pelo terminal ou pelo painel Controle do Código-Fonte do VS Code, inicialize Git e faça commit dos arquivos.
3. Envie o código para o repositório pelo VS Code ou usando os comandos mostrados pelo GitHub para um repositório novo.
4. Inclua `package-lock.json`, `vercel.json` e `supabase/schema.sql`.
5. Não envie `.env.local`, `node_modules`, `dist` nem `dados_originais`. O `.gitignore` já exclui esses caminhos.

O arquivo Excel real é entregue em `dados_originais/CRITICOS QA32.XLSX` apenas no ZIP. Ele não é incluído na aplicação pública nem no build. Guarde uma cópia local para a importação.

## 6. Publicar na Vercel

1. Entre em https://vercel.com e escolha **Add New → Project**.
2. Conecte sua conta GitHub e selecione o repositório do passo 5.
3. Confira:

| Configuração | Valor |
|---|---|
| Framework Preset | Vite |
| Root Directory | Pasta que contém `package.json`; se enviar o conteúdo à raiz do repositório, use a raiz |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 22 ou 24 |

4. Antes de publicar, abra **Environment Variables** e adicione as duas variáveis da seção 3 em **Production**. Se quiser usar previews, configure também o ambiente Preview, preferencialmente com um projeto Supabase de teste.
5. Clique **Deploy**.
6. Abra a URL gerada e entre com sua conta. A URL da interface pode ser pública, mas os dados exigem autenticação e as políticas do banco.
7. Se alterar as variáveis depois, faça **Redeploy**: variáveis Vite são incorporadas no build.
8. Em Supabase → Authentication → URL Configuration, ajuste o **Site URL** para o endereço definitivo da Vercel. O login por senha atual não depende de redirecionamento; a configuração prepara o projeto para futuros fluxos de e-mail.

Não é necessário importar o banco na Vercel. A Vercel hospeda o site; os registros ficam no seu projeto Supabase.

## 7. Importar seus 106 lotes

1. Entre no site com o usuário que será proprietário dos registros.
2. Abra **Importar Excel**.
3. Selecione `dados_originais/CRITICOS QA32.XLSX`.
4. Confira a prévia: na primeira importação, **106 registros válidos / 106 novos**.
5. Confirme. Repetir a importação não duplica lote + material nem substitui edições já feitas.

QA32 é a lista mestre. SINALIZADOR CRITICO complementa 99 lotes. Os sete lotes adicionais da QA32 são preservados. O resumo SINALIZADOR não alimenta os indicadores. Campos como estoque e cobertura são mantidos; os demais detalhes não mapeados permanecem no Excel original.

Limite: arquivo de 15 MB e até **500 registros por importação**. Para bases maiores, divida a planilha. A consulta do painel pagina a API para carregar mais de 1.000 registros. A tela e exportação mantêm os registros carregados em memória; volumes industriais muito grandes exigem paginação e filtros no servidor.

Datas de fórmulas são lidas de resultados calculados armazenados no XLSX. Quando o deadline não tem resultado disponível, calcula recebimento + prazo padrão (7 dias corridos, ajustável). Fórmulas arbitrárias não são executadas. Valores textuais são exportados como texto, sem criar fórmulas.

## 8. Regras de trabalho

- ATRASADO: deadline anterior a hoje.
- VENCE HOJE: deadline igual a hoje.
- ATENÇÃO: próximos 1 ou 2 dias, janela ajustável.
- EM DIA: prazo posterior à janela de atenção.
- SEM PRAZO: deadline ausente.
- LIBERADO: data de liberação preenchida; exige responsável.

Ordenação: atrasados → vence hoje → atenção → em dia → sem prazo → liberados; deadline mais antigo primeiro dentro do grupo. A contagem usa dias corridos e data de São Paulo, atualizada a cada minuto. O botão Atualizar busca as mudanças de outros acessos; não há assinatura Realtime nesta entrega.

No cadastro, ajuste o deadline se mudar o recebimento. Para liberar, abra o lápis e informe data e responsável. Para reabrir, limpe a data. O texto LIB do SAP não significa liberação nesta aplicação. Indicadores, gráficos e exportação da fila respeitam os filtros; a ajuda oferece exportação completa.

## 9. Banco e histórico

`qa_items` guarda registros por proprietário; uma restrição impede duplicidade de proprietário + lote + material. RLS controla SELECT, INSERT, UPDATE e DELETE. A coluna version detecta edições concorrentes. Os gatilhos registram inclusões, alterações e exclusões em `qa_history`, com conteúdo anterior/novo.

O histórico não pode ser editado pelos usuários comuns da API. A tela mostra as últimas 100 alterações do próprio usuário. Ele não substitui backups do Supabase e não oferece restauração automática. Configure os backups disponíveis no seu plano e faça exportações periódicas. A exclusão de uma conta pelo administrador elimina seus registros e histórico por associação à conta.

## 10. Testes e build

```powershell
npm ci
npm test
npm run build
```

Testes de domínio, importação da planilha real, formulário React e schema SQL. O teste PostgreSQL usa PGlite local para verificar CRUD, histórico, versão e isolamento entre duas identidades; não usa sua conta nem credenciais. Os testes de interface usam uma conexão simulada. O teste do arquivo original só é executado quando esse arquivo está presente localmente.

Veja `VALIDACAO.md` para o resultado e os limites da validação.

## 11. Resolver problemas

| Problema | Ação |
|---|---|
| `npm` não é reconhecido | Instale Node LTS e reabra o terminal. |
| PowerShell bloqueia `npm.ps1` | Use `npm.cmd ci` / `npm.cmd run dev`, ou abra o terminal Prompt de Comando. |
| Tela de configuração na Vercel | Confira nomes e ambiente das variáveis e faça Redeploy. |
| Invalid login credentials | Crie/confirme a conta no mesmo projeto Supabase configurado na URL. |
| Tabela `qa_items` não encontrada | Execute `supabase/schema.sql` e confira o projeto selecionado. |
| Permissão/RLS negada | Entre com uma conta e confirme que o script completo foi aplicado. Não desative as políticas. |
| Dados não aparecem em outro usuário | Isolamento intencional por conta. Entre com o proprietário da importação. |
| Outra sessão alterou o item | Feche o formulário, atualize a base, reabra e refaça a edição. |
| Failed to fetch | Confira a URL, conexão e se o projeto Supabase está ativo. |
| Deploy não encontra package.json | Ajuste Root Directory na Vercel. |
| Erro no build | Use Node 22/24 e `npm ci` com o lockfile entregue. |

## Estrutura

`src/App.jsx`: telas e formulários; `domain.js`: regras; `db.js`: acesso Supabase; `excel.js`: XLSX; `style.css`: layout responsivo; `supabase/schema.sql`: banco; `vercel.json`: publicação; `.env.example`: nomes das variáveis.

Documentação oficial: https://vercel.com/docs/frameworks/frontend/vite · https://supabase.com/docs/guides/database/postgres/row-level-security · https://supabase.com/docs/reference/javascript/auth-signinwithpassword
