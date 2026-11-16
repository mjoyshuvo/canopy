// The backdrops, as SVG strings drawn behind the conversation.
// - bandsSvg: apple-green's still ground, sage bands behind the sidebar and right panel.
// - lakeSvg: firefly-lake's night lake; moon glow breathes, water shimmers, fireflies drift
//   at the left and right edges. Everything is slow (20-60 s) so nothing pulls the eye.
// Rules every scene follows:
//
// - Colors are plain-hex CSS variables from the palette's one mode. No `light-dark()` or
//   `color-scheme`: no working backdrop uses them.
// - All styling lives in the <style> sheet. No style="" attributes (a surface may strip them).
// - CSS animations only. No <script>, no external hrefs, no fonts, no images.
// - `prefers-reduced-motion: reduce` stops everything. It is the ONLY @media allowed: the
//   desktop app stops every animation of a scene that holds a size or aspect-ratio query.
// - viewBox + preserveAspectRatio="xMidYMid slice"; keep the subject off the centre (text)
//   and the bottom (message box). Root also has width/height 100%.
// - Under 131,072 characters. Deterministic: seeded random, never Math.random().

import type { Palette, SceneColors } from './palettes'

const W = 1600
const H = 1000

const kebab = (key: string): string => '--' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())

/** Six-digit hex plus an opacity 0..1, as eight-digit hex. */
export const withAlpha = (color: string, opacity: number): string =>
  color + Math.round(opacity * 255).toString(16).padStart(2, '0')

function vars(colors: SceneColors): string {
  return (Object.keys(colors) as (keyof SceneColors)[]).map(key => `${kebab(key)}:${colors[key]}`).join(';')
}

/** Seeded random so the scene is identical on every load. */
function random(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const f = (n: number): string => Math.round(n).toString()

/** A smooth ridge line across the width, closed down to the bottom. */
function ridge(baseY: number, amp: number, seed: number): string {
  const r = random(seed)
  let x0 = -400
  let y0 = baseY - r() * amp
  let d = `M${f(x0)} ${f(y0)}`
  for (let x1 = x0 + 200; x1 <= W + 400; x1 += 200) {
    const y1 = baseY - r() * amp
    const mx = (x0 + x1) / 2
    d += ` C${f(mx)} ${f(y0)} ${f(mx)} ${f(y1)} ${f(x1)} ${f(y1)}`
    x0 = x1
    y0 = y1
  }
  return d + ` L${W + 400} ${H + 200} L-400 ${H + 200}Z`
}

const REDUCED = `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`

/** Still: one flat apple-green ground. The app's own panels sit over it, so no lines or bands
 *  are drawn: fixed-position lines show up mid-conversation when a side panel is resized. */
export function bandsSvg(palette: Palette): string {
  const c = palette[palette.mode].scene
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="${c.middle}"/></svg>`
}

function stars(seed: number): string {
  const r = random(seed)
  let out = ''
  for (let i = 0; i < 70; i++) {
    out += `<circle class="star t${i % 4}" cx="${f(r() * W)}" cy="${f(r() * 380)}" r="${(0.6 + r() * 1.2).toFixed(1)}"/>`
  }
  return out
}

/** Pine-like silhouettes along one edge, drawn as one path. */
function treeline(fromX: number, toX: number, baseY: number, seed: number): string {
  const r = random(seed)
  let d = ''
  for (let x = fromX; x < toX; x += 26 + r() * 30) {
    const h = 70 + r() * 150
    const w = 22 + r() * 18
    d += `M${f(x - w)} ${baseY}L${f(x)} ${f(baseY - h)}L${f(x + w)} ${baseY}Z`
  }
  return `<path class="trees" d="${d}"/>`
}

/** A circle as path data, so a whole canopy stays one path. */
const blob = (cx: number, cy: number, rad: number): string =>
  `M${f(cx - rad)} ${f(cy)}a${f(rad)} ${f(rad)} 0 1 0 ${f(rad * 2)} 0a${f(rad)} ${f(rad)} 0 1 0 ${f(-rad * 2)} 0Z`

/** A flat cloud-shaped foliage pad: a wide ellipse topped with a few soft bumps. */
function pad(cx: number, cy: number, w: number, h: number, r: () => number): string {
  let d = `M${f(cx - w)} ${f(cy)}a${f(w)} ${f(h)} 0 1 0 ${f(w * 2)} 0a${f(w)} ${f(h)} 0 1 0 ${f(-w * 2)} 0Z`
  for (let k = 0; k < 4; k++) d += blob(cx - w * 0.7 + (k * w * 1.4) / 3, cy - h * 0.5, h * (0.7 + r() * 0.4))
  return d
}

/** Japanese-style pines on the right side panel: a leaning, curving trunk with branches
 *  ending in flat cloud pads, moonlight on the pads' upper edges. */
function tallTrees(seed: number): string {
  const r = random(seed)
  let back = ''
  let front = ''
  for (let x = 1240; x < W + 60; x += 40 + r() * 45) {
    // Wild spruce: tall and narrow, a thin trunk with many short ragged branches
    // that droop at the tips, longer toward the bottom, uneven gaps between them.
    const h = 480 + r() * 260
    const ty = 775 - h
    let trunk = `M${f(x - 5)} 775L${f(x - 1)} ${f(ty)}L${f(x + 1)} ${f(ty)}L${f(x + 5)} 775Z`
    let leaves = ''
    let lit = ''
    for (let y = ty + 6; y < 775 - h * 0.12; y += 7 + r() * 9) {
      const t = (y - ty) / h
      for (const side of [-1, 1]) {
        if (r() < 0.12) continue
        const len = (8 + t * 62) * (0.6 + r() * 0.6)
        const sag = len * (0.25 + r() * 0.25)
        const tipX = x + side * len
        const tipY = y + sag
        const thick = 4 + t * 7
        // Upper edge rises a little then falls to the tip; lower edge is a ragged fringe.
        let d = `M${f(x)} ${f(y - 1)}Q${f(x + side * len * 0.5)} ${f(y - 3)} ${f(tipX)} ${f(tipY)}`
        const teeth = 3 + Math.floor(len / 14)
        for (let k = teeth; k >= 0; k--) {
          const px = x + (side * len * k) / teeth
          const py = y + (sag * k * k) / (teeth * teeth) + thick * (k % 2 ? 1.4 : 0.6) * (0.5 + r() * 0.5)
          d += `L${f(px)} ${f(py)}`
        }
        leaves += d + 'Z'
        if (side < 0 && r() < 0.7) lit += `M${f(x)} ${f(y - 3)}Q${f(x - len * 0.5)} ${f(y - 5)} ${f(tipX - 1)} ${f(tipY - 2)}L${f(tipX)} ${f(tipY + 1)}Q${f(x - len * 0.5)} ${f(y - 1)} ${f(x)} ${f(y + 1)}Z`
      }
    }
    leaves += `M${f(x - 3)} ${f(ty + 10)}L${f(x)} ${f(ty - 14)}L${f(x + 3)} ${f(ty + 10)}Z`
    const sway = `sway w${Math.floor(r() * 5)}`
    const tree = `<g class="${sway}"><path class="lit" d="${lit}"/><path class="bark" d="${trunk}"/><path d="${leaves}"/></g>`
    if (r() < 0.4) back += `<g class="tree-back">${tree}</g>`
    else front += `<g class="tree-front">${tree}</g>`
  }
  return back + front
}


/** Long slow swells across the whole lake, sliding sideways, plus moonlight glints. */
function waves(seed: number): string {
  const r = random(seed)
  let out = ''
  for (let i = 0; i < 22; i++) {
    const y = 784 + i * 9.5 + r() * 4
    let d = ''
    for (let x = -200 - r() * 200; x < W + 200; x += 120 + r() * 160) {
      const w = 40 + r() * 110
      d += `M${f(x)} ${f(y)}h${f(w)}`
    }
    out += `<path class="wave v${i % 4} t${i % 4}" d="${d}"/>`
  }
  for (let i = 0; i < 26; i++) {
    const x = 1240 + (r() - 0.5) * (80 + i * 9)
    const y = 790 + r() * 190
    out += `<rect class="glint t${i % 4} g${i % 3}" x="${f(x)}" y="${f(y)}" width="${f(6 + r() * 14)}" height="1.6" rx=".8"/>`
  }
  return out
}

/** Fireworks over the right side panel, part of the scene: one burst every 2 s in turn, each quick. */
function fireworks(seed: number): string {
  const r = random(seed)
  let out = ''
  for (let i = 0; i < 9; i++) {
    const x = 1240 + r() * 300
    const y = 200 + r() * 360
    const radius = 70 + r() * 70
    const sparks = 18
    let dots = ''
    for (let k = 0; k < sparks; k++) {
      const a = (k / sparks) * Math.PI * 2
      dots += `<circle cx="${f(Math.cos(a) * radius)}" cy="${f(Math.sin(a) * radius)}" r="3"/>`
      dots += `<circle cx="${f(Math.cos(a) * radius * 0.55)}" cy="${f(Math.sin(a) * radius * 0.55)}" r="1.8"/>`
    }
    out +=
      `<g transform="translate(${f(x)} ${f(y)})"><g class="burst c${i % 3} b${i % 9}">` +
      `<circle class="flash" r="${f(radius * 0.35)}" fill="url(#ff)"/>${dots}</g></g>`
  }
  return out
}

function shimmer(seed: number): string {
  const r = random(seed)
  let out = ''
  for (let i = 0; i < 14; i++) {
    const y = 790 + i * 9 + r() * 4
    const w = 30 + r() * 90 - i * 2
    out += `<rect class="ripple t${i % 4}" x="${f(1240 - w / 2 + (r() - 0.5) * 40)}" y="${f(y)}" width="${f(w)}" height="2" rx="1"/>`
  }
  return out
}

function fireflies(seed: number): string {
  const r = random(seed)
  let out = ''
  for (let i = 0; i < 46; i++) {
    const x = i % 3 === 0 ? 30 + r() * 380 : W - 30 - r() * 400
    const y = 300 + r() * 600
    out +=
      `<g transform="translate(${f(x)} ${f(y)})"><g class="drift d${i % 6}">` +
      `<circle class="halo t${i % 4}" r="18" fill="url(#ff)"/><circle class="fly t${i % 4}" r="2.8"/></g></g>`
  }
  return out
}

const DELAYS = [0, -7, -13, -19, -26, -33].map((d, i) => `.d${i}{animation-delay:${d}s}`).join('') +
  [0, -2.5, -5, -7.5].map((d, i) => `.t${i}{animation-delay:${d}s}`).join('')

const LAKE_STYLE =
  `.s0{stop-color:var(--sky-top)}.s1{stop-color:var(--sky-mid)}.s2{stop-color:var(--sky-low)}` +
  `.l0{stop-color:var(--lake-top)}.l1{stop-color:var(--lake-low)}` +
  `.g0{stop-color:var(--glow);stop-opacity:.45}.g1{stop-color:var(--glow);stop-opacity:0}` +
  `.f0{stop-color:var(--firefly-glow);stop-opacity:.55}.f1{stop-color:var(--firefly-glow);stop-opacity:0}` +
  `.moon{fill:var(--moon)}.halo-moon{animation:breathe 14s ease-in-out infinite alternate;transform-origin:1240px 250px}` +
  `.star{fill:var(--moon);animation:twinkle 9s ease-in-out infinite alternate}` +
  `.hill-far{fill:var(--far-hills)}.hill-near{fill:var(--near-hills)}.trees{fill:var(--trees)}` +
  `.ripple{fill:var(--shimmer);animation:ripple 7s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}` +
  `.fly{fill:var(--firefly);animation:glow 6s ease-in-out infinite alternate}` +
  `.halo{animation:glow 6s ease-in-out infinite alternate}` +
  `.drift{animation:drift 24s ease-in-out infinite alternate}` +
  `.tree-back{fill:var(--tree-back)}.tree-front{fill:var(--tree-front)}.lit{fill:var(--tree-lit);opacity:.75}.tree-back .lit{opacity:.45}.bark{fill:var(--bark)}` +
  `.sway{transform-box:fill-box;transform-origin:50% 100%;animation:sway 11s ease-in-out infinite}` +
  `.w0{animation-delay:0s}.w1{animation-delay:-.6s;animation-duration:12s}.w2{animation-delay:-1.2s}.w3{animation-delay:-1.8s;animation-duration:10s}.w4{animation-delay:-2.4s}` +
  `.wave{fill:none;stroke:var(--shimmer);stroke-width:1.4;stroke-linecap:round;animation:wave 16s ease-in-out infinite alternate}` +
  `.v1{animation-duration:21s}.v2{animation-duration:13s;animation-direction:alternate-reverse}.v3{animation-duration:18s}` +
  `.glint{fill:var(--moon);animation:glint 3.2s ease-in-out infinite alternate}.g1{animation-duration:2.4s}.g2{animation-duration:4.1s}` +
  `@keyframes sway{0%,100%{transform:rotate(0)}18%{transform:rotate(1.6deg)}30%{transform:rotate(.4deg)}42%{transform:rotate(2.2deg)}60%{transform:rotate(-.3deg)}}` +
  `@keyframes wave{from{transform:translateX(-30px);opacity:.08}50%{opacity:.32}to{transform:translateX(30px);opacity:.12}}` +
  `@keyframes glint{from{opacity:0}to{opacity:.85}}` +
  `.burst{opacity:0;animation:burst 18s ease-out infinite}` +
  `.c0 circle{fill:var(--firefly)}.c1 circle{fill:var(--shimmer)}.c2 circle{fill:var(--burst)}.burst .flash{fill:url(#ff)}` +
  [0, 2, 4, 6, 8, 10, 12, 14, 16].map((d, i) => `.b${i}{animation-delay:-${d}s}`).join('') +
  DELAYS +
  `@keyframes breathe{from{opacity:.75;transform:scale(1)}to{opacity:1;transform:scale(1.05)}}` +
  `@keyframes twinkle{from{opacity:.25}to{opacity:.8}}` +
  `@keyframes ripple{from{opacity:.12;transform:scaleX(.7)}to{opacity:.5;transform:scaleX(1.1)}}` +
  `@keyframes glow{from{opacity:.1}to{opacity:.9}}` +
  `@keyframes burst{0%{transform:scale(.05);opacity:0}1%{opacity:1}9%{opacity:.75}14%{transform:scale(1) translateY(16px);opacity:0}100%{transform:scale(1);opacity:0}}` +
  `@keyframes drift{from{transform:translate(-14px,10px)}to{transform:translate(16px,-18px)}}` +
  REDUCED

/** The frost is drawn inside the scene, over its whole width, so the sidebars get the same
 *  blur and tint as the conversation (the app's own glass only frosts under some panels). */
function frosted(palette: Palette, body: string): { defs: string; body: string } {
  const g = palette.glass
  return {
    defs: `<filter id="frost" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${g.blur}"/></filter>`,
    body: `<g filter="url(#frost)">${body}</g><rect width="${W}" height="${H}" fill="${g.tint}" opacity="${g.opacity}"/>`,
  }
}

/** Animated: the night lake. */
export function lakeSvg(palette: Palette): string {
  const c = palette[palette.mode].scene
  const defs =
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s0"/><stop offset=".6" class="s1"/><stop offset="1" class="s2"/></linearGradient>` +
    `<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="l0"/><stop offset="1" class="l1"/></linearGradient>` +
    `<radialGradient id="glow"><stop offset="0" class="g0"/><stop offset="1" class="g1"/></radialGradient>` +
    `<radialGradient id="ff"><stop offset="0" class="f0"/><stop offset="1" class="f1"/></radialGradient>`
  const body =
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    `<g>${stars(5)}</g>` +
    `<g class="halo-moon"><circle cx="1240" cy="250" r="230" fill="url(#glow)"/></g>` +
    `<circle class="moon" cx="1240" cy="250" r="46"/>` +
    `<path class="hill-far" d="${ridge(700, 110, 3)}"/>` +
    `<path class="hill-near" d="${ridge(760, 70, 11)}"/>` +
    `<rect y="770" width="${W}" height="${H - 770}" fill="url(#lake)"/>` +
    waves(29) +
    shimmer(17) +
    `<g class="sway w2">${treeline(-40, 420, 775, 7)}</g>` +
    tallTrees(9) +
    fireflies(23) +
    fireworks(41)
  const fr = frosted(palette, body)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">` +
    `<style>svg{${vars(c)}}${LAKE_STYLE}</style><defs>${defs}${fr.defs}</defs>${fr.body}</svg>`
  )
}

/** One grass blade in scene coordinates, base at (x, y): a bending stem and a small
 *  feathery plume of strands drooping the way the stem leans. */
function blade(x: number, y: number, h: number, lean: number, w: number, plume: number, strands: number): string {
  const tx = x + lean
  const ty = y - h
  let out = `<path class="stem" stroke-width="${w.toFixed(1)}" d="M${f(x)} ${f(y)}Q${f(x + lean * 0.2)} ${f(y - h * 0.55)} ${f(tx)} ${f(ty)}"/>`
  if (plume <= 0) return out
  const dir = lean >= 0 ? 1 : -1
  let d = ''
  for (let k = 0; k < strands; k++) {
    const t = strands === 1 ? 0 : k / (strands - 1) - 0.5
    d += `M${f(tx)} ${f(ty)}q${f(dir * plume * 0.25)} ${f(plume * 0.1)} ${f(dir * plume * (0.35 + t * 0.35))} ${f(plume * (0.75 - Math.abs(t) * 0.35))}`
  }
  return out + `<path class="plume" d="${d}"/>`
}

/** A layer of grass across the width; each blade sways from its base (its box's bottom
 *  centre), and the delay grows with x so each gust rolls through from left to right. */
function grass(seed: number, count: number, baseY: number, depth: number, minH: number, maxH: number, layer: string): string {
  const r = random(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = -40 + r() * (W + 80)
    const y = baseY + r() * depth
    const h = minH + r() * (maxH - minH)
    const lean = (r() - 0.25) * h * 0.35
    const plume = r() < 0.85 ? h * (0.22 + r() * 0.12) : 0
    const k = Math.min(11, Math.floor(((x + 40) / (W + 80)) * 12))
    out += `<g class="${layer} k${k}">${blade(x, y, h, lean, (layer === 'gf' ? 1.8 + r() * 2 : 1.3 + r() * 1.1), plume, layer === 'gf' ? 3 : 2)}</g>`
  }
  return out
}

/** Golden autumn trees along the far shore, as clumps of round crowns. */
function autumnTrees(seed: number): string {
  const r = random(seed)
  let dark = ''
  let mid = ''
  let lit = ''
  for (let x = 620; x < W + 60; x += 14 + r() * 22) {
    const top = 560 - (40 + r() * 120) * (0.6 + ((x - 620) / (W - 620)) * 0.7)
    for (let k = 0; k < 3; k++) {
      const cx = x + (r() - 0.5) * 30
      const cy = top + k * 26 + r() * 14
      const rad = 18 + r() * 22
      dark += blob(cx + 4, cy + 8, rad)
      mid += blob(cx, cy, rad * 0.9)
      if (r() < 0.6) lit += blob(cx - rad * 0.3, cy - rad * 0.3, rad * 0.45)
    }
  }
  return `<path class="tr-d" d="${dark}"/><path class="tr" d="${mid}"/><path class="tr-l" d="${lit}"/>`
}

/** Golden leaves carried across the field by the breeze. */
function leaves(seed: number): string {
  const r = random(seed)
  let out = ''
  for (let i = 0; i < 12; i++) {
    out += `<g transform="translate(${f(-60)} ${f(300 + r() * 380)})"><ellipse class="leaf l${i % 6}" rx="4.5" ry="2.4"/></g>`
  }
  return out
}

const FIELD_STYLE =
  `.s0{stop-color:var(--sky-top)}.s1{stop-color:var(--sky-mid)}.s2{stop-color:var(--sky-low)}` +
  `.g0{stop-color:var(--sun);stop-opacity:.55}.g1{stop-color:var(--sun);stop-opacity:0}` +
  `.m0{stop-color:var(--mist);stop-opacity:0}.m1{stop-color:var(--mist);stop-opacity:.5}.m2{stop-color:var(--mist);stop-opacity:0}` +
  `.d0{stop-color:var(--stem-lit)}.d1{stop-color:var(--stem)}` +
  `.hills{fill:var(--hills)}.lake{fill:var(--lake)}.tr{fill:var(--trees)}.tr-d{fill:var(--trees-dark)}.tr-l{fill:var(--trees-lit);opacity:.35}` +
  `.stem{fill:none;stroke:var(--stem-lit);stroke-linecap:round}.gb .stem{stroke:var(--stem)}` +
  `.plume{fill:none;stroke:var(--plume);stroke-width:2.2;stroke-linecap:round}.gb .plume{opacity:.45}.gf .plume{opacity:.75;stroke-width:3}` +
  `.gf,.gb{transform-box:fill-box;transform-origin:50% 100%;animation:breeze 8s ease-in-out infinite}.gb{animation-name:breeze-s}` +
  Array.from({ length: 12 }, (_, k) => `.k${k}{animation-delay:${(-8 + k * 0.28).toFixed(2)}s}`).join('') +
  `.sunglow{animation:breathe 16s ease-in-out infinite alternate;transform-origin:330px 380px}` +
  `.mist{animation:mist 40s ease-in-out infinite alternate}.mist2{animation-duration:55s;animation-direction:alternate-reverse}` +
  `.leaf{fill:var(--leaf);opacity:0;animation:carry 16s linear infinite}` +
  [0, -3, -6, -9, -12, -14].map((d, i) => `.l${i}{animation-delay:${d}s${i % 2 ? ';animation-duration:20s' : ''}}`).join('') +
  `@keyframes breeze{0%,100%{transform:rotate(0)}22%{transform:rotate(7deg)}34%{transform:rotate(3deg)}48%{transform:rotate(8.5deg)}70%{transform:rotate(1.5deg)}}` +
  `@keyframes breeze-s{0%,100%{transform:rotate(0)}22%{transform:rotate(4deg)}34%{transform:rotate(1.5deg)}48%{transform:rotate(5deg)}70%{transform:rotate(1deg)}}` +
  `@keyframes breathe{from{opacity:.75;transform:scale(1)}to{opacity:1;transform:scale(1.06)}}` +
  `@keyframes mist{from{transform:translateX(-60px)}to{transform:translateX(60px)}}` +
  `@keyframes carry{0%{transform:translate(0,0) rotate(0);opacity:0}6%{opacity:.9}50%{transform:translate(900px,80px) rotate(360deg)}92%{opacity:.8}100%{transform:translate(1760px,40px) rotate(720deg);opacity:0}}` +
  REDUCED

/** Animated: the silver grass field at dusk. */
export function fieldSvg(palette: Palette): string {
  const c = palette[palette.mode].scene
  const defs =
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s0"/><stop offset=".55" class="s1"/><stop offset="1" class="s2"/></linearGradient>` +
    `<radialGradient id="sun"><stop offset="0" class="g0"/><stop offset="1" class="g1"/></radialGradient>` +
    `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="m0"/><stop offset=".5" class="m1"/><stop offset="1" class="m2"/></linearGradient>` +
    `<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="d0"/><stop offset="1" class="d1"/></linearGradient>`
  const body =
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    `<g class="sunglow"><circle cx="330" cy="380" r="420" fill="url(#sun)"/></g>` +
    `<path class="hills" d="${ridge(520, 70, 13)}"/>` +
    `<rect class="lake" y="555" width="${W}" height="60"/>` +
    autumnTrees(19) +
    `<rect class="mist" x="-100" y="470" width="${W + 200}" height="150" fill="url(#mist)"/>` +
    `<rect y="600" width="${W}" height="${H - 600}" fill="url(#ground)"/>` +
    grass(31, 400, 610, 230, 14, 40, 'gb') +
    `<rect class="mist mist2" x="-100" y="590" width="${W + 200}" height="120" fill="url(#mist)"/>` +
    grass(37, 320, 720, 300, 45, 110, 'gf') +
    leaves(43)
  const fr = frosted(palette, body)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">` +
    `<style>svg{${vars(c)}}${FIELD_STYLE}</style><defs>${defs}${fr.defs}</defs>${fr.body}</svg>`
  )
}

export function sceneSvg(palette: Palette): string {
  if (palette.art === 'bands') return bandsSvg(palette)
  return palette.art === 'field' ? fieldSvg(palette) : lakeSvg(palette)
}
