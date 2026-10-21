# Material de marca SØMA

- `wallpapers/`: 7 fondos de pantalla 4K para móvil (2160 × 4680, 9:19.5): Noche, Cruz Ø, El corte, Señal, Not made to fit, Plano técnico y Galería.
- `referentes/`: 4 pósters de sistema (2160 × 2700, 4:5): Manifiesto, Concreto, Signal 04 y Paleta.
- `generador/`: scripts de Playwright que los generan a partir de los logos oficiales (`generador/logos/`).
- `PROMPTS-CHATGPT.md`: prompts para fotografías de ambiente que no se pueden hacer por código.

Todo está subido a Shopify › Archivos y publicado en la página `/pages/wallpapers` del tema SØMA.

Para regenerar:
```bash
node marca/generador/wallpapers.mjs marca/generador/logos /ruta/salida
node marca/generador/referentes.mjs marca/generador/logos /ruta/salida
```
Los scripts importan Playwright desde `/opt/node-tools/node_modules/playwright`; si lo tienes instalado en otro sitio, cambia esa línea.
