import { expect, test } from 'claude-code/testing'

import { readPinArgs } from '../hooks/commands'
import { storeKey } from '../hooks/pins'
import { SETTINGS_KEY } from '../hooks/settings'
import type { MarginPin } from '../types'
import { compose, type Fake, fakeEngine, finishTurn, PROJECT, runCommand, startSession } from './kit'
import { SERVER_REPLY } from './samples'

const stored = (fake: Fake): MarginPin[] => (fake.store.get(storeKey(PROJECT)) as MarginPin[] | undefined) ?? []

test('both commands are registered at the start', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  expect(fake.commands).toEqual(['pin', 'margin'])
})

test('/pin text: a labelled pin or a note, kept until removed', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  expect(await runCommand($, 'pin', 'Staging: token goes in GitHub secrets')).toEqual({ text: 'Pinned "Staging".' })
  expect(await runCommand($, 'pin', 'rotate the token monthly')).toEqual({ text: 'Pinned "Note".' })
  expect(stored(fake).map(pin => [pin.label, pin.source, pin.expiresAt])).toEqual([
    ['Note', 'user', null],
    ['Staging', 'user', null],
  ])
})

test('/pin opens the Pins tab', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  expect(fake.opened).toEqual([])
  await runCommand($, 'pin', 'Note text')
  expect(fake.opened).toContain('margin-pins')
})

test('/pin alone keeps the last reply\'s items for good', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  expect(await runCommand($, 'pin')).toEqual({ text: 'The last reply had nothing to keep. Try /pin Label: value.' })
  await finishTurn($, SERVER_REPLY)
  expect(await runCommand($, 'pin')).toEqual({ text: 'Kept 4 pins from the last reply.' })
  expect(stored(fake).every(pin => pin.expiresAt === null)).toBe(true)
})

test('/margin opens the tab; off and on switch the reply drawing and the note', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  expect(await runCommand($, 'margin')).toEqual({ text: 'Pins tab opened.' })
  expect(fake.opened).toEqual(['margin-pins'])

  await runCommand($, 'margin', 'off')
  expect(fake.store.get(SETTINGS_KEY)).toEqual({ isOff: true })
  expect((await compose($)).sections.map(section => section.id)).toEqual(['intro'])

  await runCommand($, 'margin', 'on')
  expect((await compose($)).sections.map(section => section.id)).toEqual(['intro', 'margin:note'])

  expect(await runCommand($, 'margin', 'sideways')).toEqual({ text: 'Use /margin, /margin off or /margin on.' })
})

test('reading /pin arguments', () => {
  expect(readPinArgs('App: http://localhost:5199')).toEqual({ label: 'App', value: 'http://localhost:5199', source: 'user' })
  expect(readPinArgs('just a thought')).toEqual({ label: 'Note', value: 'just a thought', source: 'user' })
})
