/** A palette id, or null while none is set. */
export type MaybePalette = string | null

declare module 'claude-code' {
  interface PluginState {
    canopy: {
      /** The theme picked in the picker, waiting for "this session" or "all sessions". */
      pending: MaybePalette
      /** A theme chosen for this session only; it wins over the saved one until the session ends. */
      sessionPalette: MaybePalette
    }
  }
}
