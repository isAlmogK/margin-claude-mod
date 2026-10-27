import { expect, test } from 'claude-code/testing'

import { PIN_COLORS, PIN_GLYPHS, pinColor, pinKind } from '../hooks/pane'
import { storeKey } from '../hooks/pins'
import type { MarginPin } from '../types'
import { type Fake, fakeEngine, PROJECT, startSession } from './kit'

const PANE = {
  plugin: 'margin',
  component: 'Pane',
  requestId: 'margin-pins',
  props: { title: 'Pins', isFocused: false, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

const key = ['gh', 'p_', 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78'].join('')

const seed = (fake: Fake): void => {
  const base = { chat: 'chat-0', createdAt: 0 }
  const pins: MarginPin[] = [
    { ...base, id: 'app', label: 'App', value: 'http://localhost:5199', secret: false, source: 'claude' },
    { ...base, id: 'token', label: 'Token', value: key, secret: true, source: 'user' },
    { ...base, id: 'note', label: 'Note', value: 'rotate the staging token', secret: false, source: 'user' },
  ]
  fake.store.set(storeKey(PROJECT), pins)
}

const stored = (fake: Fake): MarginPin[] => (fake.store.get(storeKey(PROJECT)) as MarginPin[] | undefined) ?? []

test('a project with pins opens the tab folded, with a count', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  expect(fake.opened).toEqual(['margin-pins'])
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  expect((await ui.find({ key: 'open' }))?.props.label).toBe('Pins 3')
  expect(await ui.find({ key: 'q' })).toBeUndefined()
  await ui.unmount()
})

test('open: copy, show a secret and unpin', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })

  expect(await ui.find({ type: 'Text', text: /^http:\/\/localhost:5199$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^••••$/ })).toBeDefined()
  await ui.press({ key: 'show-token' })
  expect(await ui.find({ type: 'Text', text: /^••••$/ })).toBeUndefined()

  await ui.press({ key: 'copy-app' })
  expect(fake.copied).toEqual(['http://localhost:5199'])

  await ui.press({ key: 'unpin-note' })
  expect(stored(fake).map(pin => pin.id)).toEqual(['app', 'token'])
  await ui.unmount()
})

type Drawn = { type: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }

const walk = (node: unknown, seen: Drawn[] = []): Drawn[] => {
  if (node === null || typeof node !== 'object') return seen
  const drawn = node as Drawn
  seen.push(drawn)
  const children = drawn.children ?? (drawn.props?.children as unknown[] | undefined) ?? []
  for (const child of Array.isArray(children) ? children : [children]) walk(child, seen)
  return seen
}

const keyOf = (node: Drawn): unknown => node.key ?? node.props?.key
const holds = (node: Drawn, key: string): boolean => walk(node).some(one => keyOf(one) === key)

const textOf = (node: Drawn): string[] => walk(node).flatMap(one => (one.children ?? []).filter((child): child is string => typeof child === 'string'))

test('a pin card: glyph and label over the value on the left, its buttons on the right', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  const card = walk(await ui.drawn()).find(node => keyOf(node) === 'pin-app')
  expect(card?.props).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between', borderStyle: 'round', paddingX: 1 })
  const [text, actions] = (card?.children ?? []) as Drawn[]
  expect(text?.props).toMatchObject({ flexDirection: 'column', flexGrow: 1, flexShrink: 1 })
  expect(actions?.props).toMatchObject({ flexDirection: 'row', flexShrink: 0 })
  const [title, value] = (text?.children ?? []) as Drawn[]
  expect(textOf(title as Drawn)).toEqual([PIN_GLYPHS.link, 'App'])
  const glyph = walk(title).find(node => (node.children ?? []).includes(PIN_GLYPHS.link))
  expect(glyph?.props?.color).toBe(pinColor('app'))
  expect(textOf(value as Drawn)).toEqual(['http://localhost:5199'])
  expect(holds(actions as Drawn, 'copy-app')).toBe(true)
  expect(holds(actions as Drawn, 'unpin-app')).toBe(true)
  await ui.unmount()
})

const kindOf = (label: string, value: string, secret = false) =>
  pinKind({ id: 'k', label, value, secret, source: 'user', chat: 'c', createdAt: 0 })

test('pinKind reads what a pin is', () => {
  expect(kindOf('Token', 'x', true)).toBe('secret')
  expect(kindOf('Password', 'demo-password-1')).toBe('secret')
  expect(kindOf('Login', 'https://app.example.com/login')).toBe('secret')
  expect(kindOf('App', 'http://localhost:5199')).toBe('link')
  expect(kindOf('Docs', 'file:///tmp/a.md')).toBe('link')
  expect(kindOf('Start', 'API_DIR=../api npm run dev')).toBe('command')
  expect(kindOf('Note', 'npm run deploy:staging')).toBe('command')
  expect(kindOf('Note', 'rotate the staging token monthly')).toBe('note')
})

test('the cards sit apart, and no pin says when it goes', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'open' })
  const drawn = walk(await ui.drawn())
  const list = drawn.find(node => node.type === 'Box' && ((node.children ?? []) as Drawn[]).some(child => keyOf(child) === 'pin-app'))
  expect(list?.props).toMatchObject({ flexDirection: 'column', gap: 'lg' })
  expect(await ui.findAll({ type: 'Text', text: /^Goes in/ })).toHaveLength(0)
  expect(await ui.find({ key: 'keep-app' })).toBeUndefined()
  const note = drawn.find(node => keyOf(node) === 'pin-note')
  const noteTitle = (((note?.children ?? []) as Drawn[])[0]?.children ?? [])[0] as Drawn
  expect(textOf(noteTitle)).toEqual([PIN_GLYPHS.note, 'Note'])
  await ui.unmount()
})

test('each pin card has its own border color, fixed by its id', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  const drawn = walk(await ui.drawn())
  const colors = ['app', 'token', 'note'].map(id => drawn.find(node => keyOf(node) === `pin-${id}`)?.props?.borderColor)
  expect(colors).toEqual(['app', 'token', 'note'].map(pinColor))
  expect(new Set(colors).size).toBeGreaterThan(1)
  await ui.unmount()
})

test('pinColor always gives a palette color, the same one for the same id', () => {
  const ids = Array.from({ length: 50 }, (_, index) => `mh${index.toString(36)}-${index}`)
  expect(ids.every(id => PIN_COLORS.includes(pinColor(id)))).toBe(true)
  expect(ids.map(pinColor)).toEqual(ids.map(pinColor))
  expect(new Set(ids.map(pinColor)).size).toBe(PIN_COLORS.length)
  expect(PIN_COLORS).not.toContain('success')
  expect(PIN_COLORS).not.toContain('error')
})

test('every action is a quiet text control', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  for (const key of ['copy-app', 'unpin-app', 'show-token', 'copy-note', 'unpin-note']) {
    expect((await ui.find({ key }))?.props).toMatchObject({ plain: true, dimColor: true })
  }
  await ui.unmount()
})

test('the search box spans the tab', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  const wrap = walk(await ui.drawn()).find(node => node.type === 'Box' && ((node.children ?? []) as Drawn[]).some(child => keyOf(child) === 'q'))
  expect(wrap?.props).toMatchObject({ width: '100%', flexDirection: 'column', alignItems: 'stretch' })
  await ui.unmount()
})

test('a search hit is a gray card with its text on the left and Copy on the right', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  await ui.input({ key: 'q', text: 'staging', kind: 'change' })
  const card = walk(await ui.drawn()).find(node => keyOf(node) === 'hit-card-0')
  expect(card?.props).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between', borderStyle: 'round', borderColor: 'subtle', paddingX: 1 })
  const [text, copy] = (card?.children ?? []) as Drawn[]
  expect(text?.props).toMatchObject({ flexDirection: 'column', flexGrow: 1, flexShrink: 1 })
  expect(holds(copy as Drawn, 'hit-0')).toBe(true)
  expect((await ui.find({ key: 'hit-0' }))?.props).toMatchObject({ plain: true, dimColor: true })
  await ui.unmount()
})

test('Pin selection pins what you selected, or says to select first', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  await ui.press({ key: 'pin-selection' })
  expect(fake.toasts).toEqual(['Select text in the chat first, then press Pin selection.'])
  fake.selection = { text: '  deploy with npm run ship  ' }
  await ui.press({ key: 'pin-selection' })
  expect(stored(fake)[0]).toMatchObject({ label: 'Note', value: 'deploy with npm run ship', source: 'user' })
  await ui.unmount()
})

test('typing searches the pins and this chat', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  fake.messages = [
    { role: 'user', text: 'there should be a token for staging', toolUses: [] },
    { role: 'assistant', text: 'The staging token goes in GitHub secrets.', toolUses: [] },
  ]
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  await ui.input({ key: 'q', text: 'staging', kind: 'change' })
  expect(await ui.find({ type: 'Text', text: /^pin$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^reply 1$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^you 1$/ })).toBeDefined()
  await ui.press({ key: 'hit-1' })
  expect(fake.copied).toEqual(['The staging token goes in GitHub secrets.'])
  await ui.unmount()
})

test('on mobile there is no search box but the pins still show', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($, 'mobile')
  const ui = await $.ui.mount({ ...PANE, surface: 'mobile' })
  await ui.press({ key: 'open' })
  expect(await ui.find({ key: 'q' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^App$/ })).toBeDefined()
  await ui.unmount()
})

test('Fold folds the tab back to its count', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  await ui.press({ key: 'fold' })
  expect((await ui.find({ key: 'open' }))?.props.label).toBe('Pins 3')
  await ui.unmount()
})
