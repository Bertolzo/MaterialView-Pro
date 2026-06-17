# ADR-004: Validação de Invariantes Visuais Pós-Geração

**Status:** Aceito
**Data:** Abril/2026

## Contexto

Provedores de IA podem alterar elementos da cena além do piso: mover móveis, mudar sombras, distorcer perspectiva. Isso resulta em imagens tecnicamente válidas mas que violam expectativas do usuário.

## Decisão

Arquitetura **gerador-verificador**: após gerar a imagem, validar 4 invariantes independentes baseadas em histogramas de luminância (Bhattacharyya distance).

| Invariante | Threshold | Faixa de Pixels |
|---|---|---|
| `shadows` | 0.70 | Pixels escuros (0–80) |
| `geometry` | 0.80 | Histograma global + ratio de tamanho |
| `objects` | 0.75 | Pixels médios (80–200) |
| `perspective` | 0.85 | Pixels claros (200–255) |

Violação retorna HTTP 409 com o nome do invariante violado.

## Consequências

**Positivas:**
- Garante qualidade mínima do resultado
- Scores contínuos [0.0, 1.0] permitem ajuste fino dos thresholds

**Negativas:**
- Implementação heurística (pixels) — pode ter falsos positivos em cenas com iluminação incomum

## Próximo Passo

Integrar CLIP via Replicate (~$0.001/validação) para validação semântica real.

## Arquivos Relevantes

- `backend/services/core/validator.js`
