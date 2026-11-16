import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { DEFAULT_PALETTE, PALETTE_IDS, PALETTES, type Palette, type PaletteId } from './palettes'
import { sceneSvg } from './scene'

// Canopy for Claude Desktop and mobile.
//
//   /canopy                  open the picker: choose a theme, then this session or all sessions
//   /canopy <palette>        set a palette for all sessions (apple-green | firefly-lake | silver-grass | one-dark-pro | dracula | material)
//   /canopy <palette> session   set a palette for this session only
//   /canopy off              back to the app's own look, for this session
//
// An all-sessions choice is kept in $.store; a this-session choice in $.state, where it wins over
// the saved one until the session ends. The picker is a band above the prompt, in the main
// column: Desktop docks every pane in the side panel. It opens by itself once, in the first
// session after install, so a new user sees every look without knowing the command.


const MOD = 'canopy'
const SCENE_PREFIX = `${MOD}-`

// Whether the picker band is up; the theme picked in it, waiting for its scope; and a
// this-session-only theme.
const isPicking = atom({ plugin: 'canopy', key: 'isPicking' } as const, false)
const pending = atom({ plugin: 'canopy', key: 'pending' } as const, null)
const sessionPalette = atom({ plugin: 'canopy', key: 'sessionPalette' } as const, null)

type Look = { palette: Palette; theme: ThemeSetArgs['colors']; unpainted?: string }

// Built on first use, not at load: the app shows its own look until the saved theme is set, so
// a session start pays for one palette's colours rather than all of them.
const looks = new Map<PaletteId, Look>()
function lookOf(id: PaletteId): Look {
  let look = looks.get(id)
  if (look === undefined) {
    const palette = PALETTES[id]
    const { theme, problems } = makeColors({
      label: palette.label,
      // One mode per palette: the proven shape. A two-mode theme was accepted but not painted.
      only: palette.mode,
      ...(palette.codeTheme !== undefined && { codeTheme: { [palette.mode]: palette.codeTheme } }),
      light: { gray: { anchors: palette.light.anchors }, roles: palette.light.roles },
      dark: { gray: { anchors: palette.dark.anchors }, roles: palette.dark.roles },
    })
    look = { palette, theme, unpainted: problems.find(line => line.startsWith("Desktop won't paint")) }
    looks.set(id, look)
  }
  return look
}

const scenes = new Map<PaletteId, string>()
function sceneOf(id: PaletteId): string {
  let scene = scenes.get(id)
  if (scene === undefined) {
    scene = sceneSvg(PALETTES[id])
    scenes.set(id, scene)
  }
  return scene
}

// No aliases yet.
const ALIASES: Record<string, PaletteId> = {}
const isPalette = (value: unknown): value is PaletteId => PALETTE_IDS.includes(value as PaletteId)

async function choice($: EngineInterface): Promise<{ palette: PaletteId; isSessionOnly: boolean }> {
  const forSession = await read($, sessionPalette)
  if (isPalette(forSession)) return { palette: forSession, isSessionOnly: true }
  const saved = await $.store.get('palette')
  return { palette: isPalette(saved) ? saved : DEFAULT_PALETTE, isSessionOnly: false }
}

type Scope = 'session' | 'all'

/** Sets a palette for this session only, or saves it for every session, then applies it. */
async function choose($: EngineInterface, id: PaletteId, scope: Scope): Promise<string> {
  if (scope === 'session') {
    await update($, sessionPalette, () => id)
  } else {
    await $.store.set('palette', id)
    await update($, sessionPalette, () => null)
  }
  const said = await apply($)
  return scope === 'session' ? `${said} For this session only.` : `${said} For all sessions.`
}

async function apply($: EngineInterface): Promise<string> {
  const { palette } = await choice($)
  const look = lookOf(palette)
  if (look.unpainted !== undefined) $.ui.toast(look.unpainted)

  // Colors, backdrop and the mode go in ONE call: a set replaces the whole theme.
  const args: ThemeSetArgs = {
    colors: look.theme,
    overrideColorScheme: look.palette.mode,
    // The scene draws its own frost across the full width. A clear glass (not false) keeps the
    // panels see-through: with glass false the app paints a solid band behind the prompt box.
    backdrop: { scene: SCENE_PREFIX + palette, glass: { blur: 0, tint: look.palette.glass.tint, opacity: 0 } },
  }
  const set = await $.theme.set(args)
  lastSet = set
  if (!set.isDrawn) return `${look.palette.label} is set, but nothing draws it here: ${set.reason}`
  return `${look.palette.label}${look.palette.art === 'lake' ? ', with the animated lake' : ''}.`
}

// What `/canopy debug` reports: the last theme call and every Backdrop request this load saw.
let lastSet: { isDrawn: boolean; reason?: string } | undefined
const backdropAsks: string[] = []

const USAGE = `/${MOD} [${PALETTE_IDS.join(' | ')} [session]] | off`

async function openPicker($: EngineInterface) {
  await update($, pending, () => null)
  await update($, isPicking, () => true)
}

async function closePicker($: EngineInterface) {
  await update($, isPicking, () => false)
  await update($, pending, () => null)
}

// Moving between steps swaps the buttons, so put the focus ring on the new step's main choice
// while the band holds the keys. Where it doesn't (or nothing can move a ring), the pick stands.
const focusOn = ($: EngineInterface, requestId: string, key: string) =>
  $.ui.focus({ requestId, key }).catch(() => undefined)

/** Four stripes of a palette's own colours: page, card, accent, keyword. */
function swatch(palette: Palette): string {
  const half = palette[palette.mode]
  const fills = [half.anchors['surface-0'], half.anchors['surface-2'], half.roles.accent, half.roles.pro]
  const rects = fills.map((fill, i) => `<rect x="${i * 12}" width="12" height="20" fill="${fill}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 20" width="48" height="20">${rects}</svg>`
}

export const register: Register = on => {
  // Neither a mod reload nor --resume keeps the theme, so set it at every session start.
  on('session.start', async ($, e, next) => {
    // The theme first: until it is set the app shows its own look.
    await apply($)
    await $.command.register({ name: MOD, description: `Canopy: ${USAGE}` })
    // First session after install: offer the picker once, whether or not it is used.
    if ((await $.store.get('pickerOffered')) !== true) {
      await $.store.set('pickerOffered', true)
      await openPicker($)
    }
    return next(e)
  })

  on('command.run', { command: MOD }, async ($, e) => {
    const words = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.includes('debug')) {
      const { palette } = await choice($)
      return {
        text: [
          `plugin.name=${$.plugin.name} palette=${palette}`,
          `last theme.set: ${JSON.stringify(lastSet)}`,
          `problems: ${lookOf(palette).unpainted ?? 'none that stop Desktop painting'}`,
          `Backdrop requests seen (${backdropAsks.length}): ${backdropAsks.slice(-5).join(' | ') || 'none'}`,
        ].join('\n'),
      }
    }
    if (words.length === 0 || words.includes('pick') || words.includes('themes')) {
      await openPicker($)
      return { text: 'Pick a Canopy theme above the prompt.' }
    }
    if (words.includes('off')) {
      await $.theme.clear()
      return { text: `Canopy is off for this session. /${MOD} brings it back.` }
    }
    const scope: Scope = words.includes('session') || words.includes('once') ? 'session' : 'all'
    const named = words.filter(word => word !== 'session' && word !== 'once').map(word => ALIASES[word] ?? word)
    const unknown = named.filter(word => !isPalette(word))
    if (unknown.length > 0) return { text: `Unknown: ${unknown.join(' ')}. Use ${USAGE}` }
    const id = named.at(-1)
    if (!isPalette(id)) return { text: `Name a palette: ${USAGE}` }
    return { text: await choose($, id, scope) }
  })

  // The band is the main column's: arrows, Enter and the number keys work once it holds the keys
  // (a click on it, or ctrl+x then tab); a mod can't hand them over from the prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isPicking))) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const Svg = e.surface === 'desktop' || e.surface === 'mobile' ? $.ui.resolve(e).Svg : undefined
    const { palette: current, isSessionOnly } = await choice($)
    const picked = await read($, pending)
    const chip = (palette: Palette) =>
      Svg !== undefined && <Svg source={swatch(palette)} alt={`${palette.label} colours`} width={48} height={20} />

    // Step two: the theme is picked, so ask where it applies.
    if (isPalette(picked)) {
      const palette = PALETTES[picked]
      const finish = async (scope: Scope) => {
        $.ui.toast(await choose($, picked, scope))
        await closePicker($)
      }
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={1} alignItems="center">
            {chip(palette)}
            <Text bold>{palette.label}</Text>
            <Text dimColor>for this session only, or for all sessions?</Text>
          </Box>
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            <Button key="session" hotkey="1" variant="secondary" onPress={() => finish('session')}>
              This session only
            </Button>
            <Button key="all" hotkey="2" variant="primary" autoFocus onPress={() => finish('all')}>
              All sessions
            </Button>
            <Button
              key="back"
              hotkey="b"
              onPress={async () => {
                await update($, pending, () => null)
                await focusOn($, e.requestId, picked)
              }}
            >
              Back
            </Button>
            <Button key="close" role="dismiss" onPress={() => closePicker($)}>Close</Button>
          </Box>
        </Box>
      )
    }

    // Step one: pick a theme.
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>Canopy themes</Text>
          <Text dimColor>  Click a theme. Once you click in here, the arrow keys and Enter work too.</Text>
        </Text>
        <Box flexDirection="row" gap={1} flexWrap="wrap">
          {PALETTE_IDS.map((id, i) => {
            const palette = PALETTES[id]
            const note = id === current ? (isSessionOnly ? ' (this session)' : ' (current)') : ''
            return (
              <Box flexDirection="row" gap={1} alignItems="center">
                {chip(palette)}
                <Button
                  key={id}
                  hotkey={String(i + 1)}
                  variant={id === current ? 'primary' : 'secondary'}
                  {...(id === current && { autoFocus: true as const })}
                  onPress={async () => {
                    await update($, pending, () => id)
                    await focusOn($, e.requestId, 'all')
                  }}
                >
                  {palette.label}{note}
                </Button>
              </Box>
            )
          })}
          <Button key="close" role="dismiss" onPress={() => closePicker($)}>Close</Button>
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    backdropAsks.push(`${e.surface} plugin=${e.props.plugin} scene=${e.props.scene}`)
    // Every mod's backdrop reaches this hook, and another mod may use the same scene name.
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const id = e.props.scene.startsWith(SCENE_PREFIX) ? e.props.scene.slice(SCENE_PREFIX.length) : undefined
    if (!isPalette(id)) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={sceneOf(id)} alt={PALETTES[id].alt} isInteractive />
  })
}
