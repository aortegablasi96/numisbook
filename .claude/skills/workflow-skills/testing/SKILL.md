---
name: testing
description: Design and review testing strategy, edge cases, regression coverage, and validation plans for NumisBook features. Use after implementation or when assessing quality risks before release.
---

# Testing

Validate that implemented features meet requirements, protect existing behavior, and align with current roadmap priorities.

Owns:

- test strategy
- test planning
- regression analysis
- edge-case identification
- risk assessment
- quality validation

Does not own:

- feature definition
- architecture design
- schema design
- feature implementation

--- 

## Workflow Position

This skill owns architectural design and technical planning.

Workflow:

Product Manager
→ UI Designer
→ Architect
→ Database Designer (if needed)
→ ADR Writer (if needed)
→ Implementation Engineer
→ Testing

Before any major refactor:

Refactoring Reviewer
→ Architect
→ Implementation Engineer
→ Testing

Escalate concerns to the appropriate workflow skill when necessary.

---

## Testing Philosophy

Every feature must be tested.

Never assume generated code works.

Verify behavior.

---

## Required Test Categories

### Unit Tests

Business logic.

Examples:

* valuation calculations
* auction comparison
* permissions

---

### Integration Tests

Database interactions.

Examples:

* create collection
* add coin
* upload image
* save valuation

---

### End-to-End Tests

User workflows.

Examples:

* login
* create collection
* add coin
* upload image

---

## Required Validation Areas

Always test:

### Happy Path

Expected success.

### Invalid Input

Bad requests.

### Authorization

Permissions.

### Edge Cases

Boundary conditions.

### Failure Scenarios

External failures.

Examples:

* storage unavailable
* database unavailable
* invalid image upload

---

## Coin Collection Specific Checks

Validate:

* duplicate coins
* missing images
* valuation history integrity
* orphaned records
* auction matching logic

---

## Completion Rules

A feature is not complete until:

* implementation reviewed
* tests created
* edge cases reviewed
* regression risk evaluated

---

## Testing Rules

All features must include:

- Happy path tests
- Validation tests
- Authorization tests
- Failure path tests

Services are the primary unit-test target.

Mock repositories and external services.

No feature is complete without testing review.

---

## Output Format

### Feature Under Test

...

### Test Cases

* ...
* ...
* ...

### Missing Coverage

...

### Regression Risks

...

### Recommended Tests

...

### Approval Status

Pass / Needs Work
