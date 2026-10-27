# Pins you choose

**Status:** Implemented (2026-10-27)

A pin should be something the person decided to keep. Until now a finished reply saved its keep items as pins
that expired after a day, and the Pins tab opened on its own the first time. This change makes every pin a choice.

Getting back to a message is left to Claude Code's own bookmarks (VS Code) and Pin as chapter (the desktop app),
which mods cannot reach. margin's pins hold values to copy: URLs, logins, commands, notes.

## Design

### Only chosen pins

- **No auto-pins.** `turn.complete` records the reply's keep items as `lastKeep` (for `/pin` alone) and nothing else.
- **No peek.** The tab no longer opens on its own after a reply. The `isPeek` and `hasPeeked` state and the
  fold-on-next-message hook go. A project with pins still places the folded tab at session start.
- **Pin on the Keep card.** Each item in a reply's "Keep from this reply" card has two quiet text buttons, Copy and
  Pin. Pin saves the item (source `claude`) and places the Pins tab as it was, folded or open.
  An item already pinned (same label and value) shows a dim `Pinned` caption in place of the Pin button.
- **No expiry.** Pins have no `expiresAt`, so the `Goes in Nh` caption and the Keep button go.
- **Old auto-pins dropped.** A stored pin whose `expiresAt` is a number was saved by a reply and never kept, so
  it is dropped when pins are read. Pins with `expiresAt: null` were chosen and stay; the next save writes them
  back without the field.

## Not changing

The card look, search, secrets, the keep fence and the note to Claude, `/margin`.

## Testing

- `tests/pins.test.ts`: a finished reply pins nothing and opens nothing, but `/pin` alone still pins its items;
  stored pins with a numeric `expiresAt` are dropped on load, and a project left with none opens no tab.
- `tests/reply.test.tsx`: the Keep card has quiet Copy and Pin; Pin saves the item; a pinned item shows `Pinned`.
- `tests/pane.test.tsx`: no expiry caption or Keep button; Fold folds the tab.

## As built

- The pin card's label is a plain line again: with no expiry caption, the label row of the [pin cards](2026-10-27-pin-cards-design.md) design had nothing else to hold.
- Go to (a jump from a pin to its message) was designed and dropped before it was built, since the bookmarks and chapters above already do it.
