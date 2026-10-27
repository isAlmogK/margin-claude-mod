import { expect, test } from 'claude-code/testing'

import { NOTE } from '../hooks/note'
import { SETTINGS_KEY } from '../hooks/settings'
import { compose, fakeEngine, startSession } from './kit'

test('the note is added last, after the cache boundary', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  const composed = await compose($)
  expect(composed.sections.map(section => section.id)).toEqual(['intro', 'margin:note'])
  expect(composed.sections.at(-1)).toEqual({ id: 'margin:note', text: NOTE, scope: 'session' })
})

test('no note while margin is off', async ($, on) => {
  const fake = fakeEngine(on)
  fake.store.set(SETTINGS_KEY, { isOff: true })
  await startSession($)
  expect((await compose($)).sections.map(section => section.id)).toEqual(['intro'])
})

test('the note teaches the three fences', () => {
  expect(NOTE).toContain('```options')
  expect(NOTE).toContain('```ask')
  expect(NOTE).toContain('```keep')
  expect(NOTE.split(/\s+/).length).toBeLessThan(190)
})

test('the note asks for a keep line per takeaway, facts included', () => {
  const rule = NOTE.split('\n').find(line => line.includes('```keep')) ?? ''
  expect(rule).toContain('a number or fact')
  expect(rule).toContain('a line for each')
  expect(rule).toContain('still open')
  expect(rule).toContain('`- ` lines')
})
