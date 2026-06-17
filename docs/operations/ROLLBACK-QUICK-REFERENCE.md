# Rollback Quick Reference

## 🚨 Emergency Rollback (< 5 minutes)

### Step 1: Activate USE_LEGACY_MODE (30 seconds)

```bash
# Choose ONE method:

# Kubernetes
kubectl set env deployment/render-service USE_LEGACY_MODE=true

# Docker Compose
echo "USE_LEGACY_MODE=true" >> .env && docker-compose restart render-service

# Systemd
sudo systemctl set-environment USE_LEGACY_MODE=true && sudo systemctl restart render-service

# PM2
export USE_LEGACY_MODE=true && pm2 restart render-service --update-env
```

### Step 2: Wait for Restart (2-3 minutes)

```bash
# Kubernetes
kubectl rollout status deployment/render-service

# Docker Compose
docker-compose ps render-service

# Systemd
sudo systemctl status render-service

# PM2
pm2 status render-service
```

### Step 3: Verify (30 seconds)

```bash
# Health check
curl https://api.example.com/health

# Verify USE_LEGACY_MODE is active
curl https://api.example.com/debug/feature-flags | grep USE_LEGACY_MODE

# Check metrics
curl https://api.example.com/metrics | grep -E "error_rate|latency_p95"
```

## ✅ Success Criteria

- [ ] Health check returns 200 OK
- [ ] Error rate < 5%
- [ ] Latency p95 within baseline ± 10%
- [ ] Success rate > 95%
- [ ] No critical errors in logs

## 📞 Emergency Contacts

- **Tech Lead:** [Name] - [Phone]
- **DevOps:** [Name] - [Phone]
- **SRE:** [Name] - [Phone]

## 📋 When to Rollback

Execute rollback immediately if:

- ✗ Error rate > 10% for 5+ minutes
- ✗ Latency > baseline + 50% for 5+ minutes
- ✗ Critical functionality broken (furniture preservation, L-shape continuity, architectural scale)
- ✗ Circular dependency errors in logs
- ✗ YAML prompt loading failures

## 🔄 Rollback Test

```bash
# Test rollback procedure
./scripts/test-rollback.sh
```

Expected output: `✓ SUCESSO - Rollback pode ser executado em < 5 minutos`

## 📖 Full Documentation

See [docs/operations/rollback-plan.md](./rollback-plan.md) for complete rollback procedures.

---

**Last Updated:** [Date]  
**Version:** 1.0
