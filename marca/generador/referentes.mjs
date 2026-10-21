// Referentes gráficos SØMA (4:5, 2160×2700): pósters de sistema.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [, , logosDir, outDir] = process.argv;
const svg = (f) => 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(join(logosDir, f))).toString('base64');
const L = { desv: svg('desv-blanco.svg'), plano: svg('plano-blanco.svg'), cruz: svg('cruz-blanco.svg'), cruzN: svg('cruz-negro.svg') };
const W = 1080, H = 1350;
const D = '#0b0b0b', B = '#f2f4f5', S = '#a3a19c', O = '#ff5f00', Ln = '#2e2e2e';
const grano = (op = 0.07) => `<div style="position:absolute;inset:0;opacity:${op};background-size:360px;background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='360'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)"></div>`;
const m = (t, pos, c) => `<div class="micro" style="position:absolute;${pos};color:${c}">${t}</div>`;
const reg = (x, y, c) => `<div style="position:absolute;left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;background:linear-gradient(${c},${c}) center/100% 2px no-repeat,linear-gradient(${c},${c}) center/2px 100% no-repeat"></div>`;
const base = (bg, body) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=IBM+Plex+Mono:wght@500&family=Archivo:wght@400;500&family=Grenze+Gotisch:wght@700&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;background:${bg}}body{position:relative;-webkit-font-smoothing:antialiased}
.micro{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:20px;line-height:30px;letter-spacing:.16em;text-transform:uppercase}
.d{font-family:'Unbounded',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;line-height:.92}
.g{font-family:'Grenze Gotisch',serif;font-weight:700;line-height:.9}
.t{font-family:'Archivo',sans-serif;font-size:30px;line-height:42px;font-weight:400}</style></head><body>${body}</body></html>`;

const piezas = {
  // Manifiesto: texto como gráfica
  'soma-referente-01-manifiesto': base(D, `${grano()}
    ${m('01 — Manifiesto', 'left:64px;top:64px', S)}${reg(W - 64, 78, B)}
    <div style="position:absolute;left:64px;top:150px;width:240px;height:3px;background:${B}"></div>
    <div class="d" style="position:absolute;left:64px;top:190px;font-size:118px;color:${B}">Culture<br>over<br>trends.</div>
    <div class="t" style="position:absolute;left:64px;top:760px;width:640px;color:${B}">SØMA viste a quienes habitan la ciudad de noche: el club, la galería, el estacionamiento vacío.</div>
    <div class="t" style="position:absolute;left:64px;top:930px;width:640px;color:${S}">Series cortas. Sin reposición. Cada prenda es un objeto; cada objeto, una señal.</div>
    <img src="${L.plano}" style="position:absolute;right:64px;bottom:120px;width:300px">
    ${m('SØ/001 — 128 BPM', 'left:64px;bottom:64px', S)}${m('N 00°00′ W 00°00′', 'right:64px;bottom:64px', S)}`),
  // Concreto: nombre de colección en gótica + corte
  'soma-referente-02-concreto': base('#1c1c1c', `${grano(0.1)}
    <div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 70% 20%,#3a3936 0%,#1c1c1c 55%,#0b0b0b 100%)"></div>${grano(0.12)}
    <div style="position:absolute;left:520px;top:-20%;width:10px;height:140%;background:${O};transform:rotate(30deg)"></div>
    ${m('Colección', 'left:64px;top:64px', S)}${m('SØ/001', 'right:64px;top:64px', S)}
    <div class="g" style="position:absolute;left:56px;bottom:260px;font-size:250px;color:${B}">Concreto</div>
    ${m('Masa · silencio · luz cenital', 'right:64px;bottom:200px', B)}
    ${m('SØ/001 — Serie corta', 'right:64px;bottom:64px', S)}`),
  // Signal: póster de evento técnico
  'soma-referente-03-signal': base(D, `${grano()}
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,${Ln} 0 2px,transparent 2px 238px) 64px 0/calc(100% - 128px) 100% no-repeat"></div>
    ${m('SØMA Signal', 'left:64px;top:64px', S)}
    <div style="position:absolute;right:64px;top:64px;display:flex;gap:10px;align-items:center" class="micro"><span style="width:14px;height:14px;border-radius:50%;background:${O}"></span><span style="color:${B}">En vivo</span></div>
    <div class="d" style="position:absolute;left:64px;top:260px;font-size:200px;color:${B}">Signal<br>04</div>
    <div style="position:absolute;left:64px;top:760px;right:64px;border-top:2px solid ${S}"></div>
    ${[['Fecha', '2026.11.14'], ['Lugar', 'Techno industrial. Concreto.'], ['Hasta', 'El amanecer'], ['Tempo', '132 BPM']].map(([k, v], i) =>
      `<div style="position:absolute;left:64px;right:64px;top:${780 + i * 70}px;display:flex;justify-content:space-between;border-bottom:2px solid ${Ln};padding-bottom:16px" class="micro"><span style="color:${S}">${k}</span><span style="color:${B}">${v}</span></div>`).join('')}
    <img src="${L.cruz}" style="position:absolute;right:64px;bottom:64px;height:130px">
    ${m('Coordenadas por email', 'left:64px;bottom:64px', S)}`),
  // Paleta: proporción 70 · 20 · 7 · 3
  'soma-referente-04-paleta': base(D, `
    <div style="position:absolute;left:0;top:0;width:100%;height:70%;background:${D}"></div>
    <div style="position:absolute;left:0;top:70%;width:100%;height:20%;background:#8c8a85;display:flex">
      <div style="flex:1;background:#1c1c1c"></div><div style="flex:1;background:#8c8a85"></div><div style="flex:1;background:#a7abae"></div><div style="flex:1;background:#c9c7c2"></div></div>
    <div style="position:absolute;left:0;top:90%;width:100%;height:7%;background:${B}"></div>
    <div style="position:absolute;left:0;top:97%;width:100%;height:3%;background:${O}"></div>
    ${grano()}
    ${m('Paleta', 'left:64px;top:64px', S)}${m('70 · 20 · 7 · 3', 'right:64px;top:64px', S)}
    <div class="d" style="position:absolute;left:64px;top:300px;font-size:120px;color:${B}">Negro<br>70%</div>
    ${m('#0B0B0B — dominante', 'left:64px;top:600px', S)}
    ${m('Carbón · Concreto · Metal · Ceniza — 20%', 'left:64px;top:calc(70% - 54px)', S)}
    ${m('Blanco frío', 'left:64px;top:calc(90% + 22px)', D)}
    <img src="${L.plano}" style="position:absolute;right:64px;top:250px;width:260px">
    ${m('Naranja 1655 — la única señal', 'right:64px;top:calc(90% + 22px)', D)}`),
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
for (const [n, html] of Object.entries(piezas)) {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(outDir, n + '.png') });
  console.log('ok', n);
}
await browser.close();
