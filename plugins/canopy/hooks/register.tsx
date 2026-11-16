import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { DEFAULT_PALETTE, PALETTE_IDS, PALETTES, type Palette, type PaletteId } from './palettes'
import { sceneSvg } from './scene'

// Canopy for Claude Desktop and mobile.
//
//   /canopy <palette>        pick a palette (apple-green | firefly-lake)
//   /canopy off              back to the app's own look, for this session
//
// The choice is kept across sessions in $.store.


const MOD = 'canopy'
const SCENE_PREFIX = `${MOD}-`

const LOOKS = Object.fromEntries(
  PALETTE_IDS.map(id => {
    const palette = PALETTES[id]
    const { theme, problems } = makeColors({
      label: palette.label,
      // One mode per palette: the proven shape. A two-mode theme was accepted but not painted.
      only: palette.mode,
      ...(palette.codeTheme !== undefined && { codeTheme: { [palette.mode]: palette.codeTheme } }),
      light: { gray: { anchors: palette.light.anchors }, roles: palette.light.roles },
      dark: { gray: { anchors: palette.dark.anchors }, roles: palette.dark.roles },
    })
    return [id, { palette, theme, unpainted: problems.find(line => line.startsWith("Desktop won't paint")) }]
  }),
) as Record<PaletteId, { palette: Palette; theme: ThemeSetArgs['colors']; unpainted?: string }>

const SCENES = Object.fromEntries(PALETTE_IDS.map(id => [id, sceneSvg(PALETTES[id])])) as Record<PaletteId, string>

// No aliases yet.
const ALIASES: Record<string, PaletteId> = {}
const isPalette = (value: unknown): value is PaletteId => PALETTE_IDS.includes(value as PaletteId)

async function choice($: EngineInterface): Promise<{ palette: PaletteId }> {
  const palette = await $.store.get('palette')
  return {
    palette: isPalette(palette) ? palette : DEFAULT_PALETTE,
  }
}

async function apply($: EngineInterface): Promise<string> {
  const { palette } = await choice($)
  const look = LOOKS[palette]
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

const USAGE = `/${MOD} ${PALETTE_IDS.join(' | ')} | off`

export const register: Register = on => {
  // Neither a mod reload nor --resume keeps the theme, so set it at every session start.
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: MOD, description: `Canopy: ${USAGE}` })
    await apply($)
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
          `problems: ${LOOKS[palette].unpainted ?? 'none that stop Desktop painting'}`,
          `Backdrop requests seen (${backdropAsks.length}): ${backdropAsks.slice(-5).join(' | ') || 'none'}`,
        ].join('\n'),
      }
    }
    if (words.includes('off')) {
      await $.theme.clear()
      return { text: `Canopy is off for this session. /${MOD} brings it back.` }
    }
    const named = words.map(word => ALIASES[word] ?? word)
    const unknown = named.filter(word => !isPalette(word))
    if (unknown.length > 0) return { text: `Unknown: ${unknown.join(' ')}. Use ${USAGE}` }
    for (const word of named) {
      if (isPalette(word)) await $.store.set('palette', word)
    }
    return { text: await apply($) }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    backdropAsks.push(`${e.surface} plugin=${e.props.plugin} scene=${e.props.scene}`)
    // Every mod's backdrop reaches this hook, and another mod may use the same scene name.
    if (e.props.plugin !== $.plugin.name) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const id = e.props.scene.startsWith(SCENE_PREFIX) ? e.props.scene.slice(SCENE_PREFIX.length) : undefined
    if (!isPalette(id)) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={SCENES[id]} alt={PALETTES[id].alt} isInteractive />
  })
}
