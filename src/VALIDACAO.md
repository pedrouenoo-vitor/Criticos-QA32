# Validação da V2

Data: 17/10/2026. Ambiente local: Linux, Node.js 24.19.0 e npm 11.9.0. Nenhuma alteração foi aplicada ao seu Supabase, GitHub ou site Vercel durante esta entrega.

## Testes automatizados

**48 testes aprovados, em nove arquivos.** Última execução: 2,94 segundos.

| Área | Cobertura |
|---|---|
| Regras da fila | Cinco limites de prazo, liberação, ausência de prazo, ordenação, filtros, validações e datas |
| Indicadores | Variação positiva/negativa, base zero, reconstrução por histórico, corte de data e filtros |
| Produtividade | Períodos contíguos, lotes válidos, anulação de ciclos, quantidades por unidade, SLA, ausência de deadline, usuários com produção zero |
| Relatórios | Estrutura e conteúdo do XLSX de cinco abas; escape de conteúdo no HTML de impressão |
| Excel original | 106 lotes, enriquecimento de 99, zeros à esquerda, fórmulas sem cache e formatos inválidos |
| Interface React | Carregar, buscar, cadastrar, card de liberados, modo escuro, recolher menu, navegação administrativa e ocultação para operador |
| Formulário de liberação | Autoria autenticada no envio, ausência de controles administrativos para operador, campos de conclusão bloqueados e reabertura |
| Banco V1 | CRUD, versões, auditoria e isolamento original |
| Migração V2 em PostgreSQL local | Preservação e reexecução; perfil administrativo; dados legados sem autoria presumida; atribuição; RLS; bloqueio de autoelevação; desativação; proteção do último admin; autoria forjada substituída pelo banco; reabertura; retenção da produtividade após exclusão; limite de criação |
| Function de usuários | Sem token, token inválido, operador, desativado, senha inválida, limite, origem indevida, método indevido, sucesso e erro parcial de perfil |
| Chaves | Build rejeita secret/service_role em variável pública, sem imprimir o valor; permite chave publishable |

Os testes do banco executam o SQL com PGlite, uma implementação local de PostgreSQL. As chamadas de Supabase Auth na Function são simuladas; nenhuma conta real foi criada. Os testes de interface usam DOM simulado.

## Build e dependências

- Build de produção com configurações públicas de teste: concluído.
- Administração e Excel são carregados em módulos sob demanda.
- Auditoria de dependências de produção: nenhuma vulnerabilidade conhecida reportada na execução desta entrega.
- Validação adicional do bundle: o marcador de segredo usado apenas no ambiente do servidor não apareceu nos arquivos públicos gerados.

## Limites

Não houve acesso autenticado à infraestrutura do usuário nem implantação remota. A criação real de contas depende da chave administrativa correta no servidor Vercel e das políticas do projeto Supabase. Confirme o fluxo em uma conta de teste após a migração.

Não houve inspeção visual em navegador real, teste nativo Windows ou teste de carga distribuída. Tema responsivo e estados foram exercitados em DOM simulado. O PDF usa o diálogo de impressão do navegador; o layout de impressão foi preparado em HTML/CSS, sem validar cada driver/navegador.

O módulo ExcelJS gera um chunk maior que 500 kB, carregado sob demanda. O aviso de tamanho não impede o build. As consultas são paginadas na API, mas os dados acessíveis são reunidos em memória para os cálculos: volumes muito grandes exigem agregação/paginação no servidor.

Não há preenchimento retroativo de dados que não foram registrados. Os percentuais dos cards podem mostrar Sem base até formar histórico suficiente. Autoria V1/importada permanece separada da autoria autenticada V2.
