# What We Learned

Hard-won lessons from building MaterialView Pro.

## 1. Mocking `fs` with Atomic Writes Requires intercepting `renameSync`

The `apiKeyStore.js` uses an atomic write pattern: `writeFileSync(.tmp)` + `renameSync(.tmp → .json)`.
A mock that only intercepts `writeFileSync` for `api-keys.json` will never update state,
because the actual write goes to `.tmp`. The fix uses an intermediary `tmpStore` that is
copied to `mockStore` inside the `renameSync` handler.

See `services/billing/__tests__/trialFlow.test.js` for the pattern.

## 2. `setImmediate` Does Not Propagate OpenTelemetry Context

Async boundaries like `setImmediate` lose the active trace context.
The fix: capture context before scheduling — `const activeCtx = getContext().active()` —
then wrap the callback: `setImmediate(() => getContext().with(activeCtx, async () => { ... }))`.

Passing the Promise returned by `context.with()` directly to `setImmediate` causes
`TypeError [ERR_INVALID_ARG_TYPE]: The "callback" argument must be of type function` on Node 20+.

## 3. Cache Entry Size Limit Prevents OOM

High-resolution base64 images (e.g. 20MP) can be ~15MB each. With 100 cached entries
that would be 1.5GB of RAM. The `SIMULATION_CACHE_MAX_ENTRY_BYTES=2MB` variable
rejects large entries before insertion. See `services/core/simulationCache.js`.

## 4. Webhook Secrets Must Be Required in Production

Without `ASAAS_WEBHOOK_SECRET`, any POST to `/v1/billing/webhook` can trigger payments.
The original validation (`if (secret && token !== secret)`) was silent when `secret` was
`undefined` — it accepted every request. Fixed in SEC-07.
See `docs/security-changelog.md` and `routes/billing.js`.

## 5. `npm ci` Requires a Synced Lockfile

Adding dependencies to `package.json` without running `npm install` breaks CI.
The lockfile must be regenerated locally and committed alongside `package.json` changes.
`actions/setup-node` with `cache: 'npm'` also requires `cache-dependency-path` when
the lockfile is not at the repository root.
