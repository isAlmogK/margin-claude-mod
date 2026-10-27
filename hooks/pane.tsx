import { atom, read, update } from 'claude-code'

import type { MarginPin } from '../types'
import { addItems, savePins, selectedNote } from './pins'
import { searchChat } from './search'
import { type On, PANE } from './state'

// The state scan reads references written in the file that uses them.
const pinsAtom = atom({ plugin: 'margin', key: 'pins' } as const, [] as MarginPin[])
const queryAtom = atom({ plugin: 'margin', key: 'query' } as const, '')
const isOpenAtom = atom({ plugin: 'margin', key: 'isOpen' } as const, false)
const isStoreDownAtom = atom({ plugin: 'margin', key: 'isStoreDown' } as const, false)
const revealedAtom = atom({ plugin: 'margin', key: 'revealed' } as const, [] as string[])

const dropPin = (pins: MarginPin[], id: string): MarginPin[] => pins.filter(pin => pin.id !== id)

export const PICK_FIRST = 'Select text in the chat first, then press Pin selection.'

export const registerPane = (on: On): void => {
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    const pins = await read($, pinsAtom)

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

    const pinSelection = async (): Promise<void> => {
      const selected = await selectedNote($)
      if (selected) await addItems($, [selected])
      else $.ui.toast(PICK_FIRST)
    }

    // Each pin and each hit is a bordered card: its label, the text, then its quiet buttons.
    return (
      <Box flexDirection="column" alignItems="stretch" gap={1}>
        <Box flexDirection="row" gap={1}>
          <Text weight="semibold">Pins {pins.length}</Text>
          <Button key="pin-selection" plain label="Pin selection" onPress={() => { void pinSelection() }} />
          <Button key="fold" plain label="Fold" onPress={() => { void update($, isOpenAtom, () => false) }} />
        </Box>
        {'Input' in elements ? (
          // A Box lays its children in a row by default, which leaves the Input at its own width.
          <Box width="100%" flexDirection="column" alignItems="stretch">
            <elements.Input
              key="q"
              placeholder="Search pins and this chat"
              value={query}
              onInput={value => { void update($, queryAtom, () => value) }}
              onSubmit={value => { void update($, queryAtom, () => value) }}
            />
          </Box>
        ) : null}
        {isStoreDown ? <Text size="caption" color="warning">Pins are kept for this chat only.</Text> : null}
        {query.trim() !== ''
          ? hits.length === 0
            ? <Text color="subtle">Nothing matches.</Text>
            : (
                <Box flexDirection="column" alignItems="stretch" gap="lg">
                  {hits.map((hit, index) => (
                    <Box key={`hit-card-${index}`} flexDirection="column" alignItems="flex-start" borderStyle="round" borderColor="subtle" paddingX={1}>
                      <Text size="caption" color="subtle">{hit.where}</Text>
                      <Text>{hit.text}</Text>
                      <Button key={`hit-${index}`} plain dimColor label="Copy" onPress={press => { void $.ui.copy({ text: hit.copy, surface: press.surface }) }} />
                    </Box>
                  ))}
                </Box>
              )
          : pins.length === 0
            ? <Text color="subtle">No pins yet. Select text and press Pin selection, or use /pin.</Text>
            : (
                <Box flexDirection="column" alignItems="stretch" gap="lg">
                  {pins.map(pin => {
                    const isHidden = pin.secret && !revealed.includes(pin.id)
                    return (
                      <Box key={`pin-${pin.id}`} flexDirection="column" alignItems="flex-start" borderStyle="round" borderColor="subtle" paddingX={1}>
                        <Text weight="semibold">{pin.label}</Text>
                        <Text mono>{isHidden ? '••••' : pin.value}</Text>
                        <Box flexDirection="row" gap={2}>
                          {isHidden ? <Button key={`show-${pin.id}`} plain dimColor label="Show" onPress={() => { void update($, revealedAtom, ids => [...ids, pin.id]) }} /> : null}
                          <Button key={`copy-${pin.id}`} plain dimColor label="Copy" onPress={press => { void $.ui.copy({ text: pin.value, surface: press.surface }) }} />
                          <Button key={`unpin-${pin.id}`} plain dimColor label="Unpin" onPress={() => { void savePins($, list => dropPin(list, pin.id)) }} />
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}
      </Box>
    )
  })
}
