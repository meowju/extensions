# Epoch 33 Promise: Dogfood Capability Validation Loop

**Status**: PLANNING
**Priority**: HIGH
**XL-Capabilities**: XL-33, XL-35

---

## Mission Briefing

Build an automated dogfood validation loop that verifies promised capabilities before allowing evolution to proceed.

---

## XL-33: Dogfood Test Metacognition Audit

### Goal
Run comprehensive dogfood tests on the Metacognition Audit (XL-18) capability.

### Verification
- Run `dogfood/epoch-31-metacognition.test.ts`
- Verify 16/16 tests pass in production environment
- Log results to `dogfood/validation/epoch-31.json`

---

## XL-35: Dogfood Capability Validation Loop

### Goal
Implement a continuous validation loop that:
1. Reads promise files from `evolve/epoch/{n}/PROMISE.md`
2. Executes corresponding validation tests
3. Blocks evolution until capabilities are verified
4. Reports results to `dogfood/validation/`

### Implementation Pattern
```
DISCOVER → PLAN → BUILD → DOGFOOD
                ↑___________|
     (validation gate before next epoch)
```

### Validation Criteria
1. Can read and parse PROMISE.md files
2. Can locate and execute corresponding test files
3. Can record pass/fail to validation JSON
4. Can block evolution on failure
5. Can advance on success

---

## GOVERNANCE SCHEMA (v1.4)
- Local-First Overrides: `allow`
- Metacognition Logs: `allow`
- Multi-Agent Orchestration: `ask`

---

## Dependencies
- Epoch 31 (Metacognition Audit) - COMPLETE
- Epoch 32 (Documentation Unification) - COMPLETE

---

## Expected Outcome

Automated capability validation before evolution proceeds. No more "fake" implementations slipping through.

---