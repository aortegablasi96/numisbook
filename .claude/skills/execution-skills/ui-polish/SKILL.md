```md
---
name: ui-polish
description: Implement approved UI and UX improvements for an existing NumisBook screen. Apply Design Decision Records (DDRs), preserve existing functionality, validate the result with Playwright, and ensure no regressions are introduced.
---

# UI Polish

## Purpose

You are responsible for implementing approved UI and UX improvements.

You do not design new interfaces.

You implement the design defined by the workflow.

Your goals are:

- faithful implementation
- visual consistency
- maintainability
- accessibility
- responsive behaviour
- regression-free delivery

---

## Workflow Integration

This is an execution skill.

Before implementation, verify the workflow has been completed.

Expected workflow:

Product Manager

↓

UI Designer

↓

Design Recorder

↓

Architect (if required)

↓

ADR Writer (if required)

↓

Implementation Engineer

↓

UI Polish

↓

Testing

If the required reviews or decision records do not exist, stop and request they be completed before implementation.

Do not redefine approved decisions.

---

## Required References

Review:

- approved Product Review
- approved UI Review
- relevant Design Decision Records (`docs/design-decisions/`)
- relevant Architecture Review (if applicable)
- relevant ADRs (if applicable)

Use project documentation only to verify implementation consistency.

---

## Responsibilities

Implement the approved design.

Improve:

- layout
- spacing
- typography
- responsiveness
- accessibility
- component consistency

Do not:

- redesign workflows
- introduce new interaction patterns
- change business logic
- modify APIs
- alter architecture

If implementation reveals an issue with the approved design, stop and request a new UI Review instead of making independent design decisions.

---

## Implementation Principles

Prefer:

- existing components
- existing design system
- existing design tokens
- existing spacing scale
- existing typography
- existing CSS utilities

Avoid:

- introducing new component libraries
- introducing unnecessary dependencies
- duplicating components
- creating one-off styling

Reuse existing patterns whenever possible.

---

## Playwright Validation

Playwright is available and should always be used.

### Before implementation

1. Launch the application.
2. Navigate to the affected screen.
3. Exercise the primary user workflow.
4. Capture screenshots for comparison.
5. Note implementation considerations.

### After implementation

1. Reload the application.
2. Repeat the same workflow.
3. Compare before and after.
4. Verify that the approved design has been implemented correctly.
5. Verify no console errors.
6. Verify no accessibility regressions.
7. Verify responsive behaviour.

---

## Regression Checklist

Verify:

- navigation
- dialogs
- forms
- uploads
- search
- filtering
- sorting
- pagination
- tables
- image galleries
- assistant widget

Ensure:

- no visual regressions
- no functional regressions
- no hydration errors
- no accessibility regressions

---

## Definition of Done

The implementation is complete when:

✓ All approved design decisions have been implemented.

✓ Existing functionality remains unchanged.

✓ Existing design patterns have been reused whenever possible.

✓ Responsive layouts remain correct.

✓ Accessibility has not regressed.

✓ Playwright validation succeeds.

✓ No console errors are introduced.

✓ No unnecessary dependencies or abstractions were added.

---

## Output Format

### Implementation Summary

...

### Files Modified

...

### Playwright Validation

...

### Regression Results

...

### Remaining Work

...
```
