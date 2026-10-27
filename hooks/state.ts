import { atom } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

export type On = Parameters<Register>[0]
export type Engine = EngineInterface

export const PANE = 'margin.pins'

export const pinsAtom = atom({ plugin: 'margin', key: 'pins' } as const, [])
export const queryAtom = atom({ plugin: 'margin', key: 'query' } as const, '')
export const isOpenAtom = atom({ plugin: 'margin', key: 'isOpen' } as const, false)
export const isPeekAtom = atom({ plugin: 'margin', key: 'isPeek' } as const, false)
export const hasPeekedAtom = atom({ plugin: 'margin', key: 'hasPeeked' } as const, false)
export const revealedAtom = atom({ plugin: 'margin', key: 'revealed' } as const, [])
export const isStoreDownAtom = atom({ plugin: 'margin', key: 'isStoreDown' } as const, false)
export const isOffAtom = atom({ plugin: 'margin', key: 'isOff' } as const, false)
export const lastKeepAtom = atom({ plugin: 'margin', key: 'lastKeep' } as const, [])
export const cwdAtom = atom({ plugin: 'margin', key: 'cwd' } as const, '')
