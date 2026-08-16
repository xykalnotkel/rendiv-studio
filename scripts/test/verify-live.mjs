import { chromium } from 'playwright';
const B = process.argv[2] ?? 'http://localhost:4300';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message.split('\n')[0]));
p.on('console', m => m.type()==='error' && errs.push(m.text().split('\n')[0]));

await p.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2500);

// isi komposisi ter-render?
const txt = await p.locator('body').innerText();
console.log('teks "Bikin video" :', txt.includes('Bikin video') ? '✓ komposisi render' : '✗ tidak');
console.log('frame counter      :', /frame \d+ \/ \d+/.test(txt) ? '✓' : '✗');

// coba lompat ke scene 3 lalu cek isinya berubah
await p.locator('button:has-text("param")').click();
await p.waitForTimeout(1500);
const t2 = await p.locator('body').innerText();
console.log('setelah klik scene :', /ganti 1 angka|fps/.test(t2) ? '✓ scene berganti' : '✗ tidak berubah');

await p.screenshot({ path: 'out/verify.png' });
console.log('error              :', errs.length ? errs.slice(0,3) : '✓ tidak ada');
await b.close();
