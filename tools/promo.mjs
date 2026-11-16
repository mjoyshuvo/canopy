// Renders a busy, multi-pane Code tab session (sample content only) in every Canopy theme,
// for the promo GIF. Layout copied from a real session; every name, link and line of code is made up.
// Usage: node tools/promo.mjs <playwright module path> <out dir>
import { writeFileSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const [, , playwrightPath, outDir] = process.argv
const { chromium } = await import(pathToFileURL(resolve(playwrightPath, 'index.mjs')).href)
const hooks = resolve(import.meta.dirname, '../plugins/canopy/hooks')
const tmp = resolve(outDir, '_hooks')
mkdirSync(tmp, { recursive: true })
for (const name of ['palettes', 'scene']) {
  const src = readFileSync(resolve(hooks, `${name}.ts`), 'utf8').replace(/from '\.\/(palettes|scene|make-colors)'/g, (_, m) => `from './${m}.${m === 'make-colors' ? 'js' : 'mts'}'`)
  writeFileSync(resolve(tmp, `${name}.mts`), src)
}
copyFileSync(resolve(hooks, 'make-colors.js'), resolve(tmp, 'make-colors.js'))
const { PALETTES, PALETTE_IDS } = await import(pathToFileURL(resolve(tmp, 'palettes.mts')).href)
const { sceneSvg } = await import(pathToFileURL(resolve(tmp, 'scene.mts')).href)

const W = 1200
const H = 780

const I = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  bag: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2"/>',
  dots: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  term: '<path d="m5 7 5 5-5 5M12 18h7"/>',
  diff: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v6M9 11h6M9 17h6"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
  folder: '<path d="M4 7h6l2 2h8v9H4z"/>',
  side: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5v14"/>',
  left: '<path d="m14 6-6 6 6 6"/>', right: '<path d="m10 6 6 6-6 6"/>',
  down: '<path d="m7 10 5 5 5-5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  mic: '<rect x="9" y="4" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
  branch: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="14" r="2"/><path d="M7 8v10M7 12c0 2 3 2 8 2"/>',
  pr: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M6 8v8M18 16V9a2 2 0 0 0-2-2h-4M14 5l-2 2 2 2"/>',
  code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>', chat: '<path d="M5 6h14v9H9l-4 3z"/>',
  expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', win: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/>',
  reload: '<path d="M19 12a7 7 0 1 1-2-5M19 4v4h-4"/>', ret: '<path d="M19 6v6H6M10 8l-4 4 4 4"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
}
const ic = (n, s = 15) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24">${I[n]}</svg>`

const groups = [
  ['Weather app', [['Hourly forecast chart', 'pr', 13], ['└ Hourly forecast chart', 'branch'], ['Fix flaky date tests', 'branch', 2], ['Offline cache for the map', 'branch'], ['Radar tiles cost review', 'branch', 20]]],
  ['Docs site', [['Search index rebuild'], ['Dark mode for tables'], ['Broken links audit']]],
  ['Garden planner', [['GP-214: Seed the spring sowing plan', null, null, true], ['└ GP-214: Seed the spring sowing', null], ['Watering schedule API', 'pr', 2], ['└ Watering schedule API plan', null]]],
  ['Today', [['Canopy theme promo', 'dot']]],
]

const fileLines = [
  ['c', '# Seeds the spring sowing plan for every bed'],
  ['c', '# in the demo garden. Safe to run twice:'],
  ['c', '# it updates rows that already exist.'],
  ['', ''],
  ['k', 'beds:'],
  ['', '  - name: <s>north-raised</s>'],
  ['', '    crops: [<s>peas</s>, <s>radish</s>, <s>spinach</s>]'],
  ['', '    sow_after: <n>2027-03-20</n>'],
  ['', '  - name: <s>south-border</s>'],
  ['', '    crops: [<s>carrots</s>, <s>beets</s>]'],
  ['', '    sow_after: <n>2027-04-02</n>'],
  ['k', 'watering:'],
  ['', '  every_days: <n>2</n>'],
]

const termLines = (a) => [
  `<span class="tp">~/projects/garden-planner</span> on <span class="tb">gp-214-sowing ↑2</span>`,
  `<span class="tc">❯</span> npm run seed -- --env demo`,
  `<span class="tm">› seeding 2 beds, 5 crops</span>`,
  `<span class="tm">› north-raised   ok</span>`,
  `<span class="tm">› south-border   ok</span>`,
  `<span class="tc">❯</span> npm test -- sowing`,
  `<span class="ts">✓</span> plans a bed once`,
  `<span class="ts">✓</span> skips frost dates`,
  `<span class="ts">✓</span> waters every 2 days`,
  `<span class="ts">Tests: 18 passed</span>`,
  ``,
  `<span class="tp">~/projects/garden-planner</span> on <span class="tb">gp-214-sowing ↑2</span>`,
  `<span class="tc">❯</span> <span class="cur"></span>`,
]

function page(p) {
  const m = p[p.mode]
  const a = m.anchors
  const role = m.roles
  const dark = p.mode === 'dark'
  const flat = p.art === 'bands'
  const line = a['text-muted'] + '40'
  const v = {
    'apple-green': { side: '#eef4eb', edge: '#dae1d1', code: '#f3f5ef', bubble: '#f6f9f4', input: '#f6f9f4', main: '#e9efe6' },
  }[p.id] ?? {
    side: flat ? a['surface-0'] : a['surface-0'] + 'cc',
    edge: line,
    code: flat ? a['surface-1'] : '#0a2422d9',
    bubble: (dark ? a['surface-2'] : a['surface-1']) + (flat ? '' : 'cc'),
    input: a['surface-2'] + (flat ? '' : 'cc'),
    main: 'transparent',
  }
  const pane = flat ? a['surface-1'] : a['surface-0'] + 'd9'
  const gh = dark ? a['surface-0'] : '#0d1117'
  const link = role.accent
  return `<!doctype html><html><head><style>
  *{box-sizing:border-box;margin:0}
  body{width:${W}px;height:${H}px;overflow:hidden;font:13px/1.45 -apple-system,system-ui,sans-serif;color:${a['text-primary']};background:${a['surface-0']}}
  #bg{position:absolute;inset:0}#bg svg{width:100%;height:100%;display:block}
  .ic{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
  .app{position:absolute;inset:0;display:grid;grid-template-columns:215px 1fr;grid-template-rows:38px 1fr}
  .bar{display:flex;align-items:center;gap:12px;padding:0 12px;color:${a['text-secondary']};border-bottom:1px solid ${line}}
  .lights{display:flex;gap:7px;margin-right:4px}.lights i{width:11px;height:11px;border-radius:50%;display:block;border:1px solid ${a['text-muted']}66}
  .seg{margin-left:auto;display:flex;gap:2px;background:${line};border-radius:7px;padding:2px}.seg span{padding:2px 5px;border-radius:5px;display:flex}.seg .on{background:${v.bubble}}
  .title{font-size:13.5px;color:${a['text-secondary']};display:flex;gap:6px;align-items:center;padding-left:14px}
  .tools{margin-left:auto;display:flex;gap:13px;align-items:center}.tools .on{background:${line};border-radius:6px;padding:3px}
  .solid{background:${v.side}}
  .side{padding:4px 8px;overflow:hidden;display:flex;flex-direction:column;border-right:1px solid ${v.edge}}
  .nav{display:flex;gap:9px;align-items:center;padding:4px 6px;color:${a['text-primary']}}
  .grp{display:flex;justify-content:space-between;align-items:center;margin:12px 6px 3px;font-size:11.5px;color:${a['text-secondary']}}
  .grp span{display:flex;gap:3px;align-items:center}
  .ses{padding:4px 6px;border-radius:7px;color:${a['text-secondary']};display:flex;gap:6px;align-items:center;font-size:12px}
  .ses span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
  .ses em{font-style:normal;color:${a['text-muted']};display:flex;gap:3px;align-items:center;font-size:11px}
  .ses.on{background:${v.bubble};color:${a['text-primary']}}
  .ses .dot{width:6px;height:6px;border-radius:50%;background:${a['text-muted']}}
  .me{margin-top:auto;display:flex;align-items:center;gap:8px;padding:8px 6px;color:${a['text-primary']};border-top:1px solid ${line}}.me b{width:16px;height:16px;border-radius:50%;background:${role.success}}
  .me .ic{margin-left:auto;color:${a['text-muted']}}
  .main{display:flex;flex-direction:column;padding:18px 90px 8px;gap:13px;overflow:hidden;background:${v.main}}
  .claude{font:15px/1.5 Georgia,'Times New Roman',serif;color:${a['text-primary']}}
  .tool{display:flex;gap:6px;align-items:center;color:${a['text-secondary']};font-size:13.5px}
  .you{align-self:flex-end;width:78%;border:1px solid ${line};background:${v.bubble};padding:10px 14px;border-radius:12px;font-size:14px}
  .you a{color:${link};text-decoration:underline;word-break:break-all}
  .wait{display:flex;gap:8px;align-items:center;color:${a['text-secondary']};font-size:13.5px}.wait b{color:${role.danger};letter-spacing:-2px}
  .work{margin-top:auto;white-space:nowrap;display:flex;align-items:center;gap:12px;border:1px solid ${line};background:${v.input};border-radius:10px;padding:7px 12px;font-size:12.5px;color:${a['text-secondary']}}
  .work i{width:8px;height:8px;border-radius:50%;background:${role.pro}}.work .pill{background:${role.pro};color:${dark ? a['surface-0'] : '#fff'};border-radius:10px;padding:1px 10px;font-weight:600;font-size:11.5px}
  .work .shim{width:60px;height:14px;border-radius:7px;background:repeating-linear-gradient(90deg,${role.pro}55 0 3px,transparent 3px 7px)}
  .box{display:flex;align-items:center;gap:10px;border:1px solid ${line};background:${v.input};border-radius:12px;padding:11px 12px;color:${a['text-muted']};font-size:14px}
  .box .push{margin-left:auto}
  .foot{display:flex;justify-content:flex-end;gap:14px;font-size:11.5px;color:${a['text-muted']}}
  .col{display:flex;flex-direction:column;border-left:1px solid ${line};overflow:hidden;background:${pane}}
  .tab{display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid ${line};color:${a['text-muted']};font-size:12px}
  .tab .chip{display:flex;gap:6px;align-items:center;background:${line};border-radius:6px;padding:3px 8px;color:${a['text-secondary']};font-style:italic;max-width:170px;white-space:nowrap;overflow:hidden}
  .tab .r{margin-left:auto;display:flex;gap:10px}
  .crumb{display:flex;justify-content:space-between;padding:8px 12px;font-size:12px;color:${a['text-secondary']}}
  .file{font:11px/1.75 ui-monospace,Menlo,monospace;color:${a['text-secondary']};padding:0 8px;background:${v.code};flex:1}
  .file div{display:flex;gap:10px;white-space:pre}.file u{text-decoration:none;color:${a['text-muted']};width:16px;text-align:right}
  .file .c{color:${a['text-muted']};font-style:italic}.file .k{color:${role.accent}}.file s{text-decoration:none;color:${role.success}}.file n{color:${role.warning}}
  .url{display:flex;align-items:center;gap:10px;padding:7px 10px;color:${a['text-muted']}}.url span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid ${line};border-radius:7px;padding:3px 8px;color:${a['text-primary']};font-size:12px}
  .gh{background:${gh};color:#e6edf3;padding:10px;display:flex;flex-direction:column;gap:9px;height:250px}
  .gh .top{display:flex;gap:8px;align-items:center;font-size:12px}.gh .top b{border:1px solid #30363d;border-radius:6px;padding:2px 7px}.gh .top .rv{background:#238636;border-color:#238636}
  .gh .card{border:1px solid #30363d;border-radius:7px;padding:8px 10px;font-size:12px;font-weight:600}
  .gh .bar2{height:6px;border-radius:3px;margin-top:6px;background:#2ea043}.gh .hat{height:6px;border-radius:3px;margin-top:6px;background:repeating-linear-gradient(45deg,#30363d 0 3px,transparent 3px 6px)}
  .mini{padding:10px 14px;font:13.5px/1.45 Georgia,serif;color:${a['text-primary']};flex:1}
  .reply{margin:0 10px 12px;border:1px solid ${line};border-radius:12px;padding:9px 12px;color:${a['text-muted']};display:flex;justify-content:space-between;background:${v.input}}
  .tty{font:11px/1.55 ui-monospace,Menlo,monospace;padding:8px 10px;color:${a['text-primary']};white-space:pre-wrap;word-break:break-all}
  .tp{color:${role.accent};font-weight:700}.tb{color:${role.warning}}.tc{color:${role.success}}.tm{color:${a['text-muted']}}.ts{color:${role.success}}
  .badge{align-self:center;margin-top:auto;display:flex;gap:10px;align-items:center;padding:9px 18px;border-radius:999px;background:${v.input};border:1px solid ${role.accent}88;box-shadow:0 6px 24px #0003;font-size:15px}.badge b{color:${role.accent}}.badge code{font:12.5px ui-monospace,Menlo,monospace;color:${a['text-secondary']};background:${line};padding:2px 7px;border-radius:5px}
  .cur{display:inline-block;width:7px;height:13px;background:${role.accent};vertical-align:middle}
  </style></head><body>
  <div id="bg">${sceneSvg(p)}</div>
  <div class="app">
    <div class="bar solid" style="border-right:1px solid ${v.edge}"><div class="lights"><i></i><i></i><i></i></div>${ic('side')}${ic('left')}${ic('right')}
      <div class="seg"><span>${ic('chat', 14)}</span><span class="on">${ic('code', 14)}</span></div></div>
    <div class="bar"><div class="title">GP-214: Seed the spring sowing plan ${ic('down', 14)}</div><div class="tools">${ic('list')}<span class="on">${ic('term')}</span>${ic('diff')}${ic('globe')}${ic('folder')}${ic('dots')}</div></div>
    <div class="side solid">
      <div class="nav">${ic('bag')}Customize</div><div class="nav">${ic('dots')}More</div>
      ${groups.map(([g, items]) => `<div class="grp"><span>${g} ${ic('down', 11)}</span>${ic('plus', 13)}</div>` + items.map(([t, kind, n, on]) => `<div class="ses${on ? ' on' : ''}" ${t.startsWith('└') ? 'style="padding-left:14px"' : ''}><span>${t}</span>${kind === 'dot' ? '<i class="dot"></i>' : kind ? `<em>${ic(kind, 12)}${n ?? ''}</em>` : ''}${on ? ic('dots', 13) : ''}</div>`).join('')).join('')}
      <div class="me"><b></b>You · Acme ${ic('down', 11)}${ic('gear', 14)}</div>
    </div>
    <div class="main">
      <div class="you"><a>https://garden.example.com/plans/spring-2027/beds?view=sowing</a><br>this is the plan page. seed both beds and check the tests</div>
      <div class="tool">Opened a page, ran page script 2 times ${ic('right', 12)}</div>
      <div class="claude">Both beds are in the plan page. I’ll seed them from the YAML file and then run the sowing tests.</div>
      <div class="tool">Ran 2 commands ${ic('right', 12)}</div>
      <div class="claude">Seeding worked: <em>north-raised</em> and <em>south-border</em> each have their crops and sowing dates. Running the tests now.</div>
      <div class="tool">Ran a command, read 3 files ${ic('right', 12)}</div>
      <div class="claude">All 18 sowing tests pass. Frost dates are skipped and watering lands every 2 days. I’ll check the pull request before marking it ready.</div>
      <div class="tool">Checked the pull request ${ic('right', 12)}</div>
      <div class="claude">Checks are green on #214. Waiting for the preview build to finish.</div>
      <div class="wait"><b>⁚⁚</b> Waiting for the preview build&nbsp;&nbsp;1m 52s ${ic('right', 12)}</div>
      <div class="badge">Canopy · <b>${p.label}</b> <code>/canopy ${p.id}</code></div>
      <div class="work" style="margin-top:0"><i></i>Working <span class="shim"></span><span class="pill">Working · 5 steps</span> 4m 10s work · 820k in · 1.2k out <span style="margin-left:auto">▶ Tasks</span>${ic('list', 13)}${ic('x', 13)}</div>
      <div class="box">${ic('plus')}⏎ to send, ⌘⏎ to queue for later<span class="push"></span>${ic('stop', 15)}${ic('mic')}</div>
      <div class="foot"><span>Sonnet 5.5</span><span>Medium</span><span>Auto</span></div>
    </div>
  </div></body></html>`
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
const tab = await browser.newPage({ viewport: { width: W, height: H } })
for (const id of PALETTE_IDS) {
  const p = PALETTES[id]
  const dir = resolve(outDir, id)
  mkdirSync(dir, { recursive: true })
  await tab.setContent(page(p))
  const frames = p.art === 'bands' ? 1 : 30
  for (let i = 0; i < frames; i++) {
    await tab.evaluate(t => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t } }, i * 150 + 4000)
    writeFileSync(resolve(dir, `${String(i).padStart(3, '0')}.png`), await tab.screenshot())
  }
}
await browser.close()
