#!/usr/bin/env bash
# cleanup.sh — Move arquivos redundantes para old_backup/ após refatoração backend/frontend
# Execute a partir da raiz de pisosrealview-pro-transformed/
# Após validar que backend/ e frontend/ funcionam, pode deletar old_backup/ com segurança.

set -e

echo "🗂️  Criando pasta de backup..."
mkdir -p old_backup

echo "📦 Movendo diretórios antigos para old_backup/..."
[ -d services ]    && mv services    old_backup/services_backup
[ -d components ]  && mv components  old_backup/components_backup
[ -d hooks ]       && mv hooks       old_backup/hooks_backup
[ -d pages ]       && mv pages       old_backup/pages_backup
[ -d utils ]       && mv utils       old_backup/utils_backup
[ -d api ]         && mv api         old_backup/api_backup

echo "📄 Movendo arquivos raiz antigos..."
[ -f App.tsx ]           && mv App.tsx           old_backup/App.tsx.bak
[ -f App.MINIMAL.tsx ]   && mv App.MINIMAL.tsx   old_backup/App.MINIMAL.tsx.bak
[ -f types.ts ]          && mv types.ts          old_backup/types.ts.bak
[ -f utils.ts ]          && mv utils.ts          old_backup/utils.ts.bak
[ -f env.d.ts ]          && mv env.d.ts          old_backup/env.d.ts.bak
[ -f vite.config.ts ]    && mv vite.config.ts    old_backup/vite.config.ts.bak
[ -f tsconfig.json ]     && mv tsconfig.json     old_backup/tsconfig.json.bak
[ -f tsconfig.node.json ] && mv tsconfig.node.json old_backup/tsconfig.node.json.bak
[ -f index.html ]        && mv index.html        old_backup/index.html.bak
[ -f test-invariants.js ] && mv test-invariants.js old_backup/test-invariants.js.bak

echo "🗑️  Removendo pastas de cache e build (não devem estar no repositório)..."
rm -rf node_modules
rm -rf dist
rm -rf coverage
rm -rf .vite

echo ""
echo "✅ Limpeza concluída."
echo ""
echo "Próximos passos:"
echo "  1. cd backend && npm install && node server.js"
echo "  2. cd frontend && npm install && npm run dev  (em outro terminal)"
echo "  3. Teste o sistema em http://localhost:5173"
echo "  4. Se tudo funcionar, delete old_backup/ com: rm -rf old_backup"
echo "  5. git add . && git commit -m 'refactor: cleanup redundant files after backend/frontend split'"
