import { update } from 'claude-code'
import type { Register } from 'claude-code'

import { loadPins } from './pins'
import { registerTurn } from './turn'

// The state scan reads references written in the file that uses them.
const cwdAtom = { plugin: 'margin', key: 'cwd' } as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await update($, cwdAtom, () => e.cwd)
    await loadPins($)
    return next(e)
  })

  registerTurn(on)
}
