import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'canopy',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  surface: 'desktop',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

function engine(on: any) {
  mock.store(on)
  const sets: any[] = []
  const toasts: string[] = []
  on('command.register', () => ({ value: { command: 'canopy' } }))
  on('ui.toast', (_: unknown, e: any) => { toasts.push(e.text ?? JSON.stringify(e)); return { value: undefined } })
  on('theme.set', (_: unknown, e: any) => { sets.push(e); return { value: { isDrawn: true, requestId: 'test' } } })
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  // What the band shows when Canopy leaves it to the engine.
  on('ui.render', ($: any, e: any) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })
  return { sets, toasts }
}

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

async function isPickerUp($: any) {
  const ui = await $.ui.mount(BAND)
  const up = (await ui.find({ type: 'Button', key: 'dracula' })) !== undefined
  await ui.unmount()
  return up
}

test('the picker shows above the prompt in the first session only; "all sessions" saves the theme', async ($, on) => {
  const { sets, toasts } = engine(on)

  await $.session.start(START)
  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Button', key: 'material' })) !== undefined).toBe(true)
    await ui.unmount()
  }

  const ui = await $.ui.mount(BAND)
  const before = sets.length
  await ui.press({ key: 'one-dark-pro' })
  // Picking a theme only asks for its scope; nothing is applied yet.
  expect(sets.length).toBe(before)
  expect((await ui.find({ type: 'Button', key: 'all' }))?.props.autoFocus).toBe(true)
  await ui.press({ key: 'all' })
  expect(sets.at(-1).overrideColorScheme).toBe('dark')
  expect(sets.at(-1).backdrop.scene).toBe('canopy-one-dark-pro')
  expect(toasts.at(-1)).toMatch(/all sessions/)
  await ui.unmount()
  // Choosing closes the band.
  expect(await isPickerUp($)).toBe(false)

  // The choice was stored, and the picker is not offered again.
  await $.session.start(START)
  expect(sets.at(-1).backdrop.scene).toBe('canopy-one-dark-pro')
  expect(await isPickerUp($)).toBe(false)
})

test('"this session only" applies the theme without replacing the saved one', async ($, on) => {
  const { sets, toasts } = engine(on)
  await $.session.start(START)

  const ui = await $.ui.mount(BAND)
  await ui.press({ key: 'dracula' })
  await ui.press({ key: 'session' })
  expect(sets.at(-1).backdrop.scene).toBe('canopy-dracula')
  expect(toasts.at(-1)).toMatch(/this session only/)
  await ui.unmount()

  // The session pick wins while the session lasts.
  await $.command.run({ command: 'canopy', args: '' })
  const again = await $.ui.mount(BAND)
  expect((await again.find({ type: 'Button', key: 'dracula' }))?.text).toMatch(/this session/)
  await again.unmount()

  // An all-sessions pick replaces it.
  const { text } = await $.command.run({ command: 'canopy', args: 'material' })
  expect(text).toMatch(/all sessions/)
  expect(sets.at(-1).backdrop.scene).toBe('canopy-material')
})

test('/canopy brings the picker back; Back returns to the list and Close hides it', async ($, on) => {
  engine(on)
  await $.session.start(START)
  const first = await $.ui.mount(BAND)
  await first.press({ key: 'close' })
  await first.unmount()
  expect(await isPickerUp($)).toBe(false)

  const { text } = await $.command.run({ command: 'canopy', args: '' })
  expect(text).toMatch(/above the prompt/)
  const ui = await $.ui.mount(BAND)
  // The ring starts on the current theme once the band holds the keys.
  expect((await ui.find({ type: 'Button', key: 'apple-green' }))?.props.autoFocus).toBe(true)
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
