import { read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { registerNote } from './note'
import { registerPane } from './pane'
import { loadPins } from './pins'
import { registerReply } from './reply'
import { loadSettings } from './settings'
import { PANE } from './state'
import { registerTurn } from './turn'

// The state scan reads references written in the file that uses them.
const cwdAtom = { plugin: 'margin', key: 'cwd' } as const
const pinsAtom = { plugin: 'margin', key: 'pins' } as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await update($, cwdAtom, () => e.cwd)
    await loadSettings($)
    await loadPins($)
    if (((await read($, pinsAtom)) ?? []).length > 0) void $.ui.open({ id: PANE, title: 'Pins' })
    return next(e)
  })

  registerNote(on)
  registerReply(on)
  registerTurn(on)
  registerPane(on)
}
