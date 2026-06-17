# Security Changelog — PisosRealView Pro

Documento operacional de segurança. Registra todas as mudanças de segurança implementadas, os padrões adotados e os alertas para mudanças futuras.

**Última atualização:** Abril 2026 (SEC-05, SEC-06, SEC-07 adicionados)

---

## Mudanças implementadas

### [SEC-01] Timing Attack — Comparações de secrets em tempo constante

**Data:** Abril 2026
**Arquivos alterados:**
- `backend/middleware/safeCompare.js` ← novo arquivo
- `backend/routes/admin.js`
- `backend/routes/usage.js`
- `backend/server.js`

**O que mudou:**

Todas as comparações de secrets e API keys foram migradas de `===` para `crypto.timingSafeEqual` via helper centralizado `safeCompare`.

Antes:
```js
if (!secret || token !== secret) { ... }         // admin.js
if (!token || token !== process.env.ADMIN_SECRET) // server.js
const client = keys[apiKey];                      // usage.js
```

Depois:
```js
if (!safeCompare(token, secret)) { ... }
if (!safeCompare(token, process.env.ADMIN_SECRET))
const entry = Object.entries(keys).find(([k]) => safeCompare(k, apiKey));
```

**Padrão adotado:**

`safeCompare(a, b)` em `backend/middleware/safeCompare.js`:
- Retorna `false` para qualquer valor falsy sem lançar exceção
- Verifica comprimentos antes de chamar `timingSafeEqual` (requisito da API do Node.js)
- Usa `Buffer.from(string)` com encoding UTF-8

**Alerta para mudanças futuras:**

> ATENÇÃO: Qualquer novo endpoint que compare um secret, token ou API key DEVE usar `safeCompare` em vez de `===`. Nunca use `===` para comparar valores de autenticação.

> ATENÇÃO: O lookup de API key em `usage.js` usa `Object.entries(keys).find(...)` — O(n). Isso é aceitável até ~500 clientes. Quando `totalClients >= 500`, migrar para índice SHA-256 ou PostgreSQL (ver `METRICAS_INTERNAS.md` gatilho 4).

---

### [SEC-02] Rate Limiting — Proteção do endpoint de criação de trial

**Data:** Abril 2026
**Arquivos alterados:**
- `backend/server.js`

**O que mudou:**

Adicionados dois rate limiters dentro do bloco `if (isProd)`:

| Limiter | Rota | Janela | Limite |
|---|---|---|---|
| `trialLimiter` | `POST /v1/auth/trial` | 1 hora | 5 req/IP |
| `authLimiter` | `/v1/auth` (geral) | 15 min | 20 req/IP |

**Por que:** Sem rate limit, um bot podia criar milhares de contas trial em segundos, esgotando os créditos gratuitos dos provedores de IA (Pika Labs: 80 sim/mês, Zhipu: free tier).

**Alerta para mudanças futuras:**

> ATENÇÃO: Os limiters `trialLimiter` e `authLimiter` estão declarados DENTRO do bloco `if (isProd)`. Se você mover o registro de rotas para fora desse bloco, vai causar `ReferenceError` em desenvolvimento. Mantenha os `app.post('/v1/auth/trial', trialLimiter)` e `app.use('/v1/auth', authLimiter)` DENTRO do `if (isProd)`.

> ATENÇÃO: O store de rate limit é em memória (`MemoryStore` padrão do `express-rate-limit`). Em deploy multi-processo (Railway com 2+ instâncias), os contadores não são compartilhados entre processos. Quando escalar para múltiplas instâncias, migrar para `RedisStore` (ver `METRICAS_INTERNAS.md` gatilho 2).

> ATENÇÃO: Se adicionar novos endpoints de autenticação (ex: `/v1/auth/login`, `/v1/auth/reset-password`), verificar se o `authLimiter` (20 req/15min) é adequado ou se precisa de limiter específico.

---

### [SEC-03] Security Headers — Substituição por helmet

**Data:** Abril 2026
**Arquivos alterados:**
- `backend/server.js`
- `backend/package.json` (adicionado `helmet ^8.0.0` em `dependencies`)

**O que mudou:**

O bloco manual `if (isProd) { res.setHeader('X-Content-Type-Options', 'nosniff') }` foi removido e substituído por `helmet` aplicado globalmente (sem condicional de ambiente).

Headers agora presentes em TODAS as respostas (dev e prod):

| Header | Valor | Proteção |
|---|---|---|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | Força HTTPS |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-XSS-Protection` | `0` | Desativa auditor legado |
| `Referrer-Policy` | `no-referrer` | Vazamento de URL |
| `Content-Security-Policy` | ver abaixo | XSS |
| `X-Powered-By` | removido | Fingerprinting |

CSP configurada para permitir:
- `connectSrc`: `'self'`, `api.wavespeed.ai`, `api.pika.art`, `open.bigmodel.cn`
- `imgSrc`: `'self'`, `data:`, `blob:`
- `scriptSrc`: `'self'`
- `styleSrc`: `'self'`, `'unsafe-inline'`

**Posição no middleware stack:**
```
1. correlationIdMiddleware
2. helmet(...)          ← aqui
3. request logging
4. express.json()
5. cors()
6. rate limiters (isProd)
7. rotas
```

**Alerta para mudanças futuras:**

> ATENÇÃO: Se adicionar um novo provedor de IA, adicione o domínio da API em `connectSrc` na configuração do helmet em `server.js`. Caso contrário, o browser vai bloquear as chamadas com erro de CSP.

> ATENÇÃO: Se o frontend precisar carregar scripts de CDN externo (ex: analytics, chat), adicione o domínio em `scriptSrc`. `'unsafe-inline'` está habilitado apenas para `styleSrc`.

> ATENÇÃO: `crossOriginResourcePolicy: { policy: 'cross-origin' }` está configurado para permitir que o frontend Vercel consuma a API. Se mudar o modelo de deploy (ex: same-origin), ajuste para `'same-origin'`.

> ATENÇÃO: `helmet` é aplicado globalmente (sem `if (isProd)`). Isso é intencional — headers de segurança devem estar presentes em desenvolvimento também para detectar problemas de CSP cedo.

---

### [SEC-04] Rate Limiting — Proteção de /v1/usage e /v1/billing

**Data:** Abril 2026
**Arquivos alterados:**
- `backend/server.js`

**O que mudou:**

Adicionados três rate limiters dentro do bloco `if (isProd)`:

| Limiter | Rota | Janela | Limite | Motivo |
|---|---|---|---|---|
| `usageLimiter` | `/v1/usage` | 1 min | 30 req/IP | Previne I/O excessivo no `api-keys.json` |
| `billingWebhookLimiter` | `/v1/billing/webhook` | 1 min | 60 req/IP | Previne flood de webhooks falsos |
| `billingLimiter` | `/v1/billing` (geral) | 1 min | 20 req/IP | Proteção geral de billing |

**Ordem de registro importante:** `billingWebhookLimiter` é registrado ANTES de `billingLimiter` para que `/v1/billing/webhook` use seu próprio limite mais permissivo (60) antes de cair no limite geral (20).

**Alerta para mudanças futuras:**

> ATENÇÃO: A ordem dos `app.use` para billing importa. `billingWebhookLimiter` DEVE ser registrado antes de `billingLimiter`. Se inverter a ordem, o webhook vai ser limitado a 20 req/min em vez de 60.

> ATENÇÃO: O `usageLimiter` (30 req/min) é adequado para polling manual. Se implementar um dashboard com auto-refresh, verifique se a frequência de polling não ultrapassa esse limite.

> ATENÇÃO: Assim como os outros limiters, o store é em memória. Em multi-processo, migrar para `RedisStore`.

---

## Mapa de autenticação atual

Todos os pontos de autenticação do sistema e qual mecanismo usam:

| Endpoint | Mecanismo | Implementação |
|---|---|---|
| `GET /v1/admin/metrics` | `ADMIN_SECRET` via `x-admin-key` ou `Bearer` | `safeCompare` em `admin.js` |
| `GET /v1/admin/affiliates/:ref` | `ADMIN_SECRET` via `x-admin-key` ou `Bearer` | `safeCompare` em `admin.js` |
| `POST /admin/credits/reset` | `ADMIN_SECRET` via `Bearer` | `safeCompare` em `server.js` |
| `GET /admin/metrics` | `ADMIN_SECRET` via `Bearer` | `safeCompare` em `server.js` |
| `POST /admin/keys` | `ADMIN_SECRET` via `Bearer` | `safeCompare` em `server.js` |
| `DELETE /admin/keys/:key` | `ADMIN_SECRET` via `Bearer` | `safeCompare` em `server.js` |
| `GET /admin/keys` | `ADMIN_SECRET` via `Bearer` | `safeCompare` em `server.js` |
| `GET /v1/usage` | API key via `x-api-key` ou `Bearer` | `safeCompare` em `usage.js` |

> ATENÇÃO: Há dois conjuntos de rotas admin: `/v1/admin/*` (via `adminRouter`) e `/admin/*` (direto no `server.js`). Ambos usam `safeCompare`, mas aceitam headers diferentes. Consolidar em uma única rota é recomendado em versão futura.

---

## Dependências de segurança

| Pacote | Versão | Uso |
|---|---|---|
| `helmet` | `^8.0.0` | Security headers HTTP |
| `express-rate-limit` | `^7.3.1` | Rate limiting por IP |
| `crypto` (Node.js nativo) | — | `timingSafeEqual` via `safeCompare` |

---

## Checklist de segurança para novos endpoints

Ao adicionar um novo endpoint ao backend, verifique:

- [ ] Se o endpoint requer autenticação, usa `safeCompare` (não `===`)
- [ ] Se o endpoint é público e pode ser abusado por bots, tem rate limiter dentro de `if (isProd)`
- [ ] Se o endpoint faz chamadas a APIs externas, o domínio está em `connectSrc` do helmet
- [ ] Se o endpoint lê `api-keys.json` a cada requisição, tem rate limiter para proteger I/O
- [ ] Se o rate limiter usa store em memória, está documentado que não funciona em multi-processo
- [ ] Se o endpoint faz escrita em `api-keys.json`, usa `withWriteLock()` (ver SEC-05)
- [ ] Se o endpoint armazena dados em cache, verifica tamanho antes de inserir (ver SEC-06)
- [ ] Se o endpoint é um webhook de pagamento, valida token de autenticação obrigatório (ver SEC-07)

---

### [SEC-05] Race Condition — Mutex em memória + escrita atômica no apiKeyStore

**Data:** Abril 2026
**Arquivos alterados:**
- `backend/services/apiKeyStore.js`

**O que mudou:**

Todas as operações de escrita no `api-keys.json` foram envolvidas em `withWriteLock()`, um mutex baseado em Promise chain que serializa escritas concorrentes no mesmo processo.

Adicionalmente, `saveKeys()` agora usa escrita atômica via arquivo temporário:

Antes:
```js
fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
```

Depois:
```js
fs.writeFileSync(KEYS_FILE_TMP, JSON.stringify(keys, null, 2));
fs.renameSync(KEYS_FILE_TMP, KEYS_FILE);
```

**Por que:** Sem serialização, duas requisições simultâneas (ex: dois usuários consumindo crédito ao mesmo tempo) podiam executar o ciclo leitura→modificação→escrita em paralelo, fazendo com que a segunda escrita sobrescrevesse a primeira. O resultado era crédito gasto duas vezes sem ser decrementado.

A escrita atômica via `renameSync` garante que, se o processo morrer durante a escrita, o arquivo original permanece intacto (o rename é atômico no nível do sistema operacional em Linux/macOS).

**Limitação conhecida:**

O mutex em memória protege apenas dentro de um único processo Node.js. Em deploy com múltiplas instâncias (ex: 2 pods no Kubernetes), a race condition persiste entre processos. A solução definitiva é migrar para Redis (ver ADR-005 em `ARCHITECTURE.md`).

**Alerta para mudanças futuras:**

> ATENÇÃO: Qualquer nova função que faça leitura→modificação→escrita no `api-keys.json` DEVE usar `withWriteLock()`. Nunca chame `loadKeys()` + `saveKeys()` diretamente fora do lock.

> ATENÇÃO: O mutex não protege contra múltiplas instâncias. Se o deploy escalar para 2+ pods, implementar Redis antes de ir para produção multi-instância.

---

### [SEC-06] Proteção OOM — Limite de tamanho por entrada no simulationCache

**Data:** Abril 2026
**Arquivos alterados:**
- `backend/services/core/simulationCache.js`

**O que mudou:**

Adicionada verificação de tamanho antes de inserir entradas no cache. Entradas cujo `editedImageBase64` exceda `MAX_ENTRY_SIZE_BYTES` (padrão: 2MB) são rejeitadas com `console.warn`.

```js
const entrySize = estimateResultSize(result);
if (MAX_ENTRY_SIZE_BYTES > 0 && entrySize > MAX_ENTRY_SIZE_BYTES) {
  console.warn(`[simulationCache] Entrada rejeitada: ${Math.round(entrySize / 1024)}KB excede limite`);
  return;
}
```

O endpoint `/v1/admin/metrics` agora expõe `estimatedMemoryMB` e `evictedCount` para monitoramento proativo.

**Por que:** Com o limite padrão de 100 entradas e imagens de alta resolução (ex: 20MP → base64 ~15MB), o cache podia consumir até 1.5GB de RAM, causando OOM e reinício do processo.

**Configuração via variáveis de ambiente:**

| Variável | Padrão | Descrição |
|---|---|---|
| `SIMULATION_CACHE_MAX_ENTRY_BYTES` | `2097152` (2MB) | Tamanho máximo por entrada |
| `SIMULATION_CACHE_MAX_ENTRIES` | `100` | Número máximo de entradas |
| `SIMULATION_CACHE_TTL_MS` | `1800000` (30min) | TTL por entrada |

**Alerta para mudanças futuras:**

> ATENÇÃO: Se o frontend começar a enviar imagens em resolução maior (ex: 4K), considere reduzir `SIMULATION_CACHE_MAX_ENTRIES` ou `SIMULATION_CACHE_MAX_ENTRY_BYTES` para manter o consumo de RAM dentro do limite do container.

> ATENÇÃO: Monitorar `estimatedMemoryMB` no endpoint `/v1/admin/metrics`. Se ultrapassar 200MB, reduzir `MAX_ENTRIES` ou `MAX_ENTRY_SIZE_BYTES` via variável de ambiente sem necessidade de redeploy.

---

### [SEC-07] Webhook Asaas — Bloqueio obrigatório de ASAAS_WEBHOOK_SECRET em produção

**Data:** Abril 2026
**Arquivos alterados:**
- `backend/routes/billing.js`

**O que mudou:**

O endpoint `POST /v1/billing/webhook` agora verifica se `ASAAS_WEBHOOK_SECRET` está definido quando `NODE_ENV === 'production'`. Se ausente, retorna HTTP 500 e loga erro crítico, impedindo que o webhook processe eventos sem autenticação.

```js
const isProd = process.env.NODE_ENV === 'production';
if (isProd && !secret) {
  console.error('[billing/webhook] ASAAS_WEBHOOK_SECRET não definido em produção.');
  return res.status(500).json({ error: 'Webhook não configurado corretamente.' });
}
if (secret && token !== secret) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

Adicionalmente, `PAYMENT_CONFIRMED` agora registra `lastPaymentDate` no cliente, usado pelo endpoint `/v1/admin/affiliates/:ref`.

**Por que:** Sem `ASAAS_WEBHOOK_SECRET`, qualquer pessoa com o URL do webhook podia enviar um `PAYMENT_CONFIRMED` falso e ativar uma conta sem pagar. A validação existente (`if (secret && token !== secret)`) era silenciosa quando `secret` era `undefined` — o webhook aceitava qualquer requisição.

**Alerta para mudanças futuras:**

> ATENÇÃO: `ASAAS_WEBHOOK_SECRET` deve ser adicionado às variáveis de ambiente de produção (Railway, Render, etc.) antes do deploy. Sem ele, o endpoint retorna 500 para todos os webhooks do Asaas, interrompendo o fluxo de ativação de pagamentos.

> ATENÇÃO: O token é comparado com `!==` (não com `safeCompare`). Para consistência com o padrão SEC-01, considerar migrar para `safeCompare` em versão futura.

---

*Próxima revisão de segurança recomendada: quando `paidClients >= 50` (ver `METRICAS_INTERNAS.md`)*
