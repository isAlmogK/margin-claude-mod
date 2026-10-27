import { expect, test } from 'claude-code/testing'

import { makePin, mergePins, storeKey } from '../hooks/pins'
import type { MarginPin } from '../types'
import { fakeEngine, finishTurn, PROJECT, runCommand, startSession } from './kit'
import { NO_KEEP_REPLY, SERVER_REPLY } from './samples'

const pin = (over: Partial<MarginPin>): MarginPin => ({
  id: 'p1', label: 'App', value: 'http://localhost:5199', secret: false, source: 'claude',
  chat: 'chat-0', createdAt: 0, ...over,
})

const stored = (store: Map<string, unknown>): MarginPin[] => (store.get(storeKey(PROJECT)) as MarginPin[] | undefined) ?? []

test('a pin with the same label replaces the old one and keeps its id', () => {
  const merged = mergePins([pin({})], [pin({ id: 'p2', value: 'http://localhost:5200', createdAt: 5 })])
  expect(merged).toEqual([pin({ value: 'http://localhost:5200', createdAt: 5 })])
})

test('Note pins are matched by label and value', () => {
  const note = (id: string, value: string) => pin({ id, label: 'Note', value, source: 'user' })
  expect(mergePins([note('n1', 'a')], [note('n2', 'b')]).map(one => one.value)).toEqual(['b', 'a'])
})

test('a pin has no expiry', () => {
  const made = makePin({ label: 'Note', value: 'u', source: 'user' }, 'c', 100)
  expect(made).toMatchObject({ chat: 'c', createdAt: 100 })
  expect('expiresAt' in made).toBe(false)
})

test('a pin you add that looks like a key is marked secret', () => {
  const key = ['gh', 'p_', 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78'].join('')
  expect(makePin({ label: 'Token', value: key, source: 'user' }, 'c', 1).secret).toBe(true)
})

test('a finished reply pins nothing and opens nothing', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  await finishTurn($, SERVER_REPLY)
  await finishTurn($, NO_KEEP_REPLY)
  expect(fake.store.has(storeKey(PROJECT))).toBe(false)
  expect(fake.opened).toEqual([])
})

test('the pattern check fills in what /pin alone keeps when a reply has no keep fence', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  await finishTurn($, NO_KEEP_REPLY)
  await runCommand($, 'pin')
  expect(stored(fake.store).map(one => [one.label, one.source])).toEqual([['App', 'pattern'], ['Password', 'pattern']])
})

test('subagent and aborted turns leave nothing for /pin alone', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  await finishTurn($, SERVER_REPLY, { agentId: 'a1' })
  await finishTurn($, SERVER_REPLY, { isAborted: true })
  expect(await runCommand($, 'pin')).toEqual({ text: 'The last reply had nothing to keep. Try /pin Label: value.' })
  expect(fake.store.has(storeKey(PROJECT))).toBe(false)
})

test('old auto-pins are dropped, chosen ones stay, and other chats\' pins are kept', async ($, on) => {
  const fake = fakeEngine(on)
  fake.store.set(storeKey(PROJECT), [
    { ...pin({ id: 'other', label: 'Staging', value: 'in GitHub secrets', chat: 'chat-9' }), expiresAt: null },
    { ...pin({ id: 'auto', label: 'Old' }), expiresAt: fake.now.value + 1000 },
  ])
  await startSession($)
  expect(fake.opened).toEqual(['margin-pins'])
  await runCommand($, 'pin', 'Deploy: npm run ship')
  expect(stored(fake.store).map(one => one.label)).toEqual(['Deploy', 'Staging'])
  expect(stored(fake.store).some(one => 'expiresAt' in one)).toBe(false)
})

test('a project whose only pins were auto-pins opens no tab', async ($, on) => {
  const fake = fakeEngine(on)
  fake.store.set(storeKey(PROJECT), [{ ...pin({ id: 'auto' }), expiresAt: fake.now.value + 1000 }])
  await startSession($)
  expect(fake.opened).toEqual([])
})

test('when the store is down pins stay for this chat and you are told once', async ($, on) => {
  const fake = fakeEngine(on, { isStoreDown: true })
  await startSession($)
  await runCommand($, 'pin', 'One: 1')
  await runCommand($, 'pin', 'Two: 2')
  expect(fake.toasts).toEqual(['margin: pins are kept for this chat only. Its storage could not be reached.'])
})
