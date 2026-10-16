# Validação da versão Vercel + Supabase

Data: 16/10/2026. Ambiente de execução: Linux, Node.js 24.19.0 e npm 11.9.0.

## Resultados

- `npm test`: **18 testes aprovados**, em quatro arquivos. Última execução: 2,21 s.
- `npm run build`: build de produção concluído com Vite 7.3.7, React e todas as integrações habilitadas por variáveis de teste sem credenciais reais.
- `npm audit --omit=dev`: nenhuma vulnerabilidade conhecida reportada nas dependências de produção na data da entrega.
- A dependência UUID de ExcelJS foi fixada por override em 11.1.1; testes de importação e build passaram com essa versão.
- Arquivo original: 106 lotes importados, enriquecimento de 99 pelo sinalizador, sem duplicidades e sem presumir liberação pelo texto SAP.

## Cobertura

12 testes das regras: limites de atraso/hoje/atenção/em dia, liberação, ausência de prazo, ordenação, filtros, datas inválidas, quantidade inválida e exigência de responsável.

4 testes de Excel: planilha real, datas seriais e brasileiras, zeros à esquerda, fórmula sem cache e rejeição de arquivo sem colunas reconhecidas.

1 teste de interface React em DOM simulado: carregar registros, filtrar, limpar filtros, abrir cadastro, salvar via conexão simulada e abrir a importação.

1 teste do schema em PostgreSQL local PGlite: executar SQL, inserir/editar/excluir, registrar histórico, incrementar versão, rejeitar versão antiga, impedir escrita direta no histórico e testar isolamento RLS entre duas identidades.

## Limites

O projeto remoto Supabase não foi criado e a Vercel não foi publicada nesta execução. Não foram fornecidas contas conectadas ou configurações do usuário. A integração real de login, rede e API Supabase deve ser confirmada após seguir o README. Testes locais de PostgreSQL não equivalem a uma implantação Supabase online.

Não houve validação visual em navegador real, execução nativa no Windows ou teste de carga. O SQL foi validado localmente, mas o ambiente administrado do Supabase poderá ter configurações ou permissões particulares a verificar na implantação.

O módulo ExcelJS gera um chunk de aproximadamente 937 kB (271 kB comprimido). É carregado sob demanda ao importar/exportar; o aviso de tamanho emitido pelo build não impede a publicação. A aparência usa fontes externas com fallback para fontes locais.

O aplicativo implementa fila privada por usuário; não uma fila compartilhada de equipe. O histórico permite consultar mudanças, sem restauração automática. Configuração de backups e disponibilidade depende do projeto Supabase contratado.
