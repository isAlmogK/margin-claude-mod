import { atom, read } from 'claude-code'

import type { Block } from './blocks'
import { readBlocks } from './blocks'
import { fromKeepLines } from './keep'
import { isSecret } from './secrets'
import type { On } from './state'

// The state scan reads references written in the file that uses them.
const isOffAtom = atom({ plugin: 'margin', key: 'isOff' } as const, false)

export const LINE_MAX = 76
export const WIDE_MIN = 70

const RUN = /(`[^`]+`|\*\*[^*]+\*\*)/

export const registerReply = (on: On): void => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary === true || (await read($, isOffAtom))) return next(e)

    const { Box, Text, Button, Code, Markdown } = $.ui.resolve(e)
    const blocks = readBlocks(e.props.text, e.props.isFirstOfReply)
    const columns = e.viewport?.columns
    const isWide = (columns ?? 0) >= WIDE_MIN

    // Inline code becomes a chip, **bold** stays bold; everything else is plain text.
    const runs = (text: string) =>
      text
        .split(RUN)
        .filter(part => part !== '')
        .map(part =>
          part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
            <Text color="claude" mono>{part.slice(1, -1)}</Text>
          ) : part.length > 4 && part.startsWith('**') && part.endsWith('**') ? (
            <Text weight="semibold">{part.slice(2, -2)}</Text>
          ) : (
            part
          ),
        )

    const keep = blocks
      .flatMap(block => (block.kind === 'keep' ? fromKeepLines(block.lines) : []))
      .filter(item => !isSecret(item.value))

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
              {block.items.map((item, index) => (
                <Text>{block.isOrdered && !item.startsWith('  ') ? `${index + 1}. ` : '• '}{runs(item.trim())}</Text>
              ))}
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
                    point.isDownside ? <Text color="warning">• {point.text}</Text> : <Text>• {runs(point.text)}</Text>,
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
      <Box flexDirection="column" gap={1} {...(columns === undefined ? {} : { width: Math.min(columns, LINE_MAX) })}>
        {keep.length === 0 ? null : (
          <Box flexDirection="column" borderStyle="round" borderColor="success" paddingX={1}>
            <Text size="caption" color="success">Keep from this reply</Text>
            {keep.map((item, index) => (
              <Box flexDirection="row" gap={1}>
                <Text color="subtle">{item.label}</Text>
                <Text mono>{item.value}</Text>
                <Button key={`keep-copy-${index}`} label="Copy" onPress={press => { void $.ui.copy({ text: item.value, surface: press.surface }) }} />
              </Box>
            ))}
          </Box>
        )}
        {blocks.filter(block => block.kind !== 'keep').map(draw)}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
