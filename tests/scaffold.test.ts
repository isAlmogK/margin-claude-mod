import { expect, test } from 'claude-code/testing'

import { fakeEngine, PROJECT, startSession } from './kit'

test('margin loads and a session starts', async ($, on) => {
  fakeEngine(on)
  expect(await startSession($)).toEqual({ cwd: PROJECT })
})
