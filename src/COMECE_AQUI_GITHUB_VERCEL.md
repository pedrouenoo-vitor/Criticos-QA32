# QA32 V2.3 — Publicação com raiz corrigida

Este ZIP **não contém pasta externa `qa32_v2` nem pasta externa `src`**. O `package.json`, `index.html`, `vite.config.js` e `vercel.json` ficam diretamente na raiz. O código React fica em `src/App.jsx`.

## Atenção: evitar misturar duas versões

O repositório atual tem uma pasta externa `src` contendo outro `package.json` e o aplicativo em `src/src/App.jsx`. **Não basta adicionar este ZIP por cima**: isso pode deixar duas cópias do aplicativo, e a Vercel pode continuar publicando a errada.

1. Faça backup do repositório atual (GitHub → Code → Download ZIP).
2. Preferencialmente, em um clone local do repositório, remova **apenas a pasta externa antiga `src`** que contém o `package.json` duplicado, **depois de confirmar que todos os arquivos necessários estão neste pacote**. Não remova a pasta `src` deste novo pacote, pois ela contém o aplicativo React.
3. Copie **todo o conteúdo deste ZIP**, e não uma pasta que o contenha, para a raiz do repositório. Confirme que `package.json` está na raiz e que existe `src/App.jsx` (e não `src/src/App.jsx`). Faça commit e push na branch `main`.
4. Na Vercel → Settings → Build and Deployment, configure:
   - Root Directory: `./` (raiz do repositório)
   - Framework Preset: Vite
   - Install Command: `npm ci --include=dev`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Confira que as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `QA32_SUPABASE_URL` e `QA32_SUPABASE_SERVICE_ROLE_KEY` estão configuradas no ambiente de produção. **Nunca inclua os valores secretos no GitHub.**
6. Publique **um novo commit**, sem reutilizar o deployment do commit antigo `71173b6`. Aguarde `Ready`.
7. Teste em janela anônima com conta `operator`: o rodapé do menu deve mostrar `Supabase · Operador`; não devem aparecer `Importar Excel`, `Exportar Excel` nem `Exportar base acessível`. Teste também o login e a criação de usuários com conta `admin`.

## Supabase

Se as migrações 002, 004 e 005 já foram executadas com sucesso, **não execute SQL novamente**. Este pacote corrige a organização dos arquivos e não requer nova migração. Os registros existentes permanecem no mesmo Supabase.

## Caso o GitHub não permita mover pastas pelo navegador

Use GitHub Desktop ou Git no computador para reorganizar a raiz em um único commit. Evite excluir a pasta antiga antes de conferir o backup e os arquivos do novo pacote.

## Diagnóstico adicional

Se aparecer novamente `[STATIC_BUILD_NO_OUT_DIR]` mesmo com a estrutura correta, confira se `vite.config.js` não define um `root` ou `outDir` diferente e se há algum `vercel.json` antigo fora da raiz. O Vite deve gerar `dist/index.html` relativo à raiz configurada na Vercel.
