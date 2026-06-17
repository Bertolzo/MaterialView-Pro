#!/bin/bash
set -e

echo "🔄 Rollback para arquitetura legada"
echo "==================================="

cd backend

echo "⚙️  Configurando feature flag..."
npx vercel env add USE_LEGACY_MODE production --value=true --token="${VERCEL_TOKEN}"

echo "🔄 Reimplantando..."
npx vercel --prod --token="${VERCEL_TOKEN}"

echo "✅ Rollback concluído!"
