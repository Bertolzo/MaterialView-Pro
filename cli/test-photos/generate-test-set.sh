#!/bin/bash

# Script para gerar dataset de teste com imagens SVG placeholder

echo "🏗️  Gerando dataset de teste para validação CLI..."

# Criar diretórios por categoria
mkdir -p sala cozinha corredor complexo

# Função para gerar SVG placeholder
generate_svg() {
  local category=$1
  local name=$2
  local width=$3
  local height=$4
  
  cat > "${category}/${name}.svg" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f8f9fa"/>
  
  <!-- Piso base -->
  <rect x="50" y="50" width="$(($width-100))" height="$(($height-100))" fill="#e9ecef" stroke="#dee2e6" stroke-width="2"/>
  
  <!-- Elementos específicos por categoria -->
  $(case $category in
    "sala")
      echo "<rect x='100' y='100' width='200' height='100' fill='#adb5bd' rx='10'/> <!-- sofá -->"
      echo "<rect x='350' y='150' width='80' height='80' fill='#6c757d' rx='40'/> <!-- mesa -->"
      ;;
    "cozinha")
      echo "<rect x='80' y='80' width='150' height='200' fill='#495057'/> <!-- armário -->"
      echo "<rect x='280' y='120' width='100' height='100' fill='#868e96' rx='10'/> <!-- ilha -->"
      ;;
    "corredor")
      echo "<rect x='100' y='80' width='50' height='150' fill='#6c757d'/> <!-- porta 1 -->"
      echo "<rect x='200' y='80' width='50' height='150' fill='#6c757d'/> <!-- porta 2 -->"
      echo "<rect x='350' y='80' width='50' height='150' fill='#6c757d'/> <!-- porta 3 -->"
      ;;
    "complexo")
      echo "<path d='M 100,100 L 300,100 L 250,250 L 150,250 Z' fill='#adb5bd'/> <!-- forma irregular -->"
      echo "<circle cx='400' cy='150' r='40' fill='#6c757d'/> <!-- objeto circular -->"
      ;;
  esac)
  
  <!-- Texto indicador -->
  <text x="$(($width/2))" y="30" text-anchor="middle" fill="#495057" font-family="Arial" font-size="14">
    ${category} - ${name}
  </text>
  <text x="$(($width/2))" y="$(($height-20))" text-anchor="middle" fill="#6c757d" font-family="Arial" font-size="12">
    ${width}x${height}px
  </text>
</svg>
EOF
}

# Gerar fotos de teste
echo "📸 Criando imagens de teste..."

# Sala (ambiente típico)
generate_svg "sala" "sala-moderna" 800 600
generate_svg "sala" "sala-classica" 1024 768
generate_svg "sala" "sala-pequena" 600 400

# Cozinha (móveis e ilhas)
generate_svg "cozinha" "cozinha-americana" 800 600
generate_svg "cozinha" "cozinha-compacta" 700 500
generate_svg "cozinha" "cozinha-luxo" 1200 800

# Corredor (formato alongado)
generate_svg "corredor" "corredor-longo" 400 800
generate_svg "corredor" "corredor-curto" 300 600
generate_svg "corredor" "corredor-escuro" 350 700

# Ambientes complexos (formas irregulares)
generate_svg "complexo" "ambiente-livre" 900 700
generate_svg "complexo" "loft-moderno" 1000 800
generate_svg "complexo" "espaco-multiuso" 850 600

echo "✨ Dataset gerado com sucesso!"
echo ""
echo "📁 Estrutura criada:"
find . -type f -name "*.svg" | sort | while read file; do
  filename=$(basename "$file")
  dirname=$(dirname "$file")
  echo "  📄 ${dirname}/${filename}"
done

echo ""
echo "🚀 Para converter SVG para PNG (opcional):"
echo "   # Instalar ImageMagick: sudo apt install imagemagick"
echo "   # Converter: mogrify -format png *.svg"
echo ""
echo "💡 Para testar a CLI:"
echo "   cd .. && npm run cli single ./test-photos/sala/sala-moderna.svg"