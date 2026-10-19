# DDR-008 — Batch-mutation preview

Status: Accepted

Date: 2026-10-19

## Context

Until CSV import (#185, Phase 21), every mutation in the UI took one of two shapes:

* **Immediate** — a form's `handleSubmit` (`CoinsManager`, `ValuationsManager`,
  `ProfileForm`). The collector typed the values on screen, so what they see is
  exactly what gets written. There is nothing left to disclose.
* **One-shot confirm** — `<ConfirmButton>` (collection, image, invoice and account
  deletion). The action's label fully states its effect — "delete this collection"
  — so a single "are you sure?" is enough.

Import is a **batch mutation whose effect depends on content the collector cannot
see in the UI**. A file of unknown length goes in. Some rows may fail validation.
Because the CSV contract carries no coin id, the import is additive, and importing
an export a second time doubles every coin (ADR-017 §14). Neither existing shape
fits:

* There is no form, so an immediate submit would write first and only then reveal
  what it did. There is no practical undo.
* A confirm can only ask "Import this file?". It cannot say how many coins will be
  added, which rows will be skipped and why, or that the collector already has
  these coins.

Only a **dry run** knows the effect, and the collector needs to read it before they
commit. This DDR records how the UI presents that, so the next batch mutation uses
the same shape instead of inventing another.

## Decision

### 1. Choose → preview → commit, with the preview computed by the commit's code path

The interaction has three steps: choose the input, read a server-computed preview
that writes nothing, then commit. Both the preview and the commit run through the
same validation. The commit re-validates from scratch and does not trust anything
the preview returned (ADR-017 §16 is the architecture side). So the preview is a
real dry run, not a client-side estimate that can disagree with the result.

### 2. An inline `.card.stack` panel, not a modal

The panel is a plain `<section className="card stack">` placed above the list,
where the add/edit form sits. It and the form are **mutually exclusive**: opening
either one closes the other.

* **Why not a modal:** the error list has no upper bound. A modal traps it in a
  viewport-sized box, which is worst on a phone (DDR-006), and a modal hides the
  list the collector is adding to.
* **No new CSS:** it uses the same construction as the add/edit form.
* **Focus is managed by hand**, because an inline region does not get the
  `<dialog>` behaviour for free. The panel is a `tabIndex={-1}` region focused on
  open and labelled by its heading. Escape closes it unless a request is in
  flight. On close, the owning manager returns focus to the trigger button.

### 3. Counts are always stated, including zero

The preview always names every outcome bucket ("37 rows read", "35 coins will be
added to Roman", "2 rows cannot be imported and will be skipped"), **even when a
count is zero**. If a zero line were simply left out, the collector could not tell
it apart from a UI that forgot to check.

The summary sits in an `aria-live="polite"` region. The dry run is async, so a
screen-reader user hears the counts without having to look for them.

### 4. The commit control is labelled with its own count

The commit button says what it will do: **"Add 37 coins"**, never "Confirm" or
"Import". The surrounding copy names the target ("…to Roman"). The button is
**disabled at zero**.

This is the moment the action becomes irreversible, and it is where the additive
hazard is disclosed. A collector who already has those 37 coins should notice at
this button. The label makes the duplicate visible. It cannot prevent it, and
ADR-017 §14 accepts that.

### 5. Failures are itemised, and the list is capped

Each rejected row is listed with its row number, the column, and the reason, in a
`.table-wrap` table. Past the cap, the list ends with "…and N more". The column is
shown as the input's **literal identifier** (the English CSV header, as written in
the file), not as a localized label. Showing the file's own text lets the collector
find the cell.

### 6. The same panel reports the result

After commit, the panel stays open and switches to past tense ("35 coins added to
Roman"), with Close as the only action. The manager reloads whatever the write may
have changed: for import, the coin list (on page 1) and the facets, because new
metals and categories may have appeared. There is no toast or navigation, so the
collector reads the outcome where they read the preview.

### 7. The demo tenant does not get it

A batch mutation is a write. The affordance is removed, not disabled (DDR-007).

## When to use which

| The effect of the write is… | Use |
| --- | --- |
| exactly the values the collector typed on screen | immediate `handleSubmit` |
| fully stated by the action's label | `<ConfirmButton>` |
| knowable only by running it: depends on supplied content, may partly fail, or may collide with existing data | **this pattern** |

### First case checked against it: restore — declined

The original story (#186) expected full-account **restore** (Phase 22) to be the
next consumer. When restore was designed, it was checked against this pattern and
**deliberately did not adopt it** (ADR-017 §24). Restore creates **new**
collections and touches nothing that already exists, so it has no
duplicate-into-existing hazard to preview. Previewing would also mean uploading a
multi-MB archive twice. Restore therefore uses a `<ConfirmButton>` that states it
*adds* and never replaces, followed by a result summary.

That decision fits the table above: restore's effect can be stated in its label.
This DDR does not reopen it. **Revisit trigger:** if restore ever gains a mode that
writes into existing data (merge, replace, or partial restore), it falls under this
pattern.

### Not a shared component yet

The pattern has one consumer, `ImportCsvPanel`. It stays a component-local
implementation until a second consumer exists. Extract a shared panel then, using
the two real cases as the specification, not before.

## Alternatives Considered

### Option A — `<dialog>` modal (as `ConfirmButton` uses)

Pros:
* Native focus trap and focus restore, and Escape works for free.
* Consistent with the existing confirm primitive.

Cons:
* Puts an unbounded error list in a viewport-sized box, which is worst on a phone.
* Hides the list the import is about to change.

### Option B — `ConfirmButton` alone ("Import this file?")

Pros:
* No new interaction, and one click fewer.

Cons:
* Asks for consent without stating what the collector is agreeing to. It cannot
  show counts, skipped rows, or the duplicate hazard. This was rejected for import;
  it is the right call for restore (see above).

### Option C — Write immediately, then report

Pros:
* Simplest flow, and a single upload.

Cons:
* Discloses the effect only after it is irreversible. With no undo, a mistaken
  re-import leaves the collector deleting duplicates one coin at a time.

### Option D — A dedicated preview page or route

Pros:
* Room for very large previews, and a linkable state.

Cons:
* Navigates away from the list being changed, and adds a page for a transient
  step. Holding the parse between pages would need server-side state, which
  ADR-017 §16 rejected.

## Consequences

Benefits:
* A batch write states its effect, counted and with failures itemised, at the
  moment the collector commits to it.
* There is a clear rule for choosing between the three mutation shapes, so the
  next batch write does not need a fresh design discussion.
* No new CSS, no new dependency, and no new primitive.

Tradeoffs:
* Two round trips, and the input is uploaded twice. That is cheap for a CSV and the
  reason restore declined the pattern (ADR-017 §24).
* Focus handling is hand-rolled because the panel is not a `<dialog>`. Each
  consumer must focus the panel on open and return focus to the trigger on close.

Risks:
* **Disclosure, not prevention.** A collector who does not read "Add 37 coins"
  still gets duplicates. The pattern makes the hazard visible; it does not make it
  impossible.
* If a second consumer copies `ImportCsvPanel` instead of extracting from it, the
  two will drift apart. When that consumer arrives, extract a shared panel.

## Related Documents

* `src/components/coins/ImportCsvPanel.tsx` — the reference implementation
* `src/components/settings/AccountDataSection.tsx` — restore, the `ConfirmButton`
  counter-case
* ADR-017 — CSV import addendum (§14 additive, §16 one route with a `commit` flag)
  and archive addendum (§24 restore is single-step)
* DDR-006 — responsive layout (why not a modal on a phone)
* DDR-007 — demo mode UI (affordances removed, not disabled)
* `src/components/README.md` — `<ConfirmButton>` convention
* Issues: #185 (CSV import), #186 (this record), epic #180
