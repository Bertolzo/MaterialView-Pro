#!/bin/bash
set -e

echo "🚀 Deploy para Staging"
echo "======================"

cd backend

echo "📦 Instalando dependências..."
npm ci

echo "🧪 Executando testes..."
npm test

echo "☁️  Deploy para staging..."
npx vercel --prod --token="${VERCEL_TOKEN}"

echo "✅ Deploy concluído!"
