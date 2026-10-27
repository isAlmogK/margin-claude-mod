import { expect, test } from 'claude-code/testing'

import { DAY, isLive, makePin, mergePins, storeKey } from '../hooks/pins'
import type { MarginPin } from '../types'
import { fakeEngine, finishTurn, PROJECT, startSession } from './kit'
import { NO_KEEP_REPLY, SERVER_REPLY } from './samples'

const pin = (over: Partial<MarginPin>): MarginPin => ({
  id: 'p1', label: 'App', value: 'http://localhost:5199', secret: false, source: 'claude',
  chat: 'chat-0', createdAt: 0, expiresAt: DAY, ...over,
})

const stored = (store: Map<string, unknown>): MarginPin[] => (store.get(storeKey(PROJECT)) as MarginPin[] | undefined) ?? []

test('a pin with the same label replaces the old one and keeps its id', () => {
  const merged = mergePins([pin({})], [pin({ id: 'p2', value: 'http://localhost:5200', createdAt: 5 })])
  expect(merged).toEqual([pin({ value: 'http://localhost:5200', createdAt: 5 })])
})

test('Note pins are matched by label and value', () => {
  const note = (id: string, value: string) => pin({ id, label: 'Note', value, source: 'user', expiresAt: null })
  expect(mergePins([note('n1', 'a')], [note('n2', 'b')]).map(one => one.value)).toEqual(['b', 'a'])
})

test('a pin kept by hand stays kept when Claude updates it', () => {
  expect(mergePins([pin({ expiresAt: null })], [pin({ id: 'p2', value: 'x' })])[0]?.expiresAt).toBe(null)
})

test('pins from Claude expire after a day, pins you add or keep do not', () => {
  expect(makePin({ label: 'App', value: 'u', source: 'claude' }, 'c', 100, false).expiresAt).toBe(100 + DAY)
  expect(makePin({ label: 'Note', value: 'u', source: 'user' }, 'c', 100, false).expiresAt).toBe(null)
  expect(makePin({ label: 'App', value: 'u', source: 'claude' }, 'c', 100, true).expiresAt).toBe(null)
  expect(isLive(pin({ expiresAt: 50 }), 60)).toBe(false)
})

test('a pin you add that looks like a key is marked secret', () => {
  const key = ['gh', 'p_', 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78'].join('')
  expect(makePin({ label: 'Token', value: key, source: 'user' }, 'c', 1, false).secret).toBe(true)
})

test('a finished reply pins its keep items for the project and peeks the tab', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  await finishTurn($, SERVER_REPLY)
  const pins = stored(fake.store)
  expect(pins.map(one => one.label)).toEqual(['App', 'Password', 'Start', 'Stop'])
  expect(pins.every(one => one.source === 'claude' && one.chat === 'chat-1' && one.expiresAt === fake.now.value + DAY)).toBe(true)
  expect(fake.opened).toEqual(['margin-pins'])
  await finishTurn($, NO_KEEP_REPLY)
  expect(fake.opened).toEqual(['margin-pins'])
})

test('the pattern check fills in when a reply has no keep fence', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  await finishTurn($, NO_KEEP_REPLY)
  expect(stored(fake.store).map(one => [one.label, one.source])).toEqual([['App', 'pattern'], ['Password', 'pattern']])
})

test('subagent and aborted turns pin nothing', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  await finishTurn($, SERVER_REPLY, { agentId: 'a1' })
  await finishTurn($, SERVER_REPLY, { isAborted: true })
  expect(fake.store.has(storeKey(PROJECT))).toBe(false)
})

test('saving keeps other chats\' pins and drops expired ones', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  fake.store.set(storeKey(PROJECT), [
    pin({ id: 'other', label: 'Staging', value: 'in GitHub secrets', chat: 'chat-9', expiresAt: null }),
    pin({ id: 'old', label: 'Old', expiresAt: fake.now.value - 1 }),
  ])
  await finishTurn($, NO_KEEP_REPLY)
  expect(stored(fake.store).map(one => one.label)).toEqual(['App', 'Password', 'Staging'])
})

test('when the store is down pins stay for this chat and you are told once', async ($, on) => {
  const fake = fakeEngine(on, { isStoreDown: true })
  await startSession($)
  await finishTurn($, SERVER_REPLY)
  await finishTurn($, NO_KEEP_REPLY)
  expect(fake.toasts).toEqual(['margin: pins are kept for this chat only. Its storage could not be reached.'])
})
