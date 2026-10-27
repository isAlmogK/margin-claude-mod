# Keep card hover buttons and Still open Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Keep card shows Copy and Pin only on hover (desktop, VS Code) in a reserved right gutter, lines labels and values up in columns, and adds a Still open section from `- ` lines in the `keep` fence.

**Architecture:** `hooks/keep.ts` gains `readKeep(lines)` that splits a fence into facts and open items; `hooks/reply.tsx` draws both with a fixed gutter per row whose inner Box is revealed by the row's hover scope; `hooks/pins.ts` matches `Still open` pins on label and value; `hooks/note.ts` teaches the `- ` lines.

**Tech Stack:** Claude Code mod (TypeScript/TSX hooks module), `claude plugin test`, `claude plugin validate`, `tsc` 5.6.3.

**Spec:** [2026-10-27-keep-card-hover-design.md](../specs/2026-10-27-keep-card-hover-design.md)

## Global Constraints

- Facts capped at six (`KEEP_MAX`), open items at three (`OPEN_MAX`); open items do not count toward six.
- Hover reveal on `desktop` and `vscode` only; `terminal` and `mobile` always show the gutter.
- Button keys stay `keep-copy-<i>`, `keep-pin-<i>`; open rows use `open-pin-<i>`; rows are `keep-row-<i>`, `open-row-<i>`.
- The open-item pin label is exactly `Still open`.
- Hooks modules have no DOM and no Node; state references are declared in each file that uses them.
- Checks: `claude plugin test .`, `claude plugin validate .`, `npx -y -p typescript@5.6.3 tsc -p .`.

---

### Task 1: Read open items from the keep fence; keep Still open pins apart

**Files:**
- Modify: `hooks/keep.ts`, `hooks/pins.ts:18-21`
- Test: `tests/keep.test.ts`, `tests/pins.test.ts`

**Interfaces:**
- Produces: `OPEN_MAX = 3`, `OPEN_LABEL = 'Still open'`, `type KeepCard = { items: MarginKeepItem[]; open: string[] }`, `readKeep(lines: readonly string[]): KeepCard` (secrets dropped from both). `fromKeepLines` unchanged in signature, now skips `- ` lines.

- [ ] **Step 1: Failing tests** in `tests/keep.test.ts`:

```ts
test('- lines are what is still open, three at most, apart from the six facts', () => {
  const lines = ['A: 1', '- not checked in the app', 'B: 2', '-   ', '- waiting on review', '- c', '- d', 'C: 3']
  expect(readKeep(lines)).toEqual({
    items: ['A', 'B', 'C'].map((label, index) => ({ label, value: String(index + 1), source: 'claude' })),
    open: ['not checked in the app', 'waiting on review', 'c'],
  })
  expect(fromKeepLines(lines).map(item => item.label)).toEqual(['A', 'B', 'C'])
})

test('a still-open line holding a key is dropped', () => {
  const key = ['gh', 'p_', 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78'].join('')
  expect(readKeep([`- rotate ${key}`, '- merge the PR']).open).toEqual(['merge the PR'])
})
```

and in `tests/pins.test.ts`, next to the Note test, using that file's `pin` helper:

```ts
test('Still open pins are matched by label and value', () => {
  const open = (id: string, value: string) => pin({ id, label: 'Still open', value })
  expect(mergePins([open('o1', 'a')], [open('o2', 'b')]).map(one => one.value)).toEqual(['b', 'a'])
})
```

- [ ] **Step 2:** `claude plugin test .` — expect the three new tests to fail (`readKeep` missing; second pin replaced the first).

- [ ] **Step 3: Implement.** `hooks/keep.ts`:

```ts
export const OPEN_MAX = 3
export const OPEN_LABEL = 'Still open'

const OPEN_LINE = /^-\s+(.*)$/

export type KeepCard = { items: MarginKeepItem[]; open: string[] }

const isOpenLine = (line: string): boolean => OPEN_LINE.test(line.trim())

export const fromKeepLines = (lines: readonly string[]): MarginKeepItem[] =>
  lines
    .filter(line => !isOpenLine(line))
    .map(line => LINE.exec(line.trim()))
    // …rest unchanged

// A keep fence holds facts (`Label: value`) and what is still open (`- text`), secrets dropped.
export const readKeep = (lines: readonly string[]): KeepCard => ({
  items: fromKeepLines(lines).filter(item => !isSecret(item.value)),
  open: lines
    .filter(isOpenLine)
    .map(line => (OPEN_LINE.exec(line.trim())?.[1] ?? '').trim())
    .filter(text => text !== '' && !isSecret(text))
    .slice(0, OPEN_MAX),
})
```

`hooks/pins.ts` `matchKey`: `return label === 'note' || label === 'still open' ? \`${label}:${pin.value}\` : label`.

- [ ] **Step 4:** `claude plugin test .` — all pass.
- [ ] **Step 5:** Commit `feat: read what is still open from the keep fence`.

### Task 2: Draw the card in columns with a hover gutter and Still open

**Files:**
- Modify: `hooks/reply.tsx` (the `keep` computation and the card JSX)
- Test: `tests/reply.test.tsx`, `tests/samples.ts`

**Interfaces:**
- Consumes: `readKeep`, `OPEN_LABEL` from Task 1; `addItems($, items)` from `hooks/pins.ts`.
- Produces: `GUTTER = 12` exported from `hooks/reply.tsx`.

- [ ] **Step 1: Failing tests.** Add `OPEN_REPLY` to `tests/samples.ts`:

```ts
export const OPEN_REPLY = lines(
  'The fix is pushed.',
  '',
  '```keep',
  'PR: https://github.com/acme/app/pull/10',
  'Cost per request: ~20 tokens',
  '- Not checked in the app',
  '```',
)
```

In `tests/reply.test.tsx` add a local `walk`/`keyOf` (as in `tests/pane.test.tsx`) and:

```ts
const gutterOf = (row: Drawn | undefined): Drawn | undefined =>
  walk(row).find(node => node.type === 'Box' && node.props?.width === GUTTER)?.children?.[0] as Drawn | undefined

test('Copy and Pin show on hover where there is a pointer, always elsewhere', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...reply(OPEN_REPLY), surface })
    const nodes = walk(await ui.drawn())
    for (const key of ['keep-row-0', 'keep-row-1', 'open-row-0']) {
      const inner = gutterOf(nodes.find(node => keyOf(node) === key))
      if (surface === 'desktop' || surface === 'vscode') expect(inner?.props).toMatchObject({ display: 'none', hover: { display: 'flex' } })
      else expect(inner?.props?.display).toBeUndefined()
    }
    await ui.unmount()
  }
})

test('labels share one column width', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount({ ...reply(OPEN_REPLY), surface: 'desktop' })
  const nodes = walk(await ui.drawn())
  const widths = ['keep-row-0', 'keep-row-1'].map(key => (walk(nodes.find(node => keyOf(node) === key))[1]?.props?.width))
  expect(widths).toEqual(['Cost per request'.length + 1, 'Cost per request'.length + 1])
  await ui.unmount()
})

test('what is still open is listed and pins as a Still open note', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount({ ...reply(OPEN_REPLY), surface: 'vscode' })
  expect(await ui.find({ type: 'Text', text: /^Still open$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Not checked in the app/ })).toBeDefined()
  await ui.press({ key: 'open-pin-0' })
  const pins = (fake.store.get(storeKey(PROJECT)) as MarginPin[] | undefined) ?? []
  expect(pins.map(pin => [pin.label, pin.value])).toEqual([['Still open', 'Not checked in the app']])
  expect(await ui.find({ key: 'open-pin-0' })).toBeUndefined()
  await ui.unmount()
})
```

- [ ] **Step 2:** `claude plugin test .` — expect the three new tests to fail.

- [ ] **Step 3: Implement** in `hooks/reply.tsx`:

```tsx
export const GUTTER = 12
const HOVER_SURFACES: readonly string[] = ['desktop', 'vscode']

// in the hook:
const card = readKeep(blocks.flatMap(block => (block.kind === 'keep' ? block.lines : [])))
const keep = card.items
const pins = keep.length + card.open.length === 0 ? [] : await read($, pinsAtom)
const labelWidth = Math.max(0, ...keep.map(item => item.label.length)) + 1
const hasHover = HOVER_SURFACES.includes(e.surface)
const pin = (item: { label: string; value: string }, key: string) =>
  isPinned(item.label, item.value)
    ? <Text size="caption" color="subtle">Pinned</Text>
    : <Button key={key} plain dimColor label="Pin" onPress={() => { void addItems($, [{ ...item, source: 'claude' }]).then(() => $.ui.open({ id: PANE, title: 'Pins' })) }} />
// The gutter is always reserved, so revealing its buttons never reflows the row.
const gutter = (buttons: unknown[]) => (
  <Box width={GUTTER} flexShrink={0}>
    <Box flexDirection="row" gap={1} flexGrow={1} justifyContent="flex-end" {...(hasHover ? { display: 'none' as const, hover: { display: 'flex' as const } } : {})}>{buttons}</Box>
  </Box>
)
```

Card JSX: a fact row is `<Box key={\`keep-row-${index}\`} flexDirection="row">` holding `<Box width={labelWidth} flexShrink={0}><Text color="subtle">{label}</Text></Box>`, `<Box flexGrow={1} flexShrink={1}><Text mono>{value}</Text></Box>` and `gutter([Copy, pin(item, \`keep-pin-${index}\`)])`. When `card.open` is not empty: `<Text size="caption" color="subtle">Still open</Text>`, then per item `<Box key={\`open-row-${index}\`} flexDirection="row"><Box flexGrow={1} flexShrink={1}><Text>• {runs(text)}</Text></Box>{gutter([pin({ label: OPEN_LABEL, value: text }, \`open-pin-${index}\`)])}</Box>`. The card shows when either list is non-empty.

- [ ] **Step 4:** `claude plugin test .` and `tsc` — all pass; existing Keep card tests still pass.
- [ ] **Step 5:** Commit `feat: Keep card buttons on hover, aligned columns, Still open`.

### Task 3: Teach the note the `- ` lines

**Files:** Modify `hooks/note.ts`; Test `tests/note.test.ts`.

- [ ] **Step 1:** Add to the keep-rule test: `expect(rule).toContain('still open')` and `` expect(rule).toContain('`- ` lines') ``; raise the word cap from 170 to 190.
- [ ] **Step 2:** Run — fails.
- [ ] **Step 3:** Append to the keep rule: `` Add what is still open (untested, unmerged, waiting on the person) as `- ` lines, at most three. ``
- [ ] **Step 4:** Run — passes. Measure the note's words and tokens (chars / 4).
- [ ] **Step 5:** Commit `feat: the note asks for what is still open`.

### Task 4: Docs, live check, push

- [ ] `docs/margin.md`: `hooks/reply.tsx` and `hooks/keep.ts` rows, Pin rules (`Still open` matches on label and value), Token cost numbers.
- [ ] `README.md`: the Keep card paragraph, the `keep` example with a `- ` line, the note's word and token counts.
- [ ] `CHANGELOG.md`: Unreleased entries.
- [ ] Spec: `**Status:** Implemented (2026-10-27)` and `## As built`.
- [ ] Check the card in the live desktop app with the mod loaded from this worktree.
- [ ] Test, validate, type-check; commit `docs: …`; push to PR #10 and update its description.
