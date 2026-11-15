// Renders each Canopy look into a mock app window and saves PNG frames for the GIFs.
// Usage: node tools/record.mjs <playwright module path> <out dir>
// Animations are stepped with the Web Animations API, so frames are exact and smooth.
import { writeFileSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const [, , playwrightPath, outDir] = process.argv
const { chromium } = await import(pathToFileURL(resolve(playwrightPath, 'index.mjs')).href)
// The hooks import each other without extensions (the app's loader allows it; Node does not),
// so load ES-module copies with the extensions filled in.
const hooks = resolve(import.meta.dirname, '../plugins/canopy/hooks')
const tmp = resolve(outDir, '_hooks')
mkdirSync(tmp, { recursive: true })
for (const name of ['palettes', 'scene']) {
  const src = readFileSync(resolve(hooks, `${name}.ts`), 'utf8').replace(/from '\.\/(palettes|scene|make-colors)'/g, (_, m) => `from './${m}.${m === 'make-colors' ? 'js' : 'mts'}'`)
  writeFileSync(resolve(tmp, `${name}.mts`), src)
}
copyFileSync(resolve(hooks, 'make-colors.js'), resolve(tmp, 'make-colors.js'))
const { PALETTES } = await import(pathToFileURL(resolve(tmp, 'palettes.mts')).href)
const { sceneSvg } = await import(pathToFileURL(resolve(tmp, 'scene.mts')).href)

const W = 1200
const H = 750

function page(p) {
  const m = p[p.mode]
  const a = m.anchors
  const role = m.roles
  const glass = p.glass
  const panel = p.mode === 'dark' ? 'rgba(7,30,28,.55)' : 'rgba(255,255,255,0)'
  const code = p.mode === 'dark' ? '#0a2422cc' : '#f3efd9'
  return `<!doctype html><html><head><style>
  *{box-sizing:border-box;margin:0}
  body{width:${W}px;height:${H}px;overflow:hidden;font:14px/1.5 -apple-system,system-ui,sans-serif;color:${a['text-primary']};background:${a['surface-0']}}
  #bg{position:absolute;inset:0}
  #bg svg{width:100%;height:100%;display:block}
  #veil{position:absolute;inset:0;backdrop-filter:blur(${glass.blur}px);background:${glass.tint}${Math.round(glass.opacity * 255).toString(16).padStart(2, '0')}}
  .app{position:absolute;inset:0;display:grid;grid-template-columns:21.25% 1fr 16.25%}
  .side{padding:18px 14px;background:${panel}}
  .side h4{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${a['text-muted']};margin:16px 0 8px}
  .item{display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;color:${a['text-secondary']};font-size:13px}
  .item.on{background:${a['surface-2']}${p.mode === 'dark' ? '99' : ''};color:${a['text-primary']}}
  .dot{width:10px;height:10px;border-radius:3px}
  .main{padding:28px 44px;display:flex;flex-direction:column;gap:16px}
  .you{align-self:flex-end;max-width:70%;background:${a['surface-2']}${p.mode === 'dark' ? 'cc' : ''};padding:10px 14px;border-radius:14px}
  .claude{max-width:86%;color:${a['text-primary']}}
  .claude b{color:${role.accent}}
  pre{background:${code};border-radius:10px;padding:12px 14px;font:12.5px/1.55 ui-monospace,Menlo,monospace;color:${a['text-secondary']}}
  .k{color:${role.accent}}.s{color:${role.success}}.n{color:${role.pro}}.f{color:${role.danger}}.v{color:${role.warning}}
  .box{margin-top:auto;border:1px solid ${a['text-muted']}55;background:${a['surface-1']}${p.mode === 'dark' ? 'cc' : ''};border-radius:14px;padding:14px;color:${a['text-muted']}}
  </style></head><body>
  <div id="bg">${sceneSvg(p)}</div><div id="veil"></div>
  <div class="app">
    <div class="side">
      <div class="item on"><span class="dot" style="background:${role.accent}"></span>New session</div>
      <h4>Today</h4>
      <div class="item"><span class="dot" style="background:${role.success}"></span>Theme polish</div>
      <div class="item"><span class="dot" style="background:${role.warning}"></span>Fix flaky test</div>
      <div class="item"><span class="dot" style="background:${role.pro}"></span>Release notes</div>
      <h4>Earlier</h4>
      <div class="item"><span class="dot" style="background:${role.danger}"></span>Auth refactor</div>
    </div>
    <div class="main">
      <div class="you">Make the trees sway a little when the wind blows.</div>
      <div class="claude">Done. Each spruce now <b>bends from its base</b> in slow gusts, at its own pace.</div>
      <pre><span class="k">const</span> <span class="v">gust</span> = <span class="f">sway</span>({ <span class="v">angle</span>: <span class="n">1.6</span>, <span class="v">every</span>: <span class="s">'11s'</span> })
<span class="k">for</span> (<span class="k">const</span> <span class="v">tree</span> <span class="k">of</span> <span class="v">forest</span>) <span class="v">tree</span>.<span class="f">bend</span>(<span class="v">gust</span>)</pre>
      <div class="box">Reply to Claude…</div>
    </div>
    <div class="side"></div>
  </div></body></html>`
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
const tab = await browser.newPage({ viewport: { width: W, height: H } })
for (const id of Object.keys(PALETTES)) {
  const p = PALETTES[id]
  const dir = resolve(outDir, id)
  mkdirSync(dir, { recursive: true })
  await tab.setContent(page(p))
  const frames = p.art === 'bands' ? 1 : 90
  for (let i = 0; i < frames; i++) {
    // 90 frames at 100 ms each: 9 s of scene time, sped up 1.5x in the GIF.
    await tab.evaluate(t => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t } }, i * 150 + 4000)
    writeFileSync(resolve(dir, `${String(i).padStart(3, '0')}.png`), await tab.screenshot())
  }
}
await browser.close()
