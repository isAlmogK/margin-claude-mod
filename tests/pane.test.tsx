import { expect, test } from 'claude-code/testing'

import { DAY, storeKey } from '../hooks/pins'
import type { MarginPin } from '../types'
import { type Fake, fakeEngine, finishTurn, PROJECT, startSession, submit } from './kit'
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
