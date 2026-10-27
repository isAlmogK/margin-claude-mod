import { atom, read } from 'claude-code'

import type { MarginPin } from '../types'
import type { Block } from './blocks'
import { readBlocks } from './blocks'
import { OPEN_LABEL, readKeep } from './keep'
import { addItems } from './pins'
import { type On, PANE } from './state'

// The state scan reads references written in the file that uses them.
const isOffAtom = atom({ plugin: 'margin', key: 'isOff' } as const, false)
const pinsAtom = atom({ plugin: 'margin', key: 'pins' } as const, [] as MarginPin[])

export const WIDE_MIN = 70
export const GUTTER = 12
const HOVER_SURFACES: readonly string[] = ['desktop', 'vscode']

// Inline runs: `code`, **bold**, [label](target), *italic* and _italic_.
const RUN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\)|(?<![*\w])\*[^*\s](?:[^*]*[^*\s])?\*(?![*\w])|(?<![_\w])_[^_\s](?:[^_]*[^_\s])?_(?![_\w]))/
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/
const ITALIC = /^([*_])[^*_\s](?:.*[^\s])?\1$/
const LINKABLE = /^(https?|file):/i

export const registerReply = (on: On): void => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary === true || (await read($, isOffAtom))) return next(e)

    const { Box, Text, Button, Code, Link, Markdown } = $.ui.resolve(e)
    const blocks = readBlocks(e.props.text, e.props.isFirstOfReply)
    const isWide = (e.viewport?.columns ?? 0) >= WIDE_MIN

    // Inline code becomes a chip, **bold** stays bold, *italic* italic; a web or file link
    // is a Link and any other link target shows only its label. The rest is plain text.
    const run = (part: string) => {
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <Text color="claude" mono>{part.slice(1, -1)}</Text>
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <Text weight="semibold">{part.slice(2, -2)}</Text>
      const link = LINK.exec(part)
      if (link) {
        const [, label = '', href = ''] = link
        return LINKABLE.test(href) ? <Link href={href} label={label} /> : <Text color="claude">{label}</Text>
      }
      if (ITALIC.test(part)) return <Text italic>{part.slice(1, -1)}</Text>
      return part
    }
    const runs = (text: string) => text.split(RUN).filter(part => part !== '').map(run)

    const card = readKeep(blocks.flatMap(block => (block.kind === 'keep' ? block.lines : [])))
    const keep = card.items
    const hasCard = keep.length + card.open.length > 0
    const pins = hasCard ? await read($, pinsAtom) : []
    const isPinned = (label: string, value: string): boolean => pins.some(pin => pin.label === label && pin.value === value)
    const labelWidth = Math.max(0, ...keep.map(item => item.label.length)) + 1
    const hasHover = HOVER_SURFACES.includes(e.surface)

    const pin = (label: string, value: string, key: string) =>
      isPinned(label, value)
        ? <Text size="caption" color="subtle">Pinned</Text>
        : <Button key={key} plain dimColor label="Pin" onPress={() => { void addItems($, [{ label, value, source: 'claude' }]).then(() => $.ui.open({ id: PANE, title: 'Pins' })) }} />
    // The gutter is always reserved, so revealing its buttons on hover never reflows the row.
    const gutter = (...buttons: ReturnType<typeof pin>[]) => (
      <Box width={GUTTER} flexShrink={0}>
        <Box flexDirection="row" gap={1} flexGrow={1} justifyContent="flex-end" {...(hasHover ? { display: 'none' as const, hover: { display: 'flex' as const } } : {})}>
          {buttons}
        </Box>
      </Box>
    )

    const draw = (block: Block) => {
      switch (block.kind) {
        case 'lead':
          return <Text size="heading" weight="semibold">{runs(block.text)}</Text>
        case 'paragraph':
          return <Text>{runs(block.text)}</Text>
        case 'label':
          return <Text size="caption" color="subtle">{block.text}</Text>
        case 'list':
          return (
            <Box flexDirection="column">
              {block.items.map(item => {
                const line = <Text>{/\d/.test(item.marker) ? `${item.marker} ` : '• '}{runs(item.text)}</Text>
                return item.level === 1 ? <Box paddingLeft={2}>{line}</Box> : line
              })}
            </Box>
          )
        case 'code':
          return <Code source={block.source} language={block.language === '' ? 'text' : block.language} />
        case 'options':
          return (
            <Box flexDirection={isWide ? 'row' : 'column'} gap={1}>
              {block.options.map(option => (
                <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={option.isLean ? 'success' : 'subtle'} paddingX={1}>
                  <Text weight="semibold">{option.title}</Text>
                  {option.isLean ? <Text size="caption" color="success">I lean here</Text> : null}
                  {option.subtitle === '' ? null : <Text size="caption" color="subtle">{option.subtitle}</Text>}
                  {option.points.map(point =>
                    point.isDownside ? <Text color="warning">• {runs(point.text)}</Text> : <Text>• {runs(point.text)}</Text>,
                  )}
                </Box>
              ))}
            </Box>
          )
        case 'ask':
          return (
            <Box flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1}>
              <Text size="caption" color="warning">Your call</Text>
              <Text>{runs(block.text)}</Text>
            </Box>
          )
        case 'pending':
          return <Text>{block.text}</Text>
        case 'other':
          return <Markdown text={block.markdown} />
        case 'keep':
          return null
      }
    }

    return (
      <Box flexDirection="column" gap={1} width="100%">
        {hasCard ? (
          <Box flexDirection="column" borderStyle="round" borderColor="success" paddingX={1}>
            <Text size="caption" color="success">Keep from this reply</Text>
            {keep.map((item, index) => (
              <Box key={`keep-row-${index}`} flexDirection="row">
                <Box width={labelWidth} flexShrink={0}><Text color="subtle">{item.label}</Text></Box>
                <Box flexGrow={1} flexShrink={1}><Text mono>{item.value}</Text></Box>
                {gutter(
                  <Button key={`keep-copy-${index}`} plain dimColor label="Copy" onPress={press => { void $.ui.copy({ text: item.value, surface: press.surface }) }} />,
                  pin(item.label, item.value, `keep-pin-${index}`),
                )}
              </Box>
            ))}
            {card.open.length === 0 ? null : <Text size="caption" color="subtle">{OPEN_LABEL}</Text>}
            {card.open.map((text, index) => (
              <Box key={`open-row-${index}`} flexDirection="row">
                <Box flexGrow={1} flexShrink={1}><Text>• {runs(text)}</Text></Box>
                {gutter(pin(OPEN_LABEL, text, `open-pin-${index}`))}
              </Box>
            ))}
          </Box>
        ) : null}
        {blocks.filter(block => block.kind !== 'keep').map(draw)}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
