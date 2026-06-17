# ADR-006: Segurança com Helmet + safeCompare

**Status:** Aceito
**Data:** Abril/2026

## Contexto

API pública exposta à internet. Necessidade de proteção contra vetores de ataque comuns sem comprometer a performance.

## Decisão

- **Helmet** com CSP restritiva: whitelist explícita de domínios de provedores (`api.wavespeed.ai`, `api.pika.art`, `open.bigmodel.cn`)
- **`frameguard: deny`** — previne clickjacking
- **`referrerPolicy: no-referrer`** — não vaza URLs internas
- **`safeCompare`** via `crypto.timingSafeEqual` — comparação de tokens em tempo constante para prevenir timing attacks

## Consequências

**Positivas:**
- Proteção contra XSS, clickjacking e timing attacks
- Headers de segurança automáticos em todas as respostas

**Negativas:**
- CSP precisa de atualização manual ao adicionar novos provedores

## Arquivos Relevantes

- `backend/server.js` (helmet config)
- `backend/middleware/safeCompare.js`
- `backend/middleware/__tests__/safeCompare.test.js`
