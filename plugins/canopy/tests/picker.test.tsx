import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'canopy',
  component: 'Pane',
  requestId: 'canopy-picker',
  props: { title: 'Canopy themes', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('first session opens the picker once; a press saves and applies the theme', async ($, on) => {
  mock.store(on)
  const opened: string[] = []
  const sets: any[] = []
  on('command.register', () => ({ value: { command: 'canopy' } }))
  on('ui.open', (_, e: any) => { opened.push(e.id); return { value: { isPlaced: true } } })
  const toasts: string[] = []
  on('ui.toast', (_, e: any) => { toasts.push(e.text ?? JSON.stringify(e)); return { value: undefined } })
  on('ui.close', () => ({ value: undefined }))
  on('theme.set', (_, e: any) => { sets.push(e); return { value: { isDrawn: true, requestId: 'test' } } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(opened).toEqual(['canopy-picker'])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(opened).toEqual(['canopy-picker'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Button', key: 'dracula' })) !== undefined).toBe(true)
    expect((await ui.find({ type: 'Button', key: 'material' })) !== undefined).toBe(true)
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'one-dark-pro' })
  expect(sets.at(-1).overrideColorScheme).toBe('dark')
  expect(sets.at(-1).backdrop.scene).toBe('canopy-one-dark-pro')
  await ui.unmount()
  // The choice was stored: the next session applies it again.
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets.at(-1).backdrop.scene).toBe('canopy-one-dark-pro')
})
