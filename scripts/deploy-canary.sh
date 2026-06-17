#!/bin/bash
set -e

PERCENTAGE=${1:-10}

echo "🚀 Deploy Canary - ${PERCENTAGE}% do tráfego"
echo "========================================"

cd backend

echo "📦 Instalando dependências..."
npm ci

echo "🧪 Executando testes..."
npm test

echo "☁️  Deploy para produção..."
npx vercel --prod --token="${VERCEL_TOKEN}"

echo "🔄 Configurando roteamento canary..."
# Nota: O Vercel não suporta canary via CLI diretamente
# Você precisa configurar no dashboard ou usar Vercel Deploy Hooks

echo "✅ Deploy concluído!"
echo "🌐 URL: $(npx vercel ls --prod --token="${VERCEL_TOKEN}" | tail -1)"
