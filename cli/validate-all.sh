#!/bin/bash

# Script de validação automática para testar todo o dataset

echo "🧪 VALIDAÇÃO AUTOMÁTICA DO PISOREALVIEW PRO"
echo "============================================"

VALIDATION_DIR="real-test-photos"
REPORT_DIR="validation-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Criar diretório de relatórios
mkdir -p "$REPORT_DIR"

echo "📅 Execução iniciada: $(date)"
echo "📂 Diretório de validação: $VALIDATION_DIR"
echo "📊 Diretório de relatórios: $REPORT_DIR"
echo ""

# Função para validar uma categoria
validate_category() {
    local category=$1
    local report_file="$REPORT_DIR/${category}_${TIMESTAMP}.json"
    
    echo "🔍 Validando categoria: $category"
    
    # Executar validação com material típico para a categoria
    local material_specs
    case $category in
        "living-room")
            material_specs='{"id":"ceramic-living","name":"Cerâmica para Sala","category":"ceramic","pattern":"tiled","scale":1.0}'
            ;;
        "kitchen")
            material_specs='{"id":"vinyl-kitchen","name":"Vinílico para Cozinha","category":"vinyl","pattern":"striped","scale":0.8}'
            ;;
        "bedroom")
            material_specs='{"id":"wood-bedroom","name":"Madeira para Quarto","category":"wood","pattern":"natural","scale":1.2}'
            ;;
        "bathroom")
            material_specs='{"id":"stone-bathroom","name":"Pedra para Banheiro","category":"stone","pattern":"natural","scale":0.9}'
            ;;
        "office")
            material_specs='{"id":"carpet-office","name":"Carpete para Escritório","category":"carpet","pattern":"textured","scale":1.1}'
            ;;
        "complex")
            material_specs='{"id":"marble-complex","name":"Mármore para Ambiente Complexo","category":"marble","pattern":"veined","scale":1.5}'
            ;;
        *)
            material_specs='{"id":"default","name":"Material Padrão","category":"ceramic","pattern":"tiled","scale":1.0}'
            ;;
    esac
    
    # Executar validação
    if npm run dev -- batch "$VALIDATION_DIR/$category" -m "$material_specs" --output "$report_file" 2>/dev/null; then
        echo "  ✅ Validação concluída: $category"
        return 0
    else
        echo "  ❌ Falha na validação: $category"
        return 1
    fi
}

# Função para gerar relatório consolidado
generate_summary_report() {
    local summary_file="$REPORT_DIR/summary_${TIMESTAMP}.json"
    
    echo ""
    echo "📈 GERANDO RELATÓRIO CONSOLIDADO"
    
    cat > "$summary_file" << EOF
{
  "validation_summary": {
    "timestamp": "$(date -Iseconds)",
    "total_categories": $(ls "$VALIDATION_DIR" | grep -v '\.json$' | grep -v '\.sh$' | wc -l),
    "categories_tested": [
EOF
    
    first=true
    for category in $(ls "$VALIDATION_DIR" | grep -v '\.json$' | grep -v '\.sh$'); do
        if [ "$first" = "false" ]; then
            echo "      ," >> "$summary_file"
        else
            first=false
        fi
        echo "      \"$category\"" >> "$summary_file"
    done
    
    cat >> "$summary_file" << EOF
    ],
    "system_info": {
      "cli_version": "1.0.0",
      "node_version": "$(node --version)",
      "total_test_files": $(find "$VALIDATION_DIR" -name "*.placeholder" | wc -l)
    }
  }
}
EOF
    
    echo "  📄 Relatório salvo em: $summary_file"
}

# Função para validar o sistema completo
validate_system() {
    echo ""
    echo "🧪 TESTE DE SISTEMA COMPLETO"
    
    local system_report="$REPORT_DIR/system_test_${TIMESTAMP}.json"
    
    if npm run dev -- system-test "$VALIDATION_DIR" --threshold 0.7 --output "$system_report" 2>/dev/null; then
        echo "  ✅ Sistema APROVADO nos critérios básicos"
        return 0
    else
        echo "  ⚠️  Sistema REPROVADO - análise detalhada necessária"
        return 1
    fi
}

# Função principal
main() {
    echo "🏁 INICIANDO VALIDAÇÃO EM MASSA"
    echo ""
    
    # Verificar se o diretório de validação existe
    if [ ! -d "$VALIDATION_DIR" ]; then
        echo "❌ Diretório de validação não encontrado: $VALIDATION_DIR"
        echo "   Execute primeiro: ./generate-real-dataset.sh"
        exit 1
    fi
    
    # Validar cada categoria
    local total_categories=0
    local successful_categories=0
    
    for category in $(ls "$VALIDATION_DIR" | grep -v '\.json$' | grep -v '\.sh$'); do
        ((total_categories++))
        if validate_category "$category"; then
            ((successful_categories++))
        fi
        echo ""
    done
    
    # Gerar relatório consolidado
    generate_summary_report
    
    # Validar sistema completo
    validate_system
    
    # Resumo final
    echo ""
    echo "🎯 RESUMO DA EXECUÇÃO"
    echo "====================="
    echo "📊 Categorias testadas: $successful_categories/$total_categories"
    echo "📁 Relatórios gerados em: $REPORT_DIR/"
    echo "⏱️  Tempo total: $(($(date +%s) - $(date -d "$(date)" +%s))) segundos"
    echo ""
    
    if [ $successful_categories -eq $total_categories ]; then
        echo "✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO"
        exit 0
    else
        echo "⚠️  VALIDAÇÃO CONCLUÍDA COM AVISOS"
        exit 1
    fi
}

# Executar função principal
main