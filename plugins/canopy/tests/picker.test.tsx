import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'canopy',
  component: 'Pane',
  requestId: 'canopy-picker',
  props: { title: 'Canopy themes', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

function engine(on: any) {
  mock.store(on)
  const opened: string[] = []
  const sets: any[] = []
  const toasts: string[] = []
  on('command.register', () => ({ value: { command: 'canopy' } }))
  on('ui.open', (_: unknown, e: any) => { opened.push(e.id); return { value: { isPlaced: true } } })
  on('ui.toast', (_: unknown, e: any) => { toasts.push(e.text ?? JSON.stringify(e)); return { value: undefined } })
  on('ui.close', () => ({ value: undefined }))
  on('theme.set', (_: unknown, e: any) => { sets.push(e); return { value: { isDrawn: true, requestId: 'test' } } })
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  return { opened, sets, toasts }
}

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

test('first session opens the picker once; picking "all sessions" saves and applies the theme', async ($, on) => {
  const { opened, sets, toasts } = engine(on)

  await $.session.start(START)
  expect(opened).toEqual(['canopy-picker'])
  await $.session.start(START)
  expect(opened).toEqual(['canopy-picker'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Button', key: 'dracula' })) !== undefined).toBe(true)
    expect((await ui.find({ type: 'Button', key: 'material' })) !== undefined).toBe(true)
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const before = sets.length
  await ui.press({ key: 'one-dark-pro' })
  // Picking a theme only asks for its scope; nothing is applied yet.
  expect(sets.length).toBe(before)
  expect((await ui.find({ type: 'Button', key: 'session' })) !== undefined).toBe(true)
  await ui.press({ key: 'all' })
  expect(sets.at(-1).overrideColorScheme).toBe('dark')
  expect(sets.at(-1).backdrop.scene).toBe('canopy-one-dark-pro')
  expect(toasts.at(-1)).toMatch(/all sessions/)
  await ui.unmount()

  // The choice was stored: the next session applies it again.
  await $.session.start(START)
  expect(sets.at(-1).backdrop.scene).toBe('canopy-one-dark-pro')
})

test('"this session only" applies the theme without replacing the saved one', async ($, on) => {
  const { sets, toasts } = engine(on)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'dracula' })
  await ui.press({ key: 'session' })
  expect(sets.at(-1).backdrop.scene).toBe('canopy-dracula')
  expect(toasts.at(-1)).toMatch(/this session only/)
  await ui.unmount()

  // The session pick wins while the session lasts.
  const again = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await again.find({ type: 'Text', text: /current for this session/ })) !== undefined).toBe(true)
  await again.unmount()

  // An all-sessions pick replaces it.
  const { text } = await $.command.run({ command: 'canopy', args: 'material' })
  expect(text).toMatch(/all sessions/)
  expect(sets.at(-1).backdrop.scene).toBe('canopy-material')
})

test('/canopy with no words opens the picker; Back returns to the list', async ($, on) => {
  const { opened } = engine(on)
  await $.session.start(START)
  opened.length = 0

  await $.command.run({ command: 'canopy', args: '' })
  expect(opened).toEqual(['canopy-picker'])

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'material' })
  await ui.press({ key: 'back' })
  expect((await ui.find({ type: 'Button', key: 'apple-green' })) !== undefined).toBe(true)
  await ui.unmount()
})

test('/canopy <palette> session sets it for this session only', async ($, on) => {
  const { sets } = engine(on)
  await $.session.start(START)
  const { text } = await $.command.run({ command: 'canopy', args: 'silver-grass session' })
  expect(text).toMatch(/this session only/)
  expect(sets.at(-1).backdrop.scene).toBe('canopy-silver-grass')
})
