# Pin cards

**Status:** Implemented (2026-10-27)

The Pins tab's cards ran together and their Copy and Unpin buttons were louder than the pin itself.
This change gives each card an edge, puts the actions in the background, and fixes the search box width.

## Design

- **Card.** Each pin and each search hit is a Box with a round border in the subtle color, one cell of padding left and right.
- **Space.** The cards sit in their own column with an `lg` gap between them. The header and search box keep their current spacing.
- **Label row.** The label on the left; on a pin that expires, `Goes in Nh` as a subtle caption on the right of the same row (`justifyContent="space-between"`).
- **Value.** Unchanged: mono, `••••` for a hidden secret.
- **Actions.** One row under the value: Show (hidden secrets only), Copy, Unpin, Keep (expiring pins only). Every action is a `plain dimColor` Button, as Keep was. A search hit has only Copy, drawn the same way.
- **Search box.** Its wrapper Box is a column that stretches its child (`flexDirection="column" alignItems="stretch" width="100%"`), so the Input fills the tab. A Box lays its children in a row by default, which left the Input at its own width.

```
╭───────────────────────────────╮
│ Open Pins tab     Goes in 24h │
│ /margin                       │
│ Copy   Unpin   Keep           │
╰───────────────────────────────╯
```

## Not changing

The folded `Pins N` button, the header row, the reply's Keep card, the pin rules.

## Testing

`tests/pane.test.tsx`: a card is bordered and holds the label row, the value, then the action row; the expiry caption is in the label row; every action is plain and dim; the search wrapper is a stretching column. The search width and the look are checked in the desktop app by eye.

## As built

- The card list gap is `lg`, not `md`. VS Code and the terminal draw both as one row; the desktop app sizes `lg` larger.
- The label row and its `Goes in Nh` caption were removed the same day by [pins you choose](2026-10-27-chosen-pins-design.md), which dropped expiry; Keep went with it.
