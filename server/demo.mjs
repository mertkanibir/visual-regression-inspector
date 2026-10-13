import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Box, Code2, Terminal, Folder, CheckCircle2, GitBranch, ArrowUpRight } from 'lucide-react';

const icon = (Component, size = 16) =>
  renderToStaticMarkup(createElement(Component, { size, strokeWidth: 1.8, 'aria-hidden': true }));

/** Deterministic contemporary admin fixture; candidate changes CSS, not content. */
export function demoPage(variant = 'baseline') {
  const candidate = variant === 'candidate';
  const builds = [
    ['#1048', 'a12f4c8', '41s', 'Passed'],
    ['#1047', '83d091e', '39s', 'Passed'],
    ['#1046', 'f320bc4', '42s', 'Passed'],
    ['#1045', '18ba47d', '37s', 'Passed'],
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Project settings — Prism demo ${variant}</title>
  <style>
    @font-face { font-family: Manrope; src: url('/fonts/manrope-latin-400-normal.woff2') format('woff2'); font-weight: 400; font-display: swap; }
    @font-face { font-family: Manrope; src: url('/fonts/manrope-latin-600-normal.woff2') format('woff2'); font-weight: 600; font-display: swap; }
    @font-face { font-family: Manrope; src: url('/fonts/manrope-latin-700-normal.woff2') format('woff2'); font-weight: 700; font-display: swap; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #332841; background: #f6f3fa; font: 14px Manrope, Arial, sans-serif; }
    header { height: 70px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 32px; background: #ffffff; border-bottom: 1px solid #e6deee; }
    .project { display: flex; align-items: center; gap: 12px; font-size: 17px; font-weight: 700; letter-spacing: -.4px; }
    .project-icon { display: grid; place-items: center; height: 36px; width: 36px; color: #795ba3; background: #f0e8fb; border: 1px solid #e1d2f1; border-radius: 11px; }
    nav { display: flex; gap: 5px; border: 1px solid #e6ddee; padding: 4px; border-radius: 11px; background: #faf8fd; }
    nav span { padding: 7px 14px; color: #88748f; font-size: 12px; border-radius: 7px; }
    nav .active { color: #6f4793; background: #eee3f8; font-weight: 600; }
    .fixture { color: #83718d; font-size: 10px; letter-spacing: .5px; }
    main { padding: 24px 32px; margin: auto; }
    .page-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
    h1 { font-size: 26px; font-weight: 700; letter-spacing: -.8px; margin: 0 0 5px; }
    .description { color: #87728f; font-size: 12px; margin: 0; }
    .environment { display: flex; align-items: center; gap: 7px; color: #765985; background: #f0e9f7; padding: 8px 12px; border: 1px solid #e0d3eb; border-radius: 10px; font-size: 11px; }
    section { background: #fff; border: 1px solid #e7dfed; border-radius: 15px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 5px 17px #67488408; }
    .section-heading { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #ede7f2; font-size: 15px; font-weight: 700; }
    .section-heading small { color: #97839f; font-size: 11px; font-weight: 400; }
    .setting-row { display: grid; grid-template-columns: ${candidate ? 320 : 255}px 1fr; gap: 20px; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f1ecf5; }
    .setting-label { display: flex; align-items: center; gap: 11px; }
    .setting-icon { display: grid; place-items: center; height: 32px; width: 32px; background: #f7f3fb; color: #9871ae; border: 1px solid #ebdfef; border-radius: 10px; flex-shrink: 0; }
    .setting-row strong { display: block; font-size: 13px; font-weight: 600; }
    .setting-row small { display: block; color: #95859f; font-size: 10px; margin-top: 4px; }
    .input { padding: 10px 13px; font: 12px ui-monospace, monospace; border: 1px solid #e1d5eb; border-radius: 9px; color: #7c5b91; background: #fcfafd; }
    .form-actions { padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
    .form-actions span:first-child { font-size: 10px; color: #9683a0; }
    .button { display: inline-flex; align-items: center; gap: 7px; padding: ${candidate ? '10px 22px' : '8px 14px'}; font-size: 11px; font-weight: 600; background: ${candidate ? '#cf929b' : '#a17bbc'}; border: 1px solid ${candidate ? '#c88291' : '#956db4'}; border-radius: ${candidate ? 13 : 9}px; color: white; box-shadow: 0 3px 8px #7d4d9315; }
    .build-title span { font-size: 10px; color: #8e7499; font-weight: 400; display: flex; align-items: center; gap: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 10px 20px; color: #a08ca7; background: #fcfafd; font-size: 10px; font-weight: 500; border-bottom: 1px solid #ede5f3; }
    td { padding: ${candidate ? 12 : 8}px 20px; border-bottom: 1px solid #f1ecf5; font: 11px ui-monospace, monospace; color: #7b6886; }
    tr:last-child td { border-bottom: 0; }
    .run { color: #76538e; font-weight: 600; }
    .passed { display: inline-flex; align-items: center; gap: 5px; color: #679378; background: #f0f8f2; border: 1px solid #dceade; border-radius: 7px; padding: 4px 7px; font: 10px Manrope, sans-serif; }
    @media(max-width:700px) { header { padding: 0 20px; height: 62px; } .project { font-size: 14px; } nav { display: none; } .fixture { font-size: 8px; } main { padding: 20px; } h1 { font-size: 23px; } .description { font-size: 10px; } .setting-row { grid-template-columns: ${candidate ? 200 : 165}px 1fr; gap: 10px; padding: 13px 15px; } .setting-icon { height: 28px; width: 28px; } .setting-label { gap: 7px; } .setting-row strong { font-size: 11px; } .setting-row small { font-size: 8px; } .input { font-size: 10px; padding: 10px; } .section-heading { padding: 14px 15px; } .section-heading small { display: none; } th,td { padding-left: 15px; padding-right: 15px; } }
  </style>
</head>
<body>
  <header><div class="project"><span class="project-icon">${icon(Box, 21)}</span>sample-project</div><nav><span>Overview</span><span>Builds</span><span class="active">Settings</span><span>Environment</span></nav><span class="fixture">PRISM DEMO FIXTURE</span></header>
  <main>
    <div class="page-title"><div><h1>Project settings</h1><p class="description">Build and deployment configuration.</p></div><span class="environment">${icon(GitBranch, 13)}production</span></div>
    <section>
      <div class="section-heading">Build configuration<small>Applied to all new builds</small></div>
      <div class="setting-row"><div class="setting-label"><span class="setting-icon">${icon(Code2)}</span><div><strong>Framework</strong><small>Detected from package.json</small></div></div><div class="input">Vite</div></div>
      <div class="setting-row"><div class="setting-label"><span class="setting-icon">${icon(Terminal)}</span><div><strong>Build command</strong><small>Runs after dependency installation</small></div></div><div class="input">npm run build</div></div>
      <div class="setting-row"><div class="setting-label"><span class="setting-icon">${icon(Folder)}</span><div><strong>Output directory</strong><small>Static files served after a build</small></div></div><div class="input">dist</div></div>
      <div class="form-actions"><span>Changes apply to your next build.</span><span class="button">Save changes${icon(ArrowUpRight, 13)}</span></div>
    </section>
    <section>
      <div class="section-heading build-title">Latest builds<span>${icon(GitBranch, 12)}Branch: main</span></div>
      <table><thead><tr><th>Run</th><th>Commit</th><th>Duration</th><th>Status</th></tr></thead><tbody>${builds.map(([run, commit, duration, status]) => `<tr><td class="run">${run}</td><td>${commit}</td><td>${duration}</td><td><span class="passed">${icon(CheckCircle2, 11)}${status}</span></td></tr>`).join('')}</tbody></table>
    </section>
  </main>
</body>
</html>`;
}
