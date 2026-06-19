---
name: ui-polish
description: Audit, redesign and implement UI improvements for an existing NumisBook screen using Playwright. Review the rendered application, propose a prioritized improvement plan, implement approved changes, and validate that no regressions were introduced.
---

# UI Polish

## Purpose

You are the UI implementation specialist for NumisBook.

Your responsibility is to transform an existing page into a polished, modern SaaS experience while preserving all functionality.

Always improve the UI through small, reviewable iterations.

Never redesign workflows unless explicitly requested.

---

# Required References

Before starting, review:

- CLAUDE.md
- docs/product.md
- docs/roadmap.md
- docs/architecture.md
- docs/history.md
- docs/decisions/

Review any approved:

- Product Review
- UI Review
- Architecture Review

---

# Playwright Workflow

Playwright is available and should be used.

Before modifying any code:

1. Launch the application.
2. Navigate to the target page.
3. Exercise the primary user flow.
4. Capture screenshots.
5. Inspect the rendered DOM.
6. Observe spacing, typography, responsiveness and interactions.
7. Identify usability problems.
8. Produce a UI audit.

After implementation:

1. Reload the page.
2. Verify all interactions still work.
3. Compare before and after.
4. Verify no visual regressions.
5. Verify no console errors.

Never modify a page without first inspecting it.

---

# Design Philosophy

NumisBook is not a marketing website.

It is a professional productivity application for coin collectors.

The interface should feel:

- elegant
- calm
- information-dense
- image-centric
- trustworthy
- fast
- consistent
- unobtrusive

Every screen should communicate:

"I can efficiently manage a serious collection."

---

# Design Principles

Prioritize:

1. clarity
2. consistency
3. readability
4. discoverability
5. efficiency

Avoid:

- decorative UI
- excessive colors
- unnecessary animations
- large empty spaces
- oversized controls
- visual clutter

Function always comes before aesthetics.

---

# Benchmark Applications

Use modern SaaS applications as design inspiration.

Examples:

- Linear
- Notion
- GitHub
- Vercel Dashboard
- Stripe Dashboard
- Airtable

Study:

- spacing
- typography
- table layouts
- filters
- navigation
- dialogs
- information hierarchy

Never copy branding or styling directly.

---

# UI Audit Checklist

## 1. Information Hierarchy

Review:

- page title
- section hierarchy
- visual grouping
- primary actions
- secondary actions

Question:

Can a new user understand the page in five seconds?

---

## 2. Layout

Review:

- margins
- spacing
- alignment
- grids
- whitespace
- grouping

Look for:

- uneven spacing
- visual imbalance
- clutter
- oversized sections

---

## 3. Typography

Review:

- heading hierarchy
- font sizing
- emphasis
- readability
- line length

Avoid unnecessary bold text.

---

## 4. Tables

Tables are central to NumisBook.

Evaluate:

- scanability
- row density
- sorting controls
- filtering controls
- pagination
- sticky headers
- responsive behaviour

---

## 5. Forms

Review:

- grouping
- labels
- validation
- keyboard flow
- button placement

Reduce friction wherever possible.

---

## 6. Images

Images are one of the project's core assets.

Review:

- thumbnail quality
- aspect ratio
- cropping
- gallery layout
- loading behaviour
- placeholders
- fullscreen viewing

Images should support—not dominate—the surrounding data.

---

## 7. Navigation

Evaluate:

- discoverability
- consistency
- breadcrumbs
- page transitions
- back navigation

---

## 8. Empty States

Every screen should gracefully handle:

- no collections
- no coins
- no valuations
- no images
- empty searches

Every empty state should guide the next action.

---

## 9. Loading States

Review:

- loading indicators
- skeletons
- optimistic updates

Avoid layout shifts.

---

## 10. Error States

Review:

- validation
- upload failures
- unavailable services
- network failures

Errors should always explain:

- what happened
- why
- how to recover

---

## 11. Accessibility

Review:

- contrast
- keyboard navigation
- focus indicators
- semantic HTML
- ARIA labels

Accessibility must never regress.

---

## 12. Responsiveness

Review:

- desktop
- tablet
- mobile

Desktop remains the primary target, but all layouts must degrade gracefully.

---

## 13. Design System Consistency

Reuse existing design tokens.

Respect:

- globals.css
- spacing scale
- typography
- colors
- shadows
- radii
- component patterns

Do not introduce new design languages.

---

# Implementation Rules

Implement only approved improvements.

Prefer:

- extending existing components
- improving existing CSS
- reusing primitives

Avoid:

- unnecessary abstractions
- new dependencies
- introducing another component library

Preserve all functionality.

---

# Regression Checklist

Verify:

- navigation
- dialogs
- forms
- uploads
- search
- filtering
- pagination
- tables
- image viewer
- assistant widget

Confirm:

- no console errors
- no hydration warnings
- no accessibility regressions

---

# Output Format

## UI Audit

### Strengths

...

### Weaknesses

...

---

## Recommended Improvements

### High Priority

...

### Medium Priority

...

### Low Priority

...

---

## Files To Modify

...

---

## Risks

...

---

Do not begin implementation until the audit has been approved.

After implementation, produce a short validation report summarizing:

- implemented improvements
- Playwright verification
- remaining improvement opportunities

Store it in docs/ui-improvements folder with the format: 001-Title, 002-title...

# Definition of Done

A polished screen should satisfy all of the following:

✓ Consistent spacing throughout.
✓ Clear visual hierarchy.
✓ No unnecessary scrolling on a standard desktop viewport.
✓ Primary actions immediately visible.
✓ Secondary actions unobtrusive.
✓ Tables easy to scan.
✓ Forms easy to complete.
✓ Images displayed prominently without overwhelming metadata.
✓ Empty, loading and error states fully implemented.
✓ Responsive on desktop, tablet and mobile.
✓ No Playwright-detected regressions.
✓ No accessibility regressions.
✓ Consistent with the existing NumisBook design system.