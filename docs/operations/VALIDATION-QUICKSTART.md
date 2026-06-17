# Critical Behavior Validation - Quick Start

## TL;DR

```bash
# Run validation against staging
tsx scripts/validate-critical-behavior.ts https://staging.example.com

# Check the output:
# ✅ All PASS → Proceed to production
# ⚠️  Manual Review → Review flagged items
# ❌ Any FAIL → Do not deploy, fix issues
```

## What It Tests

1. **Furniture Preservation** - Furniture stays in place and looks correct
2. **L-Shape Continuity** - Patterns align seamlessly at corners
3. **Architectural Scale** - Materials appear at realistic scale

## Quick Decision Guide

| Result | Action |
|--------|--------|
| All ✅ PASS | Deploy to production |
| Some ⚠️ MANUAL_REVIEW | Review images manually, then decide |
| Any ❌ FAIL | Do NOT deploy - investigate and fix |

## When to Run

- ✅ After staging deployment (required)
- ✅ Before production deployment (required)
- ✅ After code changes to rendering
- ⚠️ After prompt template changes
- ⚠️ After configuration updates

## Output Location

- Console: Real-time test results
- Log file: `logs/critical-behavior-validation-{timestamp}.json`

## Manual Review Checklist

If tests require manual review:

### Furniture Preservation
- [ ] All furniture items present
- [ ] Positions match original
- [ ] No distortion or artifacts
- [ ] Colors/textures unchanged

### L-Shape Continuity
- [ ] Pattern aligns at corner
- [ ] No visible discontinuity
- [ ] Consistent orientation
- [ ] Natural lighting transition

### Architectural Scale
- [ ] Tile/plank size realistic
- [ ] Proportional to room
- [ ] No distortion
- [ ] Correct perspective

## Common Issues

### All Tests Fail
→ Check staging environment is running
→ Run smoke tests first

### Furniture Test Fails
→ Check self-audit prompt template
→ Verify furniture detection logic

### L-Shape Test Fails
→ Check analysis prompt for L-shape detection
→ Verify render prompt includes continuity

### Scale Test Fails
→ Check deriveMaterialPhysics function
→ Verify material physics includes scale

## Full Documentation

See [Critical Behavior Validation Guide](./critical-behavior-validation.md) for complete details.

## Integration with Pipeline

```
Deploy Staging
    ↓
Smoke Tests ← Start here
    ↓
24h Monitoring
    ↓
Critical Behavior Validation ← YOU ARE HERE
    ↓
Manual Review (if needed)
    ↓
Production Deployment
```

## Need Help?

1. Check [Troubleshooting Guide](./critical-behavior-validation.md#troubleshooting)
2. Review [Staging Monitoring](./staging-monitoring.md)
3. See [Rollback Plan](./rollback-plan.md) if issues found
