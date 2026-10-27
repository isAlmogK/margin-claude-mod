import { update } from 'claude-code'
import type { Register } from 'claude-code'

import { registerNote } from './note'
import { loadPins } from './pins'
import { registerReply } from './reply'
import { loadSettings } from './settings'
import { registerTurn } from './turn'

// The state scan reads references written in the file that uses them.
const cwdAtom = { plugin: 'margin', key: 'cwd' } as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await update($, cwdAtom, () => e.cwd)
    await loadSettings($)
    await loadPins($)
    return next(e)
  })

  registerNote(on)
  registerReply(on)
  registerTurn(on)
}
