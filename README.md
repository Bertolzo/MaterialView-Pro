# MaterialView Pro

[![CI](https://github.com/Bertolzo/MaterialView-Pro/actions/workflows/deploy.yml/badge.svg)](https://github.com/Bertolzo/MaterialView-Pro/actions/workflows/deploy.yml)
![Node](https://img.shields.io/badge/node-22-green)
![License](https://img.shields.io/badge/license-MIT-blue)

AI-powered material simulation on any surface — floors, walls, ceilings, car bodies,
furniture. Upload an image, choose a material, and get a photorealistic preview with
semantic invariant validation.

---

## Architecture

```
client → POST /v1/simulate → JobManager (202 + jobId)
                                 │
                      setImmediate (background)
                                 │
                     ProviderRouter (cascade)
                         ├─ WaveSpeedAI (cost 0)
                         ├─ Zhipu CogView (cost 1)
                         ├─ Pika Labs (cost 2)
                         └─ Local fallback (textual)
                                 │
                         Validator (invariants)
                         ├─ Shadow preservation
                         ├─ Geometry integrity
                         ├─ Object consistency
                         └─ Perspective coherence
                                 │
                         job.completed → client polls GET /:jobId/status
```

- **Async by default**: POST returns `202` with a `jobId`; client polls `GET /:jobId/status`
- **Sync mode**: Set `X-Sync-Mode: true` header for legacy synchronous behavior
- **Idempotency**: `Idempotency-Key` header prevents duplicate processing (24h TTL)
- **Cache**: In-memory simulation cache with 2MB entry limit and 30min TTL

---

## Quick Start

```bash
git clone https://github.com/Bertolzo/MaterialView-Pro.git
cd MaterialView-Pro/backend

cp .env.example .env
# Edit .env with your API keys:
#   WAVESPEED_API_KEY=<required>
#   ADMIN_SECRET=<required>

npm install
npm run dev     # starts on port 3001
npm test        # 187 tests
```

### Landing Page

```bash
cd landing
npm install
npm run dev     # starts on port 8080
```

### CLI Validator

```bash
cd cli
npm install
npm run dev -- single ./test-photos/sample.jpg -m '{"name":"Cerâmica","category":"ceramic"}'
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/simulate` | Create a simulation job (202 async) |
| `GET` | `/v1/simulate/:jobId/status` | Poll job status |
| `POST` | `/v1/simulate` (X-Sync-Mode) | Synchronous simulation (200) |
| `GET` | `/v1/analyze` | Analyze room/surface from image |
| `POST` | `/v1/billing/webhook` | Asaas payment webhook |
| `GET` | `/health` | Health check |

All routes require `X-API-Key` header except `/health`.

---

## Plans

| Plan | Credits | Rollover | Reset |
|------|---------|----------|-------|
| Trial | 50 | No | Never (fixed) |
| Basic | 200/mo | Yes | Monthly |
| Popular | 500/mo | Yes | Monthly |
| Pro | 1000/mo | Yes | Monthly |
| Enterprise | 3000/mo | Custom | Custom |

---

## Project Structure

```
MaterialView-Pro/
├── backend/          Express API (services, routes, middleware, gateway)
│   ├── services/     Core logic: simulation, billing, AI gateway, validator
│   ├── routes/       HTTP handlers: simulate, analyze, billing, admin
│   ├── middleware/    API key auth, rate limiting, idempotency, safe-compare
│   └── __tests__/    Integration tests (supertest)
├── frontend/         React app (Vite) — main user interface
├── landing/          Marketing site (SPATIALINTEL brand)
├── cli/              CLI validator + lib/ (TypeScript validation engine)
├── api/              Vercel serverless functions
├── docs/             Architecture, security changelog, telemetry guide, ADRs
├── scripts/          Deploy (canary, staging, production, rollback)
└── bin/              Dev utilities
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22, Express |
| Testing | Vitest, supertest, fast-check |
| AI Providers | WaveSpeedAI, Zhipu CogView, Pika Labs, Gemini, HuggingFace |
| Telemetry | OpenTelemetry (Jaeger-compatible) |
| Frontend | React 18, Vite, PlayCanvas Supersplat (3D viewer) |
| Infra | Docker, Vercel, GitHub Actions |

---

## Roadmap

| Cycle | Focus |
|-------|-------|
| **Current** | Cost reduction (prompt cache, timeout/cancellation, catalog cache) |
| **Next** | Pipeline efficiency (unified timeout, server-side caching) |
| **Future** | Clean Architecture consolidation (composition root, port wiring) |

See `docs/architecture/` for detailed strategic backlog.

---

## Learnings

Lessons from building this project are documented in [WHAT_WE_LEARNED.md](./WHAT_WE_LEARNED.md) —
atomic fs mocking, OpenTelemetry context propagation, OOM prevention, and more.

---

## License

MIT
