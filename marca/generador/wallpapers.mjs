// Genera los wallpapers SØMA (2160×4680) con Chromium.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , logosDir, outDir] = process.argv;
const svg = (f) => 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(join(logosDir, f))).toString('base64');
const L = {
  desvBlanco: svg('desv-blanco.svg'), desvNegro: svg('desv-negro.svg'),
  planoBlanco: svg('plano-blanco.svg'), cruzBlanco: svg('cruz-blanco.svg'), cruzNegro: svg('cruz-negro.svg'),
};

const W = 1080, H = 2340; // CSS px · deviceScaleFactor 2 → 2160×4680
const grano = (op = 0.07) => `<div style="position:absolute;inset:0;opacity:${op};pointer-events:none;background-size:360px 360px;background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='360'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)"></div>`;
const cruzReg = (x, y, c) => `<div style="position:absolute;left:${x - 14}px;top:${y - 14}px;width:28px;height:28px;background:linear-gradient(${c},${c}) center/100% 2px no-repeat,linear-gradient(${c},${c}) center/2px 100% no-repeat"></div>`;
const micro = (txt, pos, c) => `<div class="micro" style="position:absolute;${pos};color:${c}">${txt}</div>`;
// barra a 60°: vertical rotada 30°
const corte = (x, w, c, op = 1) => `<div style="position:absolute;left:${x}px;top:-25%;width:${w}px;height:150%;background:${c};transform:rotate(30deg);opacity:${op}"></div>`;

const base = (bg, body) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=IBM+Plex+Mono:wght@500&family=Archivo:wght@500&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;background:${bg}}
body{position:relative;-webkit-font-smoothing:antialiased}
.micro{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:22px;line-height:32px;letter-spacing:.16em;text-transform:uppercase}
.claim{font-family:'Unbounded',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;line-height:.92}
</style></head><body>${body}</body></html>`;

const D = '#0b0b0b', B = '#f2f4f5', S = '#a3a19c', O = '#ff5f00', Ln = '#2e2e2e';

const disenos = {
  // 01 — firma principal: logo desvanecido, datos en esquinas, mucho negro
  'soma-wallpaper-01-noche': base(D, `
    ${grano()}
    ${micro('SØ/001 — Concreto', 'left:72px;top:700px', S)}
    ${micro('128 BPM', 'right:72px;top:700px', S)}
    ${cruzReg(72, 760, B)}
    <img src="${L.desvBlanco}" style="position:absolute;left:52px;top:1120px;width:976px">
    ${micro('Not made to fit.', 'left:72px;top:1900px', B)}
    ${micro('N 00°00′ W 00°00′', 'left:72px;bottom:300px', S)}
    ${micro('PZ ∞/∞', 'right:72px;bottom:300px', S)}
    ${cruzReg(W - 72, H - 260, B)}`),

  // 02 — símbolo: cruz Ø centrada (el único elemento que puede ir centrado)
  'soma-wallpaper-02-cruz': base(D, `
    ${grano()}
    <img src="${L.cruzBlanco}" style="position:absolute;left:50%;top:1290px;height:980px;transform:translate(-50%,-50%)">
    ${micro('SØMA', 'left:0;right:0;text-align:center;top:1850px', B)}
    ${micro('Cuerpo · Señal · Cultura', 'left:0;right:0;text-align:center;top:1890px', S)}
    ${micro('SØ/001', 'left:72px;bottom:300px', S)}
    ${micro('128 BPM', 'right:72px;bottom:300px', S)}`),

  // 03 — el corte: una sola diagonal naranja a 60° y el logo plano pequeño
  'soma-wallpaper-03-corte': base(D, `
    ${corte(560, 22, O)}
    ${grano()}
    ${micro('The cut is the signal.', 'left:72px;top:700px', S)}
    <img src="${L.planoBlanco}" style="position:absolute;right:72px;top:1880px;width:420px">
    ${micro('60° — SØ/001', 'right:72px;top:2010px;text-align:right', S)}
    ${micro('N 00°00′ W 00°00′', 'left:72px;top:740px', S)}
    ${cruzReg(W - 72, 760, B)}`),

  // 04 — señal: fondo naranja 1655 (objeto-señal, como hang tags y stickers), cruz en negro
  'soma-wallpaper-04-senal': base(O, `
    ${grano(0.09)}
    <img src="${L.cruzNegro}" style="position:absolute;left:50%;top:1280px;height:900px;transform:translate(-50%,-50%)">
    ${micro('Become the signal.', 'left:72px;top:1880px', D)}
    ${micro('PANTONE 1655 C', 'left:72px;bottom:300px', D)}
    ${micro('SØMA', 'right:72px;bottom:300px', D)}
    ${cruzReg(72, 760, D)}${cruzReg(W - 72, 760, D)}`),

  // 05 — claim: tipografía enorme partida por la diagonal
  'soma-wallpaper-05-claim': base(D, `
    ${grano()}
    <img src="${L.planoBlanco}" style="position:absolute;left:72px;top:700px;width:300px">
    <div style="position:absolute;left:60px;top:1150px;width:1000px;height:760px">
      <div class="claim" style="position:absolute;inset:0;font-size:206px;color:${B};clip-path:polygon(0 0,62% 0,30% 100%,0 100%)">Not<br>made<br>to fit.</div>
      <div class="claim" style="position:absolute;inset:0;font-size:206px;color:${B};transform:translate(18px,14px);clip-path:polygon(62% 0,100% 0,100% 100%,30% 100%)">Not<br>made<br>to fit.</div>
      <div style="position:absolute;left:46%;top:-6%;width:8px;height:112%;background:${O};transform:rotate(30deg)"></div>
    </div>
    ${micro('SØ/001 · Serie corta', 'left:72px;bottom:300px', S)}
    ${micro('128 BPM', 'right:72px;bottom:300px', S)}`),

  // 06 — plano técnico: retícula visible, anillos de anotación y datos
  'soma-wallpaper-06-plano': base(D, `
    <div style="position:absolute;inset:0;background:
      repeating-linear-gradient(90deg,${Ln} 0 2px,transparent 2px 234px) 72px 0/calc(100% - 144px) 100% no-repeat,
      repeating-linear-gradient(0deg,${Ln} 0 2px,transparent 2px 234px) 0 0/100% 100%"></div>
    ${grano()}
    <div style="position:absolute;left:50%;top:1290px;width:640px;height:640px;border:2px solid ${S};border-radius:50%;transform:translate(-50%,-50%)"></div>
    <div style="position:absolute;left:50%;top:1290px;width:900px;height:900px;border:2px dashed ${Ln};border-radius:50%;transform:translate(-50%,-50%)"></div>
    <img src="${L.cruzBlanco}" style="position:absolute;left:50%;top:1290px;height:520px;transform:translate(-50%,-50%)">
    <div style="position:absolute;left:770px;top:1000px;width:240px;height:2px;background:${S};transform-origin:0 0;transform:rotate(-30deg)"></div>
    ${micro('Ø — anillo + barra 60°', 'left:640px;top:830px', B)}
    ${micro('Fig. 01', 'left:72px;top:700px', S)}
    ${micro('Escala 1:1', 'right:72px;top:700px', S)}
    ${micro('SØMA — Documentación técnica', 'left:72px;bottom:300px', S)}
    ${micro('PZ 001/150', 'right:72px;bottom:300px', S)}
    ${cruzReg(72, 660, B)}${cruzReg(W - 72, 660, B)}${cruzReg(72, H - 240, B)}${cruzReg(W - 72, H - 240, B)}`),

  // 07 — galería: versión clara para lookbook, logo desvanecido en negro
  'soma-wallpaper-07-galeria': base('#e4e3df', `
    ${grano(0.08)}
    ${micro('Lookbook — SØ/001', 'left:72px;top:700px', '#4a4844')}
    ${cruzReg(W - 72, 714, D)}
    <img src="${L.desvNegro}" style="position:absolute;left:52px;top:1120px;width:976px">
    ${micro('Ropa para habitar la ciudad de noche.', 'left:72px;top:1900px;text-transform:none;letter-spacing:.04em', D)}
    ${micro('Galería', 'left:72px;bottom:300px', '#4a4844')}
    ${micro('128 BPM', 'right:72px;bottom:300px', '#4a4844')}`),
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
for (const [nombre, html] of Object.entries(disenos)) {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(outDir, nombre + '.png'), type: 'png' });
  console.log('ok', nombre);
}
await browser.close();
