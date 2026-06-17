# Staging Environment Monitoring Guide

## Overview

This guide explains how to monitor the staging environment after deploying the Phase 1 refactoring. The monitoring process collects key metrics over a 24-hour period to ensure the refactored code performs within acceptable parameters before production deployment.

## Monitored Metrics

### 1. Analysis Latency
- **Baseline**: 3000ms (3 seconds)
- **Tolerance**: ± 10%
- **Acceptable Range**: 2700ms - 3300ms
- **Endpoint**: `/api/analyze`

### 2. Rendering Latency
- **Baseline**: 8000ms (8 seconds)
- **Tolerance**: ± 10%
- **Acceptable Range**: 7200ms - 8800ms
- **Endpoint**: `/api/render`

### 3. Success Rate
- **Target**: >= 95%
- **Calculation**: (Successful Requests / Total Requests) × 100

### 4. Error Rate
- **Target**: < 5%
- **Calculation**: (Failed Requests / Total Requests) × 100

## Monitoring Script

### Usage

```bash
# Basic usage (24 hours, 5-minute intervals)
tsx scripts/monitor-staging.ts https://staging.example.com

# Custom duration and interval
tsx scripts/monitor-staging.ts https://staging.example.com 12 10
# Monitors for 12 hours with 10-minute intervals

# Short test run (1 hour, 2-minute intervals)
tsx scripts/monitor-staging.ts https://staging.example.com 1 2
```

### Parameters

1. **staging-url** (required): Base URL of the staging environment
2. **duration-hours** (optional): Monitoring duration in hours (default: 24)
3. **interval-minutes** (optional): Interval between metric collections in minutes (default: 5)

### What It Does

The monitoring script:

1. **Collects Metrics**: Tests both analysis and rendering endpoints at regular intervals
2. **Tracks Latency**: Measures response time for each request
3. **Records Success/Failure**: Tracks HTTP status codes and errors
4. **Calculates Statistics**: Computes averages, percentiles (P50, P95, P99), min/max
5. **Saves Logs**: Writes detailed JSON logs to `logs/staging-monitor-{timestamp}.json`
6. **Prints Reports**: Displays current summary after each collection and final report at the end

### Output

#### During Monitoring

```
[2024-01-15T10:30:00.000Z] Collecting metrics...
  Analysis: ✅ 2850ms
  Render: ✅ 7950ms

────────────────────────────────────────────────────────────
📊 CURRENT METRICS SUMMARY
────────────────────────────────────────────────────────────
Total Requests: 12
Success Rate: 100.00% (target: >= 95%)
Error Rate: 0.00% (target: < 5%)

Analysis Latency:
  Average: 2890ms ✅
  Baseline: 3000ms ± 10% (2700-3300ms)
  Min: 2750ms
  Max: 3100ms
  P50: 2880ms
  P95: 3050ms
  P99: 3100ms

Render Latency:
  Average: 7850ms ✅
  Baseline: 8000ms ± 10% (7200-8800ms)
  Min: 7500ms
  Max: 8200ms
  P50: 7800ms
  P95: 8150ms
  P99: 8200ms
────────────────────────────────────────────────────────────
```

#### Final Report

```
============================================================
📊 FINAL MONITORING REPORT
============================================================
Duration: 24.00 hours
Total Requests: 288
Successful: 285
Failed: 3

Success Rate: 98.96%
Error Rate: 1.04%

✓ Success Rate Check: ✅ PASS
  Target: >= 95%
  Actual: 98.96%

✓ Error Rate Check: ✅ PASS
  Target: < 5%
  Actual: 1.04%

✓ Analysis Latency Check: ✅ PASS
  Target: 3000ms ± 10%
  Range: 2700-3300ms
  Actual: 2950ms
  P95: 3150ms
  P99: 3250ms

✓ Render Latency Check: ✅ PASS
  Target: 8000ms ± 10%
  Range: 7200-8800ms
  Actual: 7890ms
  P95: 8350ms
  P99: 8500ms

📁 Detailed logs saved to: logs/staging-monitor-2024-01-15T10-00-00-000Z.json
============================================================

✅ ALL CHECKS PASSED - Staging environment is stable
```

## Log Files

### Location

Logs are saved to: `logs/staging-monitor-{timestamp}.json`

### Format

```json
{
  "config": {
    "baseUrl": "https://staging.example.com",
    "durationHours": 24,
    "intervalMinutes": 5,
    "baselineAnalysisLatency": 3000,
    "baselineRenderLatency": 8000,
    "tolerancePercent": 0.1,
    "minSuccessRate": 0.95,
    "maxErrorRate": 0.05
  },
  "startTime": "2024-01-15T10:00:00.000Z",
  "snapshots": [
    {
      "timestamp": "2024-01-15T10:00:00.000Z",
      "analysisLatency": 2850,
      "renderLatency": 7950,
      "success": true
    },
    {
      "timestamp": "2024-01-15T10:05:00.000Z",
      "analysisLatency": 2920,
      "renderLatency": 8100,
      "success": true
    },
    {
      "timestamp": "2024-01-15T10:10:00.000Z",
      "analysisLatency": null,
      "renderLatency": null,
      "success": false,
      "error": "HTTP 503: Service Unavailable",
      "statusCode": 503
    }
  ]
}
```

## Interpreting Results

### Success Criteria

All of the following must be true for staging validation:

- ✅ Success Rate >= 95%
- ✅ Error Rate < 5%
- ⚠️ Analysis Latency within baseline ± 10% (warning if outside)
- ⚠️ Render Latency within baseline ± 10% (warning if outside)

### Decision Matrix

| Success Rate | Error Rate | Latency | Decision |
|--------------|------------|---------|----------|
| >= 95% | < 5% | Within baseline | ✅ Proceed to production |
| >= 95% | < 5% | Outside baseline | ⚠️ Investigate latency, consider proceeding |
| < 95% | >= 5% | Any | ❌ Do not deploy, investigate failures |

### Common Issues

#### High Error Rate (>= 5%)

**Possible Causes:**
- API key issues (rotation, rate limits)
- Gemini API instability
- Network connectivity problems
- Configuration errors

**Actions:**
1. Check error logs for patterns
2. Verify API keys are valid and have quota
3. Check Gemini API status
4. Review staging environment configuration

#### High Latency (> baseline + 10%)

**Possible Causes:**
- Increased prompt size from YAML templates
- Network latency to Gemini API
- Resource constraints in staging environment
- Inefficient prompt loading

**Actions:**
1. Compare P95/P99 latencies with baseline
2. Check if latency is consistent or has spikes
3. Profile prompt loading performance
4. Verify staging environment resources

#### Low Success Rate (< 95%)

**Possible Causes:**
- Dependency injection issues
- Prompt template errors
- Feature flag misconfiguration
- Breaking changes in refactored code

**Actions:**
1. Review error messages in logs
2. Compare with smoke test results
3. Test endpoints manually
4. Check for circular dependency issues

## Integration with Deployment Pipeline

### Step 1: Deploy to Staging

```bash
npm run deploy:staging
```

### Step 2: Run Smoke Tests

```bash
tsx scripts/smoke-test.ts https://staging.example.com
```

### Step 3: Start Monitoring

```bash
# Start 24-hour monitoring
tsx scripts/monitor-staging.ts https://staging.example.com

# Or run in background
nohup tsx scripts/monitor-staging.ts https://staging.example.com > monitor.log 2>&1 &
```

### Step 4: Review Results

After 24 hours (or monitoring duration):

1. Check final report in console output
2. Review detailed logs in `logs/` directory
3. Analyze any errors or warnings
4. Make go/no-go decision for production

### Step 5: Production Deployment

If all checks pass:

```bash
# Deploy with canary release
npm run deploy:production:canary
```

If checks fail:

```bash
# Rollback or investigate
npm run rollback:staging
```

## Baseline Adjustment

If you need to adjust baseline metrics based on actual production performance:

1. Edit `scripts/monitor-staging.ts`
2. Update `DEFAULT_CONFIG` values:

```typescript
const DEFAULT_CONFIG: Partial<MonitoringConfig> = {
  baselineAnalysisLatency: 3500, // Adjust based on production data
  baselineRenderLatency: 9000,   // Adjust based on production data
  tolerancePercent: 0.10,        // Keep at 10%
  minSuccessRate: 0.95,          // Keep at 95%
  maxErrorRate: 0.05,            // Keep at 5%
};
```

## Troubleshooting

### Script Won't Start

```bash
# Check Node.js version (requires Node 18+)
node --version

# Install tsx if missing
npm install -g tsx

# Check staging URL is accessible
curl https://staging.example.com/
```

### Monitoring Interrupted

If monitoring is interrupted (Ctrl+C or system restart):

1. Check `logs/` directory for partial results
2. Restart monitoring for remaining duration
3. Combine results manually if needed

### High Memory Usage

For long monitoring periods (> 24 hours):

1. Reduce interval frequency (e.g., 10 minutes instead of 5)
2. Monitor in shorter segments (e.g., 12 hours × 2)
3. Clear old log files periodically

## Best Practices

1. **Run During Low Traffic**: Schedule monitoring during off-peak hours
2. **Monitor Continuously**: Don't stop monitoring early unless critical issues found
3. **Save Logs**: Archive logs for historical comparison
4. **Compare Baselines**: Compare with previous monitoring runs
5. **Document Issues**: Record any anomalies or patterns observed
6. **Automate**: Integrate monitoring into CI/CD pipeline

## Related Documentation

- [Smoke Test Guide](../operations/smoke-tests.md)
- [Rollback Plan](../operations/rollback-plan.md)
- [Phase 1 Architecture](../architecture/phase1-architecture.md)
- [Deployment Guide](../operations/deployment.md)
