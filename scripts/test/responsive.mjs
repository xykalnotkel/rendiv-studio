import { chromium, devices } from 'playwright';
const B = process.argv[2] ?? 'http://localhost:4400';
const sizes = [
  ['iPhone SE      ', 375, 667],
  ['iPhone 14 Pro  ', 393, 852],
  ['Android besar  ', 412, 915],
  ['Tablet potret  ', 768, 1024],
  ['Laptop 13"     ', 1280, 800],
  ['Desktop lebar  ', 1920, 1080],
];
const b = await chromium.launch();
for (const [name, w, h] of sizes) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await p.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1800);

  const m = await p.evaluate(() => ({
    scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    player: (() => { const e = document.querySelector('.player'); if (!e) return null;
      const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
    tiny: [...document.querySelectorAll('button')]
      .filter(e => e.getBoundingClientRect().height < 38).length,
    cols: getComputedStyle(document.querySelector('.layout')).gridTemplateColumns,
  }));
  const ok = !m.scrollX && m.tiny === 0 && errs.length === 0;
  console.log(`${name} ${String(w).padStart(4)}x${h}  ${ok ? '✓' : '✗'}` +
    `  hscroll=${m.scrollX ? '+' + m.overflow + 'px' : 'tidak'}` +
    `  player=${m.player ? m.player.w + 'x' + m.player.h : '-'}` +
    `  tombol_kecil=${m.tiny}` +
    `  kolom=${m.cols.split(' ').length}` +
    (errs.length ? `  ERR=${errs[0].slice(0,40)}` : ''));
  await p.screenshot({ path: `out/rwd-${w}.png`, fullPage: false });
  await p.close();
}
await b.close();
