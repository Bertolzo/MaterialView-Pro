# Deploy – MaterialView Pro

## Pré-requisitos

- Conta no [Railway](https://railway.app) (backend)
- Conta no [Vercel](https://vercel.com) (frontend)
- Repositório no GitHub com o código deste projeto

---

## 1. Deploy do Backend no Railway

1. Acesse [railway.app](https://railway.app) e crie um novo projeto.
2. Selecione **Deploy from GitHub repo** e conecte este repositório.
3. Defina o **Root Directory** como `pisosrealview-pro-transformed/backend`.
4. O Railway detectará automaticamente o `railway.json` e usará NIXPACKS para o build.
5. Na aba **Variables**, adicione todas as variáveis de ambiente listadas em `backend/.env.example`:

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` (Railway sobrescreve automaticamente) |
| `ADMIN_SECRET` | Senha para rotas `/admin/*` |
| `WAVESPEED_API_KEY` | Chave da API WaveSpeedAI |
| `PIKA_API_KEY` | Chave da API Pika Labs |
| `ZHIPU_API_KEY` | Chave da API ZhipuAI CogView |
| `ASAAS_API_KEY` | Chave da API Asaas (produção: prefixo `$aas_`) |
| `ASAAS_WEBHOOK_SECRET` | Secret para validar webhooks do Asaas |
| `CORS_ORIGIN` | URL pública do frontend no Vercel (ex: `https://materialview.vercel.app`) |

6. Após o deploy, copie a **URL pública** gerada pelo Railway (ex: `https://materialview-backend.up.railway.app`).
7. Valide o health check: `GET https://<railway-url>/health` deve retornar `{ "ok": true }`.

---

## 2. Deploy do Frontend no Vercel

1. Acesse [vercel.com](https://vercel.com) e crie um novo projeto.
2. Importe este repositório do GitHub.
3. Defina o **Root Directory** como `pisosrealview-pro-transformed/frontend`.
4. O Vercel detectará automaticamente o `vercel.json` e configurará o SPA routing.
5. Na aba **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL pública do Railway (ex: `https://materialview-backend.up.railway.app`) |

6. Clique em **Deploy**. O Vercel fará o build com `npm run build` automaticamente.
7. Valide que o frontend carrega e consegue chamar o backend sem erros de CORS.

---

## 3. Configurar Webhook do Asaas

1. Acesse o painel do Asaas → **Configurações → Webhooks**.
2. Adicione um novo webhook com a URL:
   ```
   https://<railway-url>/v1/billing/webhook
   ```
3. Selecione os eventos:
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_OVERDUE`
   - `SUBSCRIPTION_CANCELLED`
4. Defina o **Webhook Secret** e copie o valor para a variável `ASAAS_WEBHOOK_SECRET` no Railway.
5. Use o botão **Testar** do painel do Asaas para confirmar que o endpoint responde com `200 OK`.

---

## Checklist de Validação Pós-Deploy

- [ ] `GET /health` retorna `{ "ok": true }`
- [ ] `POST /v1/analyze` responde via HTTPS
- [ ] `POST /v1/simulate` responde via HTTPS
- [ ] Frontend carrega sem erros de CORS
- [ ] Webhook do Asaas recebe eventos e ativa créditos corretamente
- [ ] Nenhuma chave de API está hardcoded ou em `.env` commitado
