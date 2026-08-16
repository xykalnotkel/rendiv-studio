import { chromium } from 'playwright';
const B = process.argv[2] ?? 'http://localhost:4500';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message.split('\n')[0]));
await p.goto(B, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2000);

// buka scene pembuka & ubah teks
await p.locator('.acc-head', { hasText: 'Pembuka' }).click();
await p.waitForTimeout(600);
const inp = p.locator('.acc-body input.input').first();
await inp.fill('TES EDITOR');
await p.waitForTimeout(1500);

const body = await p.locator('body').innerText();
console.log('teks baru tampil di player :', body.includes('TES EDITOR') ? '✓' : '✗');
console.log('tombol reset muncul        :', await p.locator('.panel-head .linkbtn').count() ? '✓' : '✗');

// reset
await p.locator('.panel-head .linkbtn').click();
await p.waitForTimeout(1200);
const after = await p.locator('body').innerText();
console.log('reset mengembalikan asli   :', !after.includes('TES EDITOR') && after.includes('Bikin video') ? '✓' : '✗');
console.log('error konsol               :', errs.length ? errs.slice(0,2) : '✓ tidak ada');
await p.screenshot({ path: 'out/editor.png' });
await b.close();
