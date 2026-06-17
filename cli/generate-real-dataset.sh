#!/bin/bash

# Script para gerar dataset real usando Unsplash API com fotos de ambientes reais

echo "🏗️  Gerando dataset real de ambientes para validação..."

# Criar diretório para fotos reais
mkdir -p real-test-photos

# URLs de fotos reais de ambientes (Unsplash Creative Commons)
# Estas são fotos de exemplo - em produção usaríamos API Unsplash ou dataset proprietário

cat > real-test-photos/photo-sources.json << 'EOF'
[
  {
    "category": "living-room",
    "urls": [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1555041469-a586c614ea4a?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1513694203232-719a028e63f4?w=800&h=600&fit=crop"
    ]
  },
  {
    "category": "kitchen", 
    "urls": [
      "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=600&fit=crop"
    ]
  },
  {
    "category": "bedroom",
    "urls": [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop", 
      "https://images.unsplash.com/photo-1520608429611-a0173d1c14af?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1540518614846-7eded1027057?w=800&h=600&fit=crop"
    ]
  },
  {
    "category": "bathroom",
    "urls": [
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1584628407053-2fadc510a68c?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1630569384545-c3c4d96e7b32?w=800&h=600&fit=crop"
    ]
  },
  {
    "category": "office",
    "urls": [
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&h=600&fit=crop", 
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop"
    ]
  },
  {
    "category": "complex",
    "urls": [
      "https://images.unsplash.com/photo-1505842465771-4b565d1c97d0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&h=600&fit=crop"
    ]
  }
]
EOF

echo "📥 Baixando URLs de referência para documentação..."
echo "💡 Em produção, usaríamos curl/wget para baixar as fotos reais"

# Gerar arquivos de placeholder baseados nas URLs reais (para demonstração)
cat > real-test-photos/dataset-metadata.json << 'EOF'
{
  "dataset_info": {
    "name": "Pisorealview Validation Dataset",
    "version": "1.0.0",
    "description": "Dataset para validação massiva do sistema de renderização",
    "total_photos": 18,
    "categories": ["living-room", "kitchen", "bedroom", "bathroom", "office", "complex"]
  },
  "photo_details": [
    {"id": "living-room-001", "category": "living-room", "expected_difficulty": "medium", "floor_coverage": 0.65},
    {"id": "living-room-002", "category": "living-room", "expected_difficulty": "easy", "floor_coverage": 0.75},
    {"id": "living-room-003", "category": "living-room", "expected_difficulty": "hard", "floor_coverage": 0.55},
    
    {"id": "kitchen-001", "category": "kitchen", "expected_difficulty": "easy", "floor_coverage": 0.70},
    {"id": "kitchen-002", "category": "kitchen", "expected_difficulty": "medium", "floor_coverage": 0.60},
    {"id": "kitchen-003", "category": "kitchen", "expected_difficulty": "hard", "floor_coverage": 0.45},
    
    {"id": "bedroom-001", "category": "bedroom", "expected_difficulty": "easy", "floor_coverage": 0.80},
    {"id": "bedroom-002", "category": "bedroom", "expected_difficulty": "medium", "floor_coverage": 0.65},
    {"id": "bedroom-003", "category": "bedroom", "expected_difficulty": "hard", "floor_coverage": 0.50},
    
    {"id": "bathroom-001", "category": "bathroom", "expected_difficulty": "medium", "floor_coverage": 0.60},
    {"id": "bathroom-002", "category": "bathroom", "expected_difficulty": "easy", "floor_coverage": 0.75},
    {"id": "bathroom-003", "category": "bathroom", "expected_difficulty": "hard", "floor_coverage": 0.40},
    
    {"id": "office-001", "category": "office", "expected_difficulty": "easy", "floor_coverage": 0.70},
    {"id": "office-002", "category": "office", "expected_difficulty": "medium", "floor_coverage": 0.55},
    {"id": "office-003", "category": "office", "expected_difficulty": "hard", "floor_coverage": 0.35},
    
    {"id": "complex-001", "category": "complex", "expected_difficulty": "hard", "floor_coverage": 0.30},
    {"id": "complex-002", "category": "complex", "expected_difficulty": "very-hard", "floor_coverage": 0.25},
    {"id": "complex-003", "category": "complex", "expected_difficulty": "extreme", "floor_coverage": 0.15}
  ],
  "validation_criteria": {
    "success_rate_threshold": 0.7,
    "high_fidelity_threshold": 0.5,
    "max_processing_time": 8000
  }
}
EOF

# Criar scripts de placeholder para demonstração
echo "🖼️  Criando placeholders baseados no dataset real..."

for category in living-room kitchen bedroom bathroom office complex; do
  mkdir -p "real-test-photos/$category"
  
  for i in 001 002 003; do
    cat > "real-test-photos/$category/$category-$i.jpg.placeholder" << EOF
PLACEHOLDER: $category-$i
Category: $category
Difficulty: $(case $i in
  "001") echo "easy" ;;
  "002") echo "medium" ;;
  "003") echo "hard" ;;
esac)
Expected Floor Coverage: $(case $category in
  "living-room") echo "65%" ;;
  "kitchen") echo "70%" ;;
  "bedroom") echo "80%" ;;
  "bathroom") echo "60%" ;;
  "office") echo "70%" ;;
  "complex") echo "30%" ;;
esac)

⚠️  Em produção, este arquivo seria substituído por uma foto real
Para usar fotos reais:
1. Baixe as URLs de photo-sources.json
2. Use curl/wget para download:
   curl -o "real-test-photos/$category/$category-$i.jpg" "URL_DO_UNSPLASH"

OU use o script download-real-photos.sh
EOF
  done
done

# Criar script de download automático
cat > real-test-photos/download-real-photos.sh << 'EOF'
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
EOF

chmod +x real-test-photos/download-real-photos.sh

echo ""
echo "✨ Dataset preparado com sucesso!"
echo ""
echo "📁 Estrutura criada em: real-test-photos/"
echo "   📊 dataset-metadata.json - Metadados do dataset"
echo "   📋 photo-sources.json - URLs reais para download" 
echo "   📥 download-real-photos.sh - Script para baixar fotos reais"
echo "   📸 [categoria]/[foto].placeholder - Placeholders organizados"
echo ""
echo "🚀 Para usar com a CLI:"
echo "   cd .. && npm run cli batch ./real-test-photos/[categoria] -v"
echo ""
echo "💡 Para usar fotos reais, execute:"
echo "   cd real-test-photos && ./download-real-photos.sh"