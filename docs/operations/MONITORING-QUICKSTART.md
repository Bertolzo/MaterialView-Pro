# Staging Monitoring Quick Start Guide

## TL;DR

```bash
# 1. Deploy to staging
npm run deploy:staging

# 2. Run smoke tests
tsx scripts/smoke-test.ts https://staging.example.com

# 3. Start 24-hour monitoring
tsx scripts/monitor-staging.ts https://staging.example.com

# 4. Wait 24 hours, then check results
# Final report will show pass/fail status

# 5. View results anytime
tsx scripts/view-monitoring-results.ts logs/staging-monitor-*.json
```

## What Gets Monitored

| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| Analysis Latency | 3000ms | 2700ms - 3300ms (±10%) |
| Render Latency | 8000ms | 7200ms - 8800ms (±10%) |
| Success Rate | >= 95% | 95% - 100% |
| Error Rate | < 5% | 0% - 5% |

## Decision Tree

```
Start Monitoring
    ↓
Wait 24 hours
    ↓
Check Final Report
    ↓
    ├─ ✅ All checks pass → Deploy to production
    ├─ ⚠️ Latency warnings only → Investigate, likely OK to proceed
    └─ ❌ Success/error rate fails → DO NOT DEPLOY, investigate
```

## Example Output

### ✅ Good Result
```
Success Rate: 98.50% ✅
Error Rate: 1.50% ✅
Analysis Latency: 2950ms ✅ (within 2700-3300ms)
Render Latency: 7890ms ✅ (within 7200-8800ms)

✅ ALL CHECKS PASSED - Staging environment is stable
```

### ❌ Bad Result
```
Success Rate: 92.30% ❌ (below 95% target)
Error Rate: 7.70% ❌ (above 5% target)
Analysis Latency: 3450ms ⚠️ (outside 2700-3300ms)
Render Latency: 9200ms ⚠️ (outside 7200-8800ms)

❌ SOME CHECKS FAILED - Review metrics before production deployment
```

## Common Issues

### High Error Rate (> 5%)
**Likely Cause**: API key issues, Gemini API instability
**Action**: Check error logs, verify API keys, check Gemini status

### High Latency (> baseline + 10%)
**Likely Cause**: Network issues, resource constraints, inefficient code
**Action**: Check P95/P99 latencies, profile performance, verify resources

### Low Success Rate (< 95%)
**Likely Cause**: Breaking changes, configuration errors, dependency issues
**Action**: Review error messages, test manually, check for circular dependencies

## Running in Background

```bash
# Start monitoring in background
nohup tsx scripts/monitor-staging.ts https://staging.example.com > monitor.log 2>&1 &

# Check progress
tail -f monitor.log

# Or view latest results
tsx scripts/view-monitoring-results.ts logs/staging-monitor-*.json

# Stop monitoring (if needed)
pkill -f monitor-staging
```

## Short Test Run

For quick validation (not recommended for production decision):

```bash
# 1-hour test with 2-minute intervals
tsx scripts/monitor-staging.ts https://staging.example.com 1 2
```

## Files Created

- `logs/staging-monitor-{timestamp}.json` - Detailed metrics log
- `monitor.log` - Console output (if running in background)

## Next Steps After Monitoring

### If All Checks Pass ✅
1. Review final report
2. Archive monitoring logs
3. Proceed to production deployment:
   ```bash
   npm run deploy:production:canary
   ```

### If Checks Fail ❌
1. Review error logs in detail
2. Investigate root causes
3. Fix issues in code
4. Redeploy to staging
5. Run monitoring again

## Need Help?

- Full documentation: [docs/operations/staging-monitoring.md](./staging-monitoring.md)
- Script reference: [scripts/README-monitoring.md](../../scripts/README-monitoring.md)
- Rollback plan: [docs/operations/rollback-plan.md](./rollback-plan.md)
