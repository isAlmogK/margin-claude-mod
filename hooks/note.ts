import { atom, read } from 'claude-code'

import type { On } from './state'

// The state scan reads references written in the file that uses them.
const isOffAtom = atom({ plugin: 'margin', key: 'isOff' } as const, false)

export const NOTE = [
  'Your replies are drawn by the margin mod in a narrow side panel. Write them so they read well there:',
  '- Start with a one-sentence answer, on its own line.',
  '- Keep paragraphs to two or three sentences. Use ### headings as short section labels.',
  '- When you offer choices, put them in an ```options fence: one option per paragraph, its first line `Title | short subtitle`, adding `| lean` to the one you recommend, then `+ point` and `- downside` lines.',
  '- When the person needs to decide, put the question alone in an ```ask fence.',
  '- End a reply that holds things worth keeping (a URL, a test login, a command to run, a decision, a number or fact the person asked for) with a ```keep fence: a line for each of them, `Label: value`, at most six lines. Each value should make sense on its own. Add what is still open (untested, unmerged, waiting on the person) as `- ` lines, at most three.',
  '- Never put a real API key, token or production password in a keep fence.',
].join('\n')

export const registerNote = (on: On): void => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (await read($, isOffAtom)) return composed
    return { sections: [...composed.sections, { id: 'margin:note', text: NOTE, scope: 'session' as const }] }
  })
}
