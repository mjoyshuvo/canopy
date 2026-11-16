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
  expect((await ui.find({ type: 'Button', key: 'all' }))?.text).toMatch(/All sessions/)
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
  expect((await again.find({ type: 'Text', text: /Current, this session/ })) !== undefined).toBe(true)
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
  // The current theme's row carries the mark.
  expect((await ui.find({ type: 'Text', text: /✓ Current/ })) !== undefined).toBe(true)
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

test('a number typed in the message box answers the picker, and the prompt never reaches the model', async ($, on) => {
  const { sets } = engine(on)
  const reached: string[] = []
  on('prompt.submit', (_: unknown, e: any) => { reached.push(e.text); return { text: e.text } })
  await $.session.start(START)

  const first = await $.prompt.submit({ text: '5' })
  expect(first.drop).toMatch(/Dracula: type 1/)
  const second = await $.prompt.submit({ text: ' 2 ' })
  expect(second.drop).toMatch(/all sessions/)
  expect(sets.at(-1).backdrop.scene).toBe('canopy-dracula')
  expect(reached).toEqual([])

  // With the picker closed, a number is an ordinary prompt again.
  await $.prompt.submit({ text: '5' })
  expect(reached).toEqual(['5'])
})

test('typing b goes back, and x closes the picker', async ($, on) => {
  engine(on)
  on('prompt.submit', (_: unknown, e: any) => ({ text: e.text }))
  await $.session.start(START)
  await $.prompt.submit({ text: 'material' })
  expect((await $.prompt.submit({ text: 'b' })).drop).toMatch(/Pick a theme/)
  expect(await isPickerUp($)).toBe(true)
  expect((await $.prompt.submit({ text: 'x' })).drop).toMatch(/closed/)
  expect(await isPickerUp($)).toBe(false)
})

const KEY = (key: string, inputText = '') =>
  ({ origin: { kind: 'composer' }, key: { key }, text: '', cursor: 0, start: 0, end: 0, inputText }) as const

test('a number key in the empty message box presses its row at once; other typing is left alone', async ($, on) => {
  const { sets } = engine(on)
  on('prompt.edit', (_: unknown, e: any) => ({ text: e.text + e.inputText, cursor: e.cursor + e.inputText.length }))
  await $.session.start(START)

  await $.prompt.edit(KEY('6', '6'))
  await $.prompt.edit(KEY('2', '2'))
  expect(sets.at(-1).backdrop.scene).toBe('canopy-material')

  await $.command.run({ command: 'canopy', args: '' })
  // A key while the box already holds text is the person's own typing.
  expect(await $.prompt.edit({ ...KEY('2', '2'), text: 'hi ', cursor: 3, start: 3, end: 3 })).toEqual({ text: 'hi 2', cursor: 4 })
  expect(await isPickerUp($)).toBe(true)
})

test('arrow keys are left to the message box', async ($, on) => {
  engine(on)
  on('prompt.edit', (_: unknown, e: any) => ({ text: e.text + e.inputText, cursor: 7 }))
  await $.session.start(START)
  // Canopy passes it on: the box's own answer comes back, not Canopy's empty one.
  expect(await $.prompt.edit(KEY('up'))).toEqual({ text: '', cursor: 7 })
})
