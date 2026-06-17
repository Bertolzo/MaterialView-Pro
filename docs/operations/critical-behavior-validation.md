# Critical Behavior Validation Guide

## Overview

This guide explains how to validate that the Phase 1 refactoring preserves critical behaviors required for production quality. The validation process tests three essential requirements:

1. **Furniture Preservation** (Requirement 12.1)
2. **L-Shape Geometric Continuity** (Requirement 12.2)
3. **Architectural Scale Accuracy** (Requirement 12.3)

## Critical Behaviors

### 1. Furniture Preservation (Requirement 12.1)

**What it validates:**
- Furniture detection during image analysis
- Furniture position preservation during rendering
- No distortion or modification of furniture items

**Why it's critical:**
Users rely on accurate furniture preservation to visualize flooring changes without affecting their existing room setup. Any furniture distortion or removal would make the rendering unusable.

**Acceptance criteria:**
- System detects furniture with same precision as original
- Furniture items maintain exact positions and appearance
- Self-audit validation confirms furniture preservation

### 2. L-Shape Geometric Continuity (Requirement 12.2)

**What it validates:**
- Detection of L-shaped room geometry
- Identification of corner coordinates
- Seamless pattern transition at corners

**Why it's critical:**
L-shaped rooms are common in residential and commercial spaces. Pattern discontinuity at corners creates unrealistic renderings that users cannot trust for decision-making.

**Acceptance criteria:**
- System detects L-shaped geometry correctly
- Corner coordinates are identified for continuity
- Pattern alignment is seamless across sections

### 3. Architectural Scale Accuracy (Requirement 12.3)

**What it validates:**
- Room dimension estimation
- Scale preservation in rendered output
- Material physics with correct scale

**Why it's critical:**
Incorrect scale makes materials appear unrealistic (tiles too large/small, patterns distorted). Users need accurate scale to make purchasing decisions.

**Acceptance criteria:**
- Scale preserved with maximum 5% tolerance
- Material physics includes architectural scale
- Dimensions are estimated with confidence

## Validation Script

### Usage

```bash
# Basic usage
tsx scripts/validate-critical-behavior.ts https://staging.example.com

# The script will:
# 1. Test furniture preservation
# 2. Test L-shape continuity
# 3. Test architectural scale
# 4. Generate a detailed report
```

### What It Does

The validation script performs automated and semi-automated tests:

1. **Automated Tests**: Calls staging endpoints and validates responses
2. **Validation Checks**: Analyzes response data for critical behaviors
3. **Manual Review Flags**: Identifies cases requiring human verification
4. **Report Generation**: Creates detailed JSON report with results

### Test Flow

#### Test 1: Furniture Preservation

```
Step 1: Analyze image for furniture detection
  ↓
Step 2: Render with furniture preservation
  ↓
Step 3: Validate furniture preservation in output
  ↓
Result: PASS / FAIL / MANUAL_REVIEW
```

#### Test 2: L-Shape Geometric Continuity

```
Step 1: Analyze image for L-shape geometry
  ↓
Step 2: Render with L-shape continuity
  ↓
Step 3: Validate geometric continuity
  ↓
Result: PASS / FAIL / MANUAL_REVIEW
```

#### Test 3: Architectural Scale Accuracy

```
Step 1: Analyze image for room dimensions
  ↓
Step 2: Render with architectural scale
  ↓
Step 3: Validate scale in material physics
  ↓
Result: PASS / FAIL / MANUAL_REVIEW
```

## Output Examples

### Successful Validation

```
🔍 Starting Critical Behavior Validation
============================================================
Staging URL: https://staging.example.com
============================================================

🪑 Test 1: Furniture Preservation (Requirement 12.1)
────────────────────────────────────────────────────────────
  Step 1: Analyzing image for furniture detection...
  ✓ Furniture detected: Yes
  ✓ Furniture items: 3
    1. sofa at center-left (preserve: true)
    2. coffee table at center (preserve: true)
    3. armchair at right (preserve: true)

  Step 2: Rendering with furniture preservation...
  ✓ Rendering completed successfully

  Step 3: Furniture preservation validation
  ✓ Validation passed: Yes

  ✅ PASS: Furniture Preservation

📐 Test 2: L-Shape Geometric Continuity (Requirement 12.2)
────────────────────────────────────────────────────────────
  Step 1: Analyzing image for L-shape geometry...
  ✓ Room shape detected: L-shaped
  ✓ Is L-shaped: Yes
  ✓ L-shape corners detected: 2
    1. Corner at (450, 300)
    2. Corner at (450, 600)

  Step 2: Rendering with L-shape continuity...
  ✓ Rendering completed successfully

  Step 3: Geometric continuity validation
  ✓ Validation passed: Yes

  ✅ PASS: L-Shape Geometric Continuity

📏 Test 3: Architectural Scale Accuracy (Requirement 12.3)
────────────────────────────────────────────────────────────
  Step 1: Analyzing image for room dimensions...
  ✓ Estimated width: 5.2m
  ✓ Estimated depth: 4.8m
  ✓ Confidence: 87.5%

  Step 2: Rendering with architectural scale...
  ✓ Rendering completed successfully

  Step 3: Material physics validation
  ✓ Material physics: reflectance: 0.84, roughness: 0.10, scale: architectural...
  ✓ Contains scale reference: Yes

  ✅ PASS: Architectural Scale Accuracy

============================================================
📊 CRITICAL BEHAVIOR VALIDATION REPORT
============================================================
Staging URL: https://staging.example.com
Timestamp: 2024-01-15T14:30:00.000Z

Summary:
  Total Tests: 3
  ✅ Passed: 3
  ❌ Failed: 0
  ⚠️  Manual Review: 0

────────────────────────────────────────────────────────────
Test Results:
────────────────────────────────────────────────────────────

1. ✅ Furniture Preservation (Req 12.1)
   Status: PASS
   Details: Furniture preservation validated successfully
   Metadata:
     - furnitureDetected: true
     - furnitureCount: 3
     - validationPassed: true
     - issues: []

2. ✅ L-Shape Geometric Continuity (Req 12.2)
   Status: PASS
   Details: L-shape geometric continuity validated successfully
   Metadata:
     - isLShaped: true
     - cornersDetected: 2
     - validationPassed: true
     - issues: []

3. ✅ Architectural Scale Accuracy (Req 12.3)
   Status: PASS
   Details: Architectural scale preserved in material physics
   Metadata:
     - dimensions: {"estimatedWidth":5.2,"estimatedDepth":4.8,"confidence":0.875}
     - hasScaleReference: true

============================================================
✅ ALL VALIDATIONS PASSED - Critical behaviors preserved
   Action: Safe to proceed to production deployment.
============================================================

📁 Detailed report saved to: logs/critical-behavior-validation-2024-01-15T14-30-00-000Z.json
```

### Validation with Manual Review Required

```
============================================================
📊 CRITICAL BEHAVIOR VALIDATION REPORT
============================================================
Staging URL: https://staging.example.com
Timestamp: 2024-01-15T14:30:00.000Z

Summary:
  Total Tests: 3
  ✅ Passed: 2
  ❌ Failed: 0
  ⚠️  Manual Review: 1

────────────────────────────────────────────────────────────
Test Results:
────────────────────────────────────────────────────────────

1. ✅ Furniture Preservation (Req 12.1)
   Status: PASS
   Details: Furniture preservation validated successfully

2. ⚠️  L-Shape Geometric Continuity (Req 12.2)
   Status: MANUAL_REVIEW
   Details: L-shaped room detected but validation data not available - manual review required
   Metadata:
     - isLShaped: true
     - cornersDetected: 2

3. ✅ Architectural Scale Accuracy (Req 12.3)
   Status: PASS
   Details: Architectural scale preserved in material physics

============================================================
⚠️  MANUAL REVIEW REQUIRED - Some tests need human verification
   Action: Review flagged items before production deployment.
============================================================
```

### Failed Validation

```
============================================================
📊 CRITICAL BEHAVIOR VALIDATION REPORT
============================================================
Staging URL: https://staging.example.com
Timestamp: 2024-01-15T14:30:00.000Z

Summary:
  Total Tests: 3
  ✅ Passed: 1
  ❌ Failed: 2
  ⚠️  Manual Review: 0

────────────────────────────────────────────────────────────
Test Results:
────────────────────────────────────────────────────────────

1. ❌ Furniture Preservation (Req 12.1)
   Status: FAIL
   Details: Furniture preservation issues: sofa position shifted, coffee table distorted
   Metadata:
     - furnitureDetected: true
     - furnitureCount: 3
     - validationPassed: false
     - issues: ["sofa position shifted", "coffee table distorted"]

2. ❌ L-Shape Geometric Continuity (Req 12.2)
   Status: FAIL
   Details: Geometric continuity issues: pattern misalignment at corner
   Metadata:
     - isLShaped: true
     - cornersDetected: 2
     - validationPassed: false
     - issues: ["pattern misalignment at corner"]

3. ✅ Architectural Scale Accuracy (Req 12.3)
   Status: PASS
   Details: Architectural scale preserved in material physics

============================================================
❌ VALIDATION FAILED - Critical behaviors not preserved
   Action: Do not proceed to production. Investigate failures.
============================================================
```

## Manual Review Process

When tests require manual review, follow this process:

### 1. Review Test Images

For each flagged test:

1. Locate the rendered image in the response
2. Compare with the original input image
3. Verify the specific behavior manually

### 2. Furniture Preservation Manual Check

**What to look for:**
- [ ] All furniture items are present
- [ ] Furniture positions match original
- [ ] No distortion or artifacts on furniture
- [ ] Furniture colors and textures unchanged
- [ ] No "bleeding" of floor texture onto furniture

**How to verify:**
1. Open original and rendered images side-by-side
2. Count furniture items (should match)
3. Check each item's position (should be identical)
4. Look for any visual artifacts or distortions

### 3. L-Shape Continuity Manual Check

**What to look for:**
- [ ] Pattern alignment at corner is seamless
- [ ] No visible discontinuity or break
- [ ] Tile/plank orientation is consistent
- [ ] Grout lines (if applicable) align properly
- [ ] Lighting transition is natural

**How to verify:**
1. Identify the L-shape corner in the image
2. Zoom in on the corner area
3. Check pattern alignment across the corner
4. Verify no visible seams or misalignments

### 4. Architectural Scale Manual Check

**What to look for:**
- [ ] Tile/plank size appears realistic
- [ ] Material scale matches room size
- [ ] No "toy-like" or oversized appearance
- [ ] Perspective is maintained
- [ ] Proportions look natural

**How to verify:**
1. Compare material size to furniture/room features
2. Check if tiles/planks look proportional
3. Verify perspective lines are correct
4. Ensure no distortion or warping

### 5. Document Manual Review Results

Create a manual review report:

```markdown
# Manual Review Report

**Date:** 2024-01-15
**Reviewer:** [Your Name]
**Staging URL:** https://staging.example.com

## Test: L-Shape Geometric Continuity (Req 12.2)

**Status:** PASS / FAIL
**Notes:**
- Pattern alignment at corner: Seamless
- Visual discontinuity: None observed
- Tile orientation: Consistent across sections
- Overall quality: Acceptable for production

**Decision:** Approve for production / Requires fixes

**Screenshots:**
- Original: [link or attachment]
- Rendered: [link or attachment]
- Corner detail: [link or attachment]
```

## Integration with Deployment Pipeline

### Recommended Workflow

```
1. Deploy to Staging
   ↓
2. Run Smoke Tests
   ↓
3. Start 24-hour Monitoring
   ↓
4. Run Critical Behavior Validation ← YOU ARE HERE
   ↓
5. Manual Review (if needed)
   ↓
6. Go/No-Go Decision
   ↓
7. Production Deployment
```

### When to Run Validation

**Required:**
- After initial staging deployment
- Before production deployment
- After any code changes to rendering logic

**Optional but recommended:**
- Weekly during staging testing
- After configuration changes
- After prompt template updates

### Decision Matrix

| Passed | Failed | Manual Review | Decision |
|--------|--------|---------------|----------|
| 3 | 0 | 0 | ✅ Proceed to production |
| 2 | 0 | 1 | ⚠️ Complete manual review, then proceed |
| 1-2 | 1-2 | 0-1 | ❌ Do not deploy, fix issues |
| 0 | 3 | 0 | ❌ Critical failure, investigate immediately |

## Troubleshooting

### Test Fails: Furniture Preservation

**Possible causes:**
- Prompt template changes affecting furniture detection
- Self-audit logic not working correctly
- Gemini API behavior changes
- Dependency injection issues

**Actions:**
1. Check prompt templates in `prompts/gemini/v1/`
2. Verify self-audit prompt includes furniture checks
3. Test with different images
4. Review self-audit validation logic

### Test Fails: L-Shape Continuity

**Possible causes:**
- L-shape detection logic broken
- Corner coordinate calculation errors
- Prompt template missing L-shape instructions
- Pattern alignment logic issues

**Actions:**
1. Verify analysis prompt includes L-shape detection
2. Check render prompt includes continuity instructions
3. Test with known L-shaped room images
4. Review geometry detection code

### Test Fails: Architectural Scale

**Possible causes:**
- Material physics calculation errors
- Scale reference missing from prompts
- Dimension estimation broken
- deriveMaterialPhysics function issues

**Actions:**
1. Check deriveMaterialPhysics implementation
2. Verify render prompt includes scale instructions
3. Test material physics output format
4. Review dimension estimation logic

### All Tests Fail

**Possible causes:**
- Staging environment not responding
- API keys invalid or expired
- Network connectivity issues
- Critical refactoring bug

**Actions:**
1. Run smoke tests first to verify basic functionality
2. Check staging environment health
3. Verify API keys are configured
4. Review recent code changes
5. Check for circular dependency issues

## Log Files

### Location

Validation reports are saved to: `logs/critical-behavior-validation-{timestamp}.json`

### Format

```json
{
  "stagingUrl": "https://staging.example.com",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "results": [
    {
      "testName": "Furniture Preservation",
      "requirement": "12.1",
      "status": "PASS",
      "details": "Furniture preservation validated successfully",
      "timestamp": "2024-01-15T14:30:15.000Z",
      "metadata": {
        "furnitureDetected": true,
        "furnitureCount": 3,
        "validationPassed": true,
        "issues": []
      }
    }
  ],
  "summary": {
    "total": 3,
    "passed": 3,
    "failed": 0,
    "manualReview": 0
  }
}
```

## Best Practices

1. **Run validation after smoke tests pass**: Don't waste time on detailed validation if basic functionality is broken

2. **Document manual reviews**: Keep records of manual verification for audit trail

3. **Test with real images**: Use actual room photos when possible, not just test images

4. **Compare with baseline**: Keep validation reports from previous runs for comparison

5. **Automate where possible**: Integrate validation into CI/CD pipeline

6. **Review trends**: Look for patterns in manual review requirements

7. **Update baselines**: Adjust validation criteria based on production feedback

## Related Documentation

- [Smoke Test Guide](./smoke-tests.md)
- [Staging Monitoring Guide](./staging-monitoring.md)
- [Rollback Plan](./rollback-plan.md)
- [Phase 1 Architecture](../architecture/phase1-architecture.md)
- [Requirements Document](../../.kiro/specs/multi-provider-ai-architecture/requirements.md)

## Appendix: Test Image Requirements

For comprehensive validation, use test images with:

### Furniture Preservation Test
- Multiple furniture items (3-5)
- Clear furniture boundaries
- Various furniture types (sofa, table, chairs)
- Good lighting

### L-Shape Continuity Test
- Clear L-shaped room geometry
- Visible corner transition
- Existing flooring with pattern
- Multiple room sections

### Architectural Scale Test
- Known room dimensions (if possible)
- Reference objects (furniture, doors)
- Clear perspective
- Standard room size (not too small/large)

### Recommended Test Image Set

Create a test image library with:
- 3 images with furniture (various counts)
- 2 images with L-shaped rooms
- 3 images with different room sizes
- 2 images combining all features

Store in: `test-images/validation/`
