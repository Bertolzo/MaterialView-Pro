#!/bin/bash

echo "📥 Baixando fotos reais do Unsplash..."

# Verificar se curl está disponível
if ! command -v curl &> /dev/null; then
    echo "❌ curl não encontrado. Instale com: sudo apt install curl"
    exit 1
fi

# Baixar cada categoria
for category_data in $(cat photo-sources.json | jq -c '.[]'); do
    category=$(echo "$category_data" | jq -r '.category')
    mkdir -p "$category"
    
    echo "📸 Baixando fotos de: $category"
    
    i=1
    for url in $(echo "$category_data" | jq -r '.urls[]'); do
        filename="$category/$category-$(printf '%03d' $i).jpg"
        echo "  📄 $filename"
        curl -s -L "$url" -o "$filename" &
        ((i++))
    done
    wait
    echo "✅ $category concluído"
done

echo "✨ Todas as fotos baixadas com sucesso!"
