import { expect, test } from 'claude-code/testing'

import { DAY, storeKey } from '../hooks/pins'
import type { MarginPin } from '../types'
import { type Fake, fakeEngine, finishTurn, PROJECT, runCommand, startSession, submit } from './kit'
import { SERVER_REPLY } from './samples'

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
    { ...base, id: 'app', label: 'App', value: 'http://localhost:5199', secret: false, source: 'claude', expiresAt: fake.now.value + DAY },
    { ...base, id: 'token', label: 'Token', value: key, secret: true, source: 'user', expiresAt: null },
    { ...base, id: 'note', label: 'Note', value: 'rotate the staging token', secret: false, source: 'user', expiresAt: null },
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

test('open: copy, show a secret, keep and unpin', async ($, on) => {
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

  await ui.press({ key: 'keep-app' })
  expect(stored(fake).find(pin => pin.id === 'app')?.expiresAt).toBe(null)
  expect(await ui.find({ key: 'keep-app' })).toBeUndefined()

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

test('a pin is a card: label on top, then the value, then its buttons', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  const card = walk(await ui.drawn()).find(node => keyOf(node) === 'pin-app')
  expect(card?.props?.flexDirection).toBe('column')
  const parts = (card?.children ?? []) as Drawn[]
  expect(parts.map(part => part.type)).toEqual(['Text', 'Text', 'Box'])
  expect(walk(parts[0]).some(node => (node.children ?? []).includes('App'))).toBe(true)
  expect(holds(parts[2] as Drawn, 'copy-app')).toBe(true)
  expect(holds(parts[2] as Drawn, 'unpin-app')).toBe(true)
  await ui.unmount()
})

test('a pin from Claude says when it goes, and Keep is a dim control', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  expect(await ui.find({ type: 'Text', text: /^Goes in 24h$/ })).toBeDefined()
  expect((await ui.find({ key: 'keep-app' }))?.props.dimColor).toBe(true)
  expect(await ui.findAll({ type: 'Text', text: /^Goes in/ })).toHaveLength(1)
  await ui.unmount()
})

test('the search box spans the tab', async ($, on) => {
  const fake = fakeEngine(on)
  seed(fake)
  await startSession($)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'open' })
  const wrap = walk(await ui.drawn()).find(node => node.type === 'Box' && ((node.children ?? []) as Drawn[]).some(child => keyOf(child) === 'q'))
  expect(wrap?.props?.width).toBe('100%')
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
  expect(stored(fake)[0]).toMatchObject({ label: 'Note', value: 'deploy with npm run ship', source: 'user', expiresAt: null })
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

test('a peek folds again on your next message', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  await finishTurn($, SERVER_REPLY)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  expect(await ui.find({ key: 'fold' })).toBeDefined()
  await submit($, 'thanks')
  expect(await ui.find({ key: 'open' })).toBeDefined()
  await ui.unmount()
})

test('opening the tab yourself ends the peek', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  await finishTurn($, SERVER_REPLY)
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  await ui.press({ key: 'fold' })
  await ui.press({ key: 'open' })
  await submit($, 'next')
  expect(await ui.find({ key: 'fold' })).toBeDefined()
  await ui.unmount()
})

test('the first peek leaves a tab you opened yourself open', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  await runCommand($, 'margin')
  await finishTurn($, SERVER_REPLY)
  await submit($, 'thanks')
  const ui = await $.ui.mount({ ...PANE, surface: 'vscode' })
  expect(await ui.find({ key: 'fold' })).toBeDefined()
  await ui.unmount()
})
