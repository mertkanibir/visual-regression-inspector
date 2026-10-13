/** Deterministic admin fixture; the candidate changes only CSS, never its data. */
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
    * { box-sizing: border-box; }
    body { margin: 0; color: #26313d; background: #f5f6f8; font: 14px Arial, sans-serif; }
    header { height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 30px; background: #e9edf2; border-bottom: 1px solid #bdc6d2; }
    .project { font: 13px monospace; font-weight: 600; }
    .fixture { color: #657287; font-size: 12px; }
    main { max-width: 1150px; padding: 24px 30px; margin: auto; }
    .page-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
    h1 { font-size: 22px; font-weight: 600; margin: 0; }
    .environment { font: 12px monospace; color: #58677b; }
    nav { display: flex; gap: 26px; border-bottom: 1px solid #bac4d2; margin-bottom: 22px; font-size: 13px; }
    nav span { padding: 0 0 12px; color: #657289; }
    nav .active { color: #164a91; border-bottom: 2px solid #225db7; }
    section { background: #fff; border: 1px solid #c5cdd8; border-radius: 3px; margin-bottom: 22px; }
    .section-heading { padding: 14px 16px; border-bottom: 1px solid #d3d9e2; background: #fafbfc; font-weight: 600; }
    .setting-row { display: grid; grid-template-columns: ${candidate ? 300 : 240}px 1fr; gap: 22px; align-items: center; padding: 17px 16px; border-bottom: 1px solid #e0e5ec; }
    .setting-row strong { display: block; font-size: 13px; font-weight: 500; }
    .setting-row small { display: block; color: #718097; font-size: 11px; margin-top: 6px; }
    .input { padding: 9px 11px; font: 12px monospace; border: 1px solid #acb8c9; border-radius: 3px; color: #374963; background: #fff; }
    .form-actions { padding: 13px 16px; display: flex; justify-content: end; }
    .button { display: inline-block; padding: ${candidate ? '10px 22px' : '8px 13px'}; font-size: 12px; background: ${candidate ? '#386bc0' : '#225db7'}; border: 1px solid #1b509e; border-radius: ${candidate ? 8 : 3}px; color: white; }
    .build-title { display: flex; align-items: center; justify-content: space-between; }
    .build-title span { font: 11px monospace; color: #6c7b90; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; color: #6d798c; padding: 9px 16px; background: #f3f5f8; font-size: 11px; font-weight: 500; border-bottom: 1px solid #ccd5e0; }
    td { padding: ${candidate ? 13 : 9}px 16px; border-bottom: 1px solid #e0e5ec; font-family: monospace; }
    tr:last-child td { border-bottom: 0; }
    .passed { display: inline-block; color: #246745; background: #f1f8f3; border: 1px solid #b8d2c1; border-radius: 3px; padding: 3px 6px; font: 11px Arial, sans-serif; }
    @media(max-width:700px) { header { padding: 0 18px; } main { padding: 20px 18px; } .fixture { display: none; } h1 { font-size: 19px; } .setting-row { grid-template-columns: ${candidate ? 175 : 145}px 1fr; gap: 12px; } .input { font-size: 10px; } nav { gap: 18px; } th,td { padding-left: 12px; padding-right: 12px; } }
  </style>
</head>
<body>
  <header><span class="project">sample-project / build</span><span class="fixture">Prism demo fixture</span></header>
  <main>
    <div class="page-title"><h1>Project settings</h1><span class="environment">production</span></div>
    <nav><span>Overview</span><span>Builds</span><span class="active">Settings</span><span>Environment</span></nav>
    <section>
      <div class="section-heading">Build configuration</div>
      <div class="setting-row"><div><strong>Framework</strong><small>Detected from package.json</small></div><div class="input">Vite</div></div>
      <div class="setting-row"><div><strong>Build command</strong><small>Runs after dependency installation</small></div><div class="input">npm run build</div></div>
      <div class="setting-row"><div><strong>Output directory</strong><small>Static files served after a build</small></div><div class="input">dist</div></div>
      <div class="form-actions"><span class="button">Save changes</span></div>
    </section>
    <section>
      <div class="section-heading build-title">Latest builds<span>Branch: main</span></div>
      <table><thead><tr><th>Run</th><th>Commit</th><th>Duration</th><th>Status</th></tr></thead><tbody>${builds.map(([run, commit, duration, status]) => `<tr><td>${run}</td><td>${commit}</td><td>${duration}</td><td><span class="passed">${status}</span></td></tr>`).join('')}</tbody></table>
    </section>
  </main>
</body>
</html>`;
}
