import { atom, read, update } from 'claude-code'

import type { MarginPin } from '../types'
import { isLive, savePins } from './pins'
import { searchChat } from './search'
import { type On, PANE } from './state'

// The state scan reads references written in the file that uses them.
const pinsAtom = atom({ plugin: 'margin', key: 'pins' } as const, [] as MarginPin[])
const queryAtom = atom({ plugin: 'margin', key: 'query' } as const, '')
const isOpenAtom = atom({ plugin: 'margin', key: 'isOpen' } as const, false)
const isPeekAtom = atom({ plugin: 'margin', key: 'isPeek' } as const, false)
const isStoreDownAtom = atom({ plugin: 'margin', key: 'isStoreDown' } as const, false)
const revealedAtom = atom({ plugin: 'margin', key: 'revealed' } as const, [] as string[])

const keepPin = (pins: MarginPin[], id: string): MarginPin[] => pins.map(pin => (pin.id === id ? { ...pin, expiresAt: null } : pin))
const dropPin = (pins: MarginPin[], id: string): MarginPin[] => pins.filter(pin => pin.id !== id)

export const registerPane = (on: On): void => {
  // A tab that opened on its own for a new pin folds again once you send your next message.
  on('prompt.submit', async ($, e, next) => {
    if (await read($, isPeekAtom)) {
      await update($, isPeekAtom, () => false)
      await update($, isOpenAtom, () => false)
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    const now = await $.clock.now()
    const pins = (await read($, pinsAtom)).filter(pin => isLive(pin, now))

    if (!(await read($, isOpenAtom))) {
      return (
        <Box flexDirection="row">
          <Button key="open" plain label={`Pins ${pins.length}`} onPress={() => { void update($, isOpenAtom, () => true) }} />
        </Box>
      )
    }

    const query = await read($, queryAtom)
    const revealed = await read($, revealedAtom)
    const isStoreDown = await read($, isStoreDownAtom)
    const messages = query.trim() === '' ? [] : await $.session.messages()
    const hits = searchChat(Array.isArray(messages) ? messages : [], pins, query)

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1}>
          <Text weight="semibold">Pins {pins.length}</Text>
          <Button key="fold" plain label="Fold" onPress={() => { void update($, isOpenAtom, () => false) }} />
        </Box>
        {'Input' in elements ? (
          <elements.Input
            key="q"
            placeholder="Search pins and this chat"
            value={query}
            onInput={value => { void update($, queryAtom, () => value) }}
            onSubmit={value => { void update($, queryAtom, () => value) }}
          />
        ) : null}
        {isStoreDown ? <Text size="caption" color="warning">Pins are kept for this chat only.</Text> : null}
        {query.trim() !== ''
          ? hits.length === 0
            ? <Text color="subtle">Nothing matches.</Text>
            : hits.map((hit, index) => (
                <Box flexDirection="row" gap={1}>
                  <Text size="caption" color="subtle">{hit.where}</Text>
                  <Text>{hit.text}</Text>
                  <Button key={`hit-${index}`} label="Copy" onPress={press => { void $.ui.copy({ text: hit.copy, surface: press.surface }) }} />
                </Box>
              ))
          : pins.length === 0
            ? <Text color="subtle">No pins yet. Use /pin to add one.</Text>
            : pins.map(pin => {
                const isHidden = pin.secret && !revealed.includes(pin.id)
                return (
                  <Box flexDirection="row" gap={1}>
                    <Text weight="medium">{pin.label}</Text>
                    <Text mono>{isHidden ? '••••' : pin.value}</Text>
                    {isHidden ? <Button key={`show-${pin.id}`} label="Show" onPress={() => { void update($, revealedAtom, ids => [...ids, pin.id]) }} /> : null}
                    <Button key={`copy-${pin.id}`} label="Copy" onPress={press => { void $.ui.copy({ text: pin.value, surface: press.surface }) }} />
                    {pin.expiresAt === null ? null : <Button key={`keep-${pin.id}`} label="Keep" onPress={() => { void savePins($, list => keepPin(list, pin.id)) }} />}
                    <Button key={`unpin-${pin.id}`} label="Unpin" onPress={() => { void savePins($, list => dropPin(list, pin.id)) }} />
                  </Box>
                )
              })}
      </Box>
    )
  })
}
