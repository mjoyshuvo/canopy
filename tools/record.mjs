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

// A stand-in for the Claude desktop app's Code tab: same layout (window bar, sidebar,
// conversation, prompt box, right panel), made-up sessions and conversation.
const I = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  art: '<rect x="5" y="4" width="11" height="14" rx="2"/><path d="M9 20h9V8"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  bag: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2"/>',
  dots: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  term: '<path d="m5 7 5 5-5 5M12 18h7"/>',
  diff: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v6M9 11h6M9 17h6"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
  folder: '<path d="M4 7h6l2 2h8v9H4z"/>',
  side: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5v14"/>',
  left: '<path d="m14 6-6 6 6 6"/>', right: '<path d="m10 6 6 6-6 6"/>',
  down: '<path d="m7 10 5 5 5-5"/>', copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>',
  mic: '<rect x="9" y="4" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3"/>',
  pc: '<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 19h20"/>', gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20h4"/>',
  branch: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="14" r="2"/><path d="M7 8v10M7 12c0 2 3 2 8 2"/>',
  code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>', chat: '<path d="M5 6h14v9H9l-4 3z"/>',
}
const ic = (n, s = 16) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24">${I[n]}</svg>`

function page(p) {
  const m = p[p.mode]
  const a = m.anchors
  const role = m.roles
  const glass = p.glass
  const dark = p.mode === 'dark'
  const lift = dark ? a['surface-2'] + 'cc' : a['surface-2']
  const code = dark ? '#0a2422d9' : '#f3efd9'
  // Silver grass keeps the right panel closed so its katana, on the right, is in view.
  const panel = p.id !== 'silver-grass'
  const line = a['text-muted'] + '40'
  // Colors sampled from the real app with each theme on, for the parts the mock draws itself.
  const v = {
    'apple-green': { side: '#eef4eb', edge: '#dae1d1', code: '#eef0f2', bubble: '#e5efe9', input: '#eef3ed' },
  }[p.id] ?? { side: a['surface-0'], edge: line, code, bubble: lift, input: lift }
  const nav = [['plus', 'New'], ['search', 'Search'], ['art', 'Artifacts'], ['clock', 'Scheduled'], ['bell', 'On-call'], ['bag', 'Customize'], ['dots', 'More']]
  const groups = [
    ['Weather app', ['Hourly forecast chart', 'Fix flaky date tests', 'Offline cache']],
    ['Docs site', ['Search index rebuild', 'Dark mode for tables']],
    ['Today', ['Garden planner API', 'Calm theme for the app']],
  ]
  return `<!doctype html><html><head><style>
  *{box-sizing:border-box;margin:0}
  body{width:${W}px;height:${H}px;overflow:hidden;font:13px/1.5 -apple-system,system-ui,sans-serif;color:${a['text-primary']};background:${a['surface-0']}}
  #bg{position:absolute;inset:0}#bg svg{width:100%;height:100%;display:block}
  #veil{position:absolute;inset:0;backdrop-filter:blur(${glass.blur}px);background:${glass.tint}${Math.round(glass.opacity * 255).toString(16).padStart(2, '0')}}
  .ic{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
  .app{position:absolute;inset:0;display:grid;grid-template-columns:21.25% 1fr ${panel ? '16.25%' : ''};grid-template-rows:34px 1fr}
  .bar{display:flex;align-items:center;gap:10px;padding:0 12px;color:${a['text-secondary']}}
  .lights{display:flex;gap:7px;margin-right:6px}.lights i{width:11px;height:11px;border-radius:50%;display:block}
  .seg{margin-left:auto;display:flex;gap:2px;background:${line};border-radius:7px;padding:2px}.seg span{padding:2px 5px;border-radius:5px;display:flex}.seg .on{background:${lift}}
  .title{font-size:13px;color:${a['text-primary']};display:flex;gap:4px;align-items:center;padding-left:18px}
  .tools{margin-left:auto;display:flex;gap:12px;align-items:center}.tools .on{background:${line};border-radius:6px;padding:2px}
  .solid{background:${v.side}}
  .side.solid{border-right:1px solid ${v.edge}}.right.solid{border-left:1px solid ${v.edge}}
  .side{padding:6px 10px;overflow:hidden;display:flex;flex-direction:column}
  .nav{display:flex;gap:9px;align-items:center;padding:4px 6px;color:${a['text-primary']}}
  .grp{display:flex;justify-content:space-between;align-items:center;margin:12px 6px 4px;font-weight:600;font-size:12px;color:${a['text-secondary']}}
  .ses{padding:4px 6px;border-radius:7px;color:${a['text-primary']};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ses{display:flex;justify-content:space-between}.ses em{font-style:normal;color:${role.pro};display:flex;gap:3px;align-items:center;font-size:12px}
  .grp span{display:flex;gap:3px;align-items:center}
  .ses.on{background:${lift}}
  .me{margin-top:auto;display:flex;align-items:center;gap:8px;padding:8px 6px;color:${a['text-primary']}}.me b{width:16px;height:16px;border-radius:4px;background:${role.success}}
  .me .ic{margin-left:auto;color:${a['text-muted']}}
  .main{display:flex;flex-direction:column;padding:6px 42px 10px;gap:12px;overflow:hidden}
  .claude{font:15px/1.55 Georgia,'Times New Roman',serif;color:${a['text-primary']}}
  .claude ul{padding-left:22px;margin-top:6px}.claude li{margin:3px 0}
  code{font:12.5px ui-monospace,Menlo,monospace;background:${line};padding:1px 4px;border-radius:4px}
  pre{position:relative;background:${v.code};border:1px solid ${line};border-radius:8px;padding:10px 12px;font:12px/1.6 ui-monospace,Menlo,monospace;color:${a['text-secondary']};width:62%}
  pre .ic{position:absolute;right:9px;top:9px;color:${a['text-muted']}}
  .k{color:${role.accent}}.s{color:${role.success}}.n{color:${role.pro}}.f{color:${role.danger}}.v{color:${role.warning}}
  .you{align-self:flex-end;border:1px solid ${line};background:${v.bubble};padding:8px 14px;border-radius:12px;font-size:14px}
  .tool{display:flex;gap:8px;align-items:center;color:${a['text-muted']};font-size:12.5px}.tool b{color:${role.success};font-weight:500}.tool i{color:${role.danger};font-style:normal}
  .box{margin-top:auto;display:flex;align-items:center;gap:10px;border:1px solid ${line};background:${v.input};border-radius:12px;padding:11px 12px;color:${a['text-muted']}}
  .box .ic:last-child{margin-left:auto}
  .foot{display:flex;justify-content:flex-end;gap:14px;font-size:11.5px;color:${a['text-muted']}}
  .right{padding:10px 14px;border-left:1px solid ${line};font-size:12.5px}
  .right h5{font-size:12.5px;font-weight:500;margin:14px 0 6px;color:${a['text-primary']};display:flex;justify-content:space-between}
  .row{display:flex;align-items:center;gap:8px;padding:4px 0;color:${a['text-primary']}}
  .tog{margin-left:auto;width:26px;height:15px;border-radius:8px;background:${role.accent};position:relative}.tog:after{content:'';position:absolute;right:2px;top:2px;width:11px;height:11px;border-radius:50%;background:#fff}
  .meter{display:flex;align-items:center;gap:6px;color:${a['text-muted']}}.meter span{width:26px;height:6px;border-radius:3px;background:${line};position:relative}.meter span:after{content:'';position:absolute;left:0;top:0;bottom:0;width:30%;border-radius:3px;background:${role.accent}}
  .badge{width:16px;text-align:center;font-size:10px;color:${a['text-muted']}}
  </style></head><body>
  <div id="bg">${sceneSvg(p)}</div>
  <div class="app">
    <div class="bar solid"><div class="lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>${ic('side')}${ic('left')}${ic('right')}
      <div class="seg"><span>${ic('chat', 14)}</span><span class="on">${ic('code', 14)}</span></div></div>
    <div class="bar"><div class="title">Calm theme for the app ${ic('down', 14)}</div>${panel ? '' : `<div class="tools"><span class="on">${ic('list')}</span>${ic('term')}${ic('diff')}${ic('globe')}${ic('folder')}${ic('dots')}</div>`}</div>
    ${panel ? `<div class="bar solid"><div class="tools"><span class="on">${ic('list')}</span>${ic('term')}${ic('diff')}${ic('globe')}${ic('folder')}${ic('dots')}</div></div>` : ''}
    <div class="side solid">
      ${nav.map(([i, t]) => `<div class="nav">${ic(i)}${t}</div>`).join('')}
      ${groups.map(([g, items]) => `<div class="grp"><span>${g} ${ic('down', 12)}</span>${ic('plus', 13)}</div>` + items.map((t, k) => `<div class="ses${t.startsWith('Calm') ? ' on' : ''}"><span>${t}</span>${k === 0 ? `<em>${ic('branch', 13)} ${3 + t.length % 9}</em>` : ''}</div>`).join('')).join('')}
      <div class="me"><b></b>You ${ic('gear', 14)}</div>
    </div>
    <div class="main">
      <div class="claude">The theme is in. Here's what changed:
        <ul><li><strong>Colors:</strong> soft surfaces with a brighter <span style="color:${role.accent}">accent</span> for links and icons.</li>
        <li><strong>Backdrop:</strong> a still scene behind the conversation, kept away from the text.</li></ul></div>
      <div class="tool">${ic('diff', 14)} Edited <code>theme.ts</code> <b>+24</b> <i>−6</i></div>
      <pre>${ic('copy', 14)}<span class="k">export const</span> <span class="v">look</span> = <span class="f">makeColors</span>({
  <span class="v">label</span>: <span class="s">'${p.label}'</span>,
  <span class="v">roles</span>: { <span class="v">accent</span>: <span class="s">'${role.accent}'</span> },
  <span class="v">contrast</span>: <span class="n">4.5</span>,
})</pre>
      <div class="claude">Run <code>/canopy ${p.id}</code> to switch to it.</div>
      <div class="you">Looks great, ship it</div>
      <div class="box">${ic('plus')}Type / for commands${ic('mic')}</div>
      <div class="foot"><span>Model</span><span>Auto</span></div>
    </div>
    ${panel ? `    <div class="right solid">
      <h5>Environment</h5>
      <div class="row">${ic('pc', 14)}This computer</div>
      <div class="row">${ic('folder', 14)}garden-planner</div>
      <div class="row">${ic('globe', 14)}Remote Control<span class="tog"></span></div>
      <h5>Context <span class="meter">30% <span></span></span></h5>
      <h5>Connectors</h5>
      <div class="row"><span class="badge">G</span>GitHub</div>
      <div class="row"><span class="badge">L</span>Linear</div>
      <div class="row"><span class="badge">S</span>Slack</div>
    </div>
` : ''}
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
