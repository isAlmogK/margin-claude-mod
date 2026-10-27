# Pin card colors

**Status:** Implemented (2026-10-27)

Every pin card had the same gray border, so a long list still read as one block. Each pin card now has its own
border color, and a pin keeps that color for good.

## Design

- **Palette.** Six theme keys, so the colors follow the person's theme on every surface: `claude`, `suggestion`,
  `planMode`, `autoAccept`, `warning`, `ide`. `success` is left out (the reply's Keep card is green) and so is
  `error` (it reads as a failure).
- **Fixed per pin.** `pinColor(id)` hashes the pin's id to one palette entry. Adding, removing or reordering pins
  never repaints another card. Two pins next to each other can share a color.
- **Search hits** keep the `subtle` border, so a result never looks like a pin.

## Not changing

The card layout, the buttons, the gap between cards.

## Testing

`tests/pane.test.tsx`: each pin card's `borderColor` is `pinColor(pin.id)`; `pinColor` always returns a palette
color and the same color for the same id; the three seeded pins don't all share one color; search hit cards stay
`subtle`.

## As built

None.
