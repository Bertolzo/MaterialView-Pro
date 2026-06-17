# Staging Validation Checkpoint - Task 15

## Overview

This checkpoint validates that all staging infrastructure is in place and ready for the 24-hour validation period before production deployment. This is **Task 15** in the Phase 1 deployment plan.

**Status**: ✅ Infrastructure Complete - Ready for User Execution

## What This Checkpoint Validates

### 1. Smoke Tests Infrastructure ✅
- **Script**: `scripts/smoke-test.ts`
- **Purpose**: Verify basic endpoint functionality
- **Status**: Complete and tested
- **Tests**:
  - Health check endpoint
  - Image analysis endpoint
  - Rendering endpoint
  - Self-audit integration

### 2. 24-Hour Monitoring Infrastructure ✅
- **Script**: `scripts/monitor-staging.ts`
- **Purpose**: Collect metrics over 24 hours
- **Status**: Complete and tested
- **Metrics Tracked**:
  - Analysis latency (baseline ± 10%)
  - Rendering latency (baseline ± 10%)
  - Success rate (>= 95%)
  - Error rate (< 5%)

### 3. Critical Behavior Validation Infrastructure ✅
- **Script**: `scripts/validate-critical-behavior.ts`
- **Purpose**: Validate critical behaviors are preserved
- **Status**: Complete and tested
- **Behaviors Validated**:
  - Furniture preservation (Req 12.1)
  - L-shape geometric continuity (Req 12.2)
  - Architectural scale accuracy (Req 12.3)

### 4. Documentation ✅
- **Smoke Test Guide**: `docs/operations/smoke-tests.md` (referenced)
- **Monitoring Guide**: `docs/operations/staging-monitoring.md`
- **Validation Guide**: `docs/operations/critical-behavior-validation.md`
- **Quick Start**: `docs/operations/MONITORING-QUICKSTART.md`
- **Summary**: `docs/operations/VALIDATION-SUMMARY.md`

## Checkpoint Verification

### Infrastructure Checklist

- [x] Smoke test script created and executable
- [x] Monitoring script created and executable
- [x] Critical behavior validation script created and executable
- [x] Log directory structure in place
- [x] All scripts have proper error handling
- [x] All scripts have timeout protection
- [x] Documentation complete and comprehensive
- [x] Integration points documented

### Script Verification

All scripts have been created with:
- ✅ TypeScript implementation
- ✅ Proper error handling
- ✅ Timeout protection (30-60 seconds)
- ✅ Detailed console output
- ✅ JSON log file generation
- ✅ Exit codes for CI/CD integration
- ✅ Usage documentation

## What the User Needs to Do

### Prerequisites

Before running validation, ensure:

1. **Staging Environment Deployed** (Task 14.1)
   - Staging URL is accessible
   - Environment variables configured
   - API keys are valid

2. **Node.js and Dependencies**
   ```bash
   # Verify Node.js version (18+)
   node --version
   
   # Install tsx if needed
   npm install -g tsx
   ```

### Validation Workflow

#### Step 1: Run Smoke Tests (5 minutes)

```bash
# Test basic functionality
tsx scripts/smoke-test.ts https://your-staging-url.com
```

**Expected Output**:
```
✅ Passed: 4/4
⏱️  Average Latency: ~5000ms
✅ ALL SMOKE TESTS PASSED
```

**If smoke tests fail**: Do not proceed. Fix issues first.

#### Step 2: Start 24-Hour Monitoring (24 hours)

```bash
# Start monitoring (runs for 24 hours)
tsx scripts/monitor-staging.ts https://your-staging-url.com

# Or run in background
nohup tsx scripts/monitor-staging.ts https://your-staging-url.com > monitor.log 2>&1 &
```

**What it does**:
- Collects metrics every 5 minutes
- Tracks latency, success rate, error rate
- Saves detailed logs to `logs/staging-monitor-{timestamp}.json`
- Prints summary after each collection

**Expected Behavior**:
- Success rate >= 95%
- Error rate < 5%
- Analysis latency within 2700-3300ms
- Render latency within 7200-8800ms

#### Step 3: Run Critical Behavior Validation (10 minutes)

```bash
# Can run anytime during or after monitoring
tsx scripts/validate-critical-behavior.ts https://your-staging-url.com
```

**Expected Output**:
```
📊 CRITICAL BEHAVIOR VALIDATION REPORT
Summary:
  Total Tests: 3
  ✅ Passed: 3
  ❌ Failed: 0
  ⚠️  Manual Review: 0

✅ ALL VALIDATIONS PASSED - Critical behaviors preserved
```

**If manual review required**: Follow the manual review process in the documentation.

#### Step 4: Review Results

After 24 hours of monitoring:

1. **Check Final Monitoring Report**:
   - Review console output
   - Check `logs/staging-monitor-*.json`
   - Verify all metrics within acceptable ranges

2. **Check Validation Report**:
   - Review console output
   - Check `logs/critical-behavior-validation-*.json`
   - Verify all tests passed or completed manual review

3. **Make Go/No-Go Decision**:
   - ✅ All checks pass → Proceed to production (Task 16)
   - ⚠️ Manual review needed → Complete review, then proceed
   - ❌ Any failures → Do not deploy, investigate issues

## Success Criteria

This checkpoint is considered **PASSED** when:

### Infrastructure (Already Complete) ✅
- [x] All scripts are created and executable
- [x] All documentation is complete
- [x] All integration points are documented
- [x] Error handling is comprehensive

### User Execution (To Be Done)
- [ ] Smoke tests pass (4/4 tests)
- [ ] 24-hour monitoring completes successfully
- [ ] Success rate >= 95%
- [ ] Error rate < 5%
- [ ] Latency within baseline ± 10%
- [ ] Critical behavior validation passes (3/3 tests)
- [ ] No critical errors in 24-hour period

## Decision Matrix

| Smoke Tests | Monitoring | Validation | Decision |
|-------------|------------|------------|----------|
| ✅ Pass | ✅ Pass | ✅ Pass | Proceed to production |
| ✅ Pass | ✅ Pass | ⚠️ Manual Review | Complete review, then proceed |
| ✅ Pass | ⚠️ Warnings | ✅ Pass | Investigate warnings, consider proceeding |
| ❌ Fail | Any | Any | Do not deploy, fix issues |
| Any | ❌ Fail | Any | Do not deploy, investigate |
| Any | Any | ❌ Fail | Do not deploy, fix critical behaviors |

## Troubleshooting

### Smoke Tests Fail

**Symptoms**: One or more endpoints return errors

**Actions**:
1. Check staging environment is running
2. Verify API keys are configured
3. Check network connectivity
4. Review staging deployment logs
5. Test endpoints manually with curl

### Monitoring Shows High Error Rate

**Symptoms**: Error rate >= 5%

**Actions**:
1. Check error logs for patterns
2. Verify API key quota
3. Check Gemini API status
4. Review recent code changes
5. Consider rollback if critical

### Validation Requires Manual Review

**Symptoms**: Tests return MANUAL_REVIEW status

**Actions**:
1. Follow manual review process in documentation
2. Compare original and rendered images
3. Verify specific behaviors manually
4. Document review results
5. Make informed go/no-go decision

### Monitoring Interrupted

**Symptoms**: Script stops before 24 hours

**Actions**:
1. Check partial results in logs directory
2. Restart monitoring for remaining duration
3. Combine results if needed
4. Document interruption in deployment notes

## Quick Reference

### File Locations

```
scripts/
├── smoke-test.ts                    # Smoke tests
├── monitor-staging.ts               # 24-hour monitoring
└── validate-critical-behavior.ts    # Critical behavior validation

docs/operations/
├── staging-monitoring.md            # Monitoring guide
├── critical-behavior-validation.md  # Validation guide
├── MONITORING-QUICKSTART.md         # Quick start
└── VALIDATION-SUMMARY.md            # Summary

logs/
├── staging-monitor-*.json           # Monitoring logs
└── critical-behavior-validation-*.json  # Validation logs
```

### Command Reference

```bash
# Smoke tests (5 minutes)
tsx scripts/smoke-test.ts <staging-url>

# 24-hour monitoring
tsx scripts/monitor-staging.ts <staging-url> [hours] [interval-minutes]

# Critical behavior validation (10 minutes)
tsx scripts/validate-critical-behavior.ts <staging-url>

# View monitoring results
tsx scripts/view-monitoring-results.ts logs/staging-monitor-*.json
```

## Next Steps

### If Checkpoint Passes

1. **Document Results**:
   - Save all log files
   - Create summary report
   - Note any warnings or issues

2. **Proceed to Task 16**:
   - Deploy production with canary release
   - Start with 10% traffic
   - Monitor closely

3. **Keep Rollback Ready**:
   - Ensure rollback plan is tested
   - Keep staging environment running
   - Monitor production metrics

### If Checkpoint Fails

1. **Do Not Proceed to Production**
2. **Investigate Issues**:
   - Review error logs
   - Check code changes
   - Test locally if needed

3. **Fix and Retest**:
   - Make necessary fixes
   - Redeploy to staging
   - Restart validation process

4. **Document Issues**:
   - Record what went wrong
   - Document fixes applied
   - Update runbooks if needed

## Related Documentation

- [Staging Monitoring Guide](./staging-monitoring.md) - Complete monitoring documentation
- [Critical Behavior Validation Guide](./critical-behavior-validation.md) - Complete validation documentation
- [Monitoring Quick Start](./MONITORING-QUICKSTART.md) - Quick reference
- [Validation Summary](./VALIDATION-SUMMARY.md) - Task 14.4 summary
- [Rollback Plan](./rollback-plan.md) - If issues are found

## Requirements Validated

This checkpoint validates:

- **Requirement 13.5**: Performance testing with acceptable degradation
- **Requirement 14.1**: Staging deployment infrastructure
- **Requirement 14.4**: Comparative metrics collection
- **Requirement 12.1**: Furniture preservation
- **Requirement 12.2**: L-shape geometric continuity
- **Requirement 12.3**: Architectural scale accuracy

## Conclusion

**Infrastructure Status**: ✅ Complete and Ready

All validation infrastructure has been created and is ready for use. The user now needs to:

1. Deploy to staging (if not already done)
2. Run smoke tests to verify basic functionality
3. Start 24-hour monitoring to collect metrics
4. Run critical behavior validation to verify quality
5. Review results and make go/no-go decision

The checkpoint will be considered **PASSED** when all user-executed validations complete successfully and metrics are within acceptable ranges.
