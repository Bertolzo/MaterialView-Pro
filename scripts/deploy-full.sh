#!/bin/bash
set -e

echo "🚀 Deploy Completo - 100% do tráfego"
echo "===================================="

cd backend

echo "📦 Instalando dependências..."
npm ci

echo "🧪 Executando testes..."
npm test

echo "☁️  Deploy para produção..."
npx vercel --prod --token="${VERCEL_TOKEN}"

echo "✅ Deploy concluído!"
