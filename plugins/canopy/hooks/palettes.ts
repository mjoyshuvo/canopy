// The palettes of this theme. Each has a light and a dark half:
// `anchors` + `roles` feed makeColors (the app's own colors),
// `scene` paints the backdrop in that mode: still side bands (apple-green) or the
// animated night lake (firefly-lake). Only the half named by `mode` is used.
//
// Rules (from look.md):
// - surface-0 is the darkest surface in BOTH modes; surface-1..3 step lighter, a few % apart.
// - Light mode: surface-2 and surface-3 must match if both given (or omit surface-3).
// - Dark mode: keep surface-3 close to surface-0 or Desktop refuses the whole theme.
// - text-primary >= 7:1 on every surface; text-muted >= 4.5:1 on surface-0 and surface-2.
// - danger stays red, success green, warning amber — tuned toward the theme's hue.

export type PaletteId = 'apple-green' | 'firefly-lake'

export const PALETTE_IDS: readonly PaletteId[] = ['apple-green', 'firefly-lake']

export const DEFAULT_PALETTE: PaletteId = 'apple-green'

type Anchors = {
  'surface-0': string
  'surface-1': string
  'surface-2': string
  'surface-3'?: string
  'text-primary': string
  'text-secondary': string
  'text-muted': string
}

type Roles = { accent: string; danger: string; success: string; warning: string; pro: string }

/** The colors of one mode of the backdrop; each art reads the keys it needs. */
export type SceneColors = Record<string, string>

type Half = { anchors: Anchors; roles: Roles; scene: SceneColors }

export type Palette = {
  id: PaletteId
  label: string
  /** Screen-reader description of the backdrop. */
  alt: string
  /**
   * The one mode this palette is made for. Only that half is sent (`only` in makeColors) and
   * the window is pinned to it; the other half is unused. A look for both modes is two palettes.
   */
  mode: 'light' | 'dark'
  /** Which drawing the backdrop is: still side bands, or the animated lake. */
  art: 'bands' | 'lake'
  /** Code highlighting theme by name (Desktop's bundled names, e.g. 'everforest-light'); absent, the app's own. */
  codeTheme?: string
  /** The frost the app lays over the backdrop under its panels. */
  glass: { blur: number; tint: string; opacity: number }
  dark: Half
  light: Half
}

const UNUSED: Half = {
  anchors: {
    'surface-0': '#101814', 'surface-1': '#151e19', 'surface-2': '#1a241e', 'surface-3': '#1b2620',
    'text-primary': '#eef3ec', 'text-secondary': '#c8d4c8', 'text-muted': '#a0b0a2',
  },
  roles: { accent: '#7fc8a9', danger: '#ff6f61', success: '#9ad36a', warning: '#f0c46a', pro: '#b3a6f2' },
  scene: {},
}

export const PALETTES: Record<PaletteId, Palette> = {
  // Apple green: a soft apple-green main window between lighter off-white side bands
  // (sidebar and right panel). No motion.
  'apple-green': {
    id: 'apple-green',
    label: 'Apple green',
    alt: 'A soft apple-green middle between light off-white side bands',
    mode: 'light',
    art: 'bands',
    // Warm green-cream code blocks with soft green/teal tokens, to match the page.
    codeTheme: 'everforest-light',
    glass: { blur: 0, tint: '#eef3ec', opacity: 0 },
    light: {
      anchors: {
        'surface-0': '#dde3d7',
        'surface-1': '#e5e9e0',
        'surface-2': '#f1f4ed',
        'surface-3': '#f1f4ed',
        'text-primary': '#18302a',
        'text-secondary': '#2e5a4c',
        'text-muted': '#4b6a5e',
      },
      // Lively seeds so icons, links and code read colorful against the soft page.
      roles: { accent: '#1f8a72', danger: '#c0473a', success: '#4f9a12', warning: '#b07400', pro: '#6a55c8' },
      // Main window apple green, sidebars a lighter, quieter off-white sage.
      scene: { sideTop: '#eef0ea', sideLow: '#ebeee7', edge: '#c9d9bd', middle: '#e5e9e0' },
    },
    dark: UNUSED,
  },
  // Firefly Lake: deep teal night by a still lake, moon low on the right, fireflies drifting
  // at the edges. Heavier frost keeps the reading area quiet.
  'firefly-lake': {
    id: 'firefly-lake',
    label: 'Firefly Lake',
    alt: 'A moonlit teal lake at night: fireflies glowing at the edges, quiet fireworks over tall spruces on the right',
    mode: 'dark',
    art: 'lake',
    glass: { blur: 5, tint: '#06201d', opacity: 0.2 },
    light: { ...UNUSED, anchors: {
      'surface-0': '#e9f0ec', 'surface-1': '#f1f6f2', 'surface-2': '#f9fbf8',
      'text-primary': '#10302c', 'text-secondary': '#2c4a45', 'text-muted': '#46615c',
    } },
    dark: {
      anchors: {
        'surface-0': '#071e1c',
        'surface-1': '#0a2624',
        'surface-2': '#0c2e2b',
        'surface-3': '#0d302d',
        'text-primary': '#e5ecea',
        'text-secondary': '#b4c4c0',
        'text-muted': '#9babA6'.toLowerCase(),
      },
      roles: { accent: '#3cc7b5', danger: '#ff6b6b', success: '#a6d33a', warning: '#f2c66d', pro: '#a8a4f0' },
      scene: {
        skyTop: '#04110f', skyMid: '#0a2a27', skyLow: '#145049',
        moon: '#f1efd8', glow: '#9fe0cf',
        farHills: '#0b2522', nearHills: '#071a18',
        lakeTop: '#0f3d38', lakeLow: '#051513', shimmer: '#cdeee4',
        trees: '#041210', treeBack: '#24524a', treeFront: '#0f3029', treeLit: '#7fb7a0', bark: '#0a1c18',firefly: '#e4f79a', fireflyGlow: '#c8f06a', burst: '#ffb27a',
      },
    },
  },
}
