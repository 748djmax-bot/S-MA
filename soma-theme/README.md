# SØMA — tema de Shopify

Tema Online Store 2.0 para **somaart7.myshopify.com**, construido con Shopify CLI a partir del
[Skeleton theme](https://github.com/Shopify/skeleton-theme) y el design system **SØMA** (v4).

## Design system aplicado

| Regla | Dónde vive en el tema |
| --- | --- |
| Negro ≥70% · tema Noche por defecto, Galería opcional | `snippets/css-variables.liquid` (tokens), ajuste «Tema de color» |
| Una sola señal `naranja-1655` (#FF5F00), texto negro encima | `.corte`, `.tag--naranja`, `.boton--acento` |
| El corte a 60° | `.corte` (barra diagonal), revelados en barrido diagonal, foto del Drop cortada |
| Cuatro voces: Unbounded · Grenze Gotisch · Archivo · IBM Plex Mono | clases `display-*`, `gotica-*`, `cuerpo`/`ui`, `etiqueta`/`codigo`/`micro` |
| Esquina recta, hairlines, sin sombras | `--radius-0`, `.grid-producto` con divisores de 1px |
| Información como gráfica | código de colección, coordenadas y BPM (Configuración del tema › Datos de marca) |
| Logo oficial | `snippets/logo-plano.liquid` (nav), `assets/soma-logo-desvanecido-blanco.svg` (hero ≥200px), `snippets/cruz.liquid` (símbolo/favicon) |

## Secciones

- **Home:** Hero de campaña · Colección destacada · Manifiesto · Drop · Imagen + texto · SØMA Signal (eventos) · Acceso anticipado
- **Producto:** galería 8/12 + ficha técnica sticky 4/12, botón único «AÑADIR A LA BOLSA», piezas relacionadas
- Colección, lista de colecciones (Archivo), bolsa, búsqueda, página, contacto (`page.contact`), blog, artículo, 404, contraseña, tarjeta de regalo

## Metacampos de producto (opcionales)

Crear en *Configuración › Metacampos › Productos* con namespace `soma`:

| Metacampo | Tipo | Ejemplo |
| --- | --- | --- |
| `soma.codigo` | Texto de una línea | `SØ/001` |
| `soma.edicion` | Entero | `150` |
| `soma.ficha` | Texto multilínea | `Material: Ripstop 210D`↵`Peso: 380 GSM`↵`Fit: Oversized` |

Etiquetas de producto: `drop` (tag naranja DROP) y `core` (tag CORE).

## Menús

- `main-menu`: navegación del header y menú índice a pantalla completa (01 NEW · 02 OUTERWEAR…)
- `footer`: columna de enlaces del pie

## Comandos

```bash
npm install -g @shopify/cli@latest
cd soma-theme
shopify theme dev   --store somaart7.myshopify.com              # vista previa local con recarga
shopify theme push  --store somaart7.myshopify.com --unpublished # sube como tema nuevo sin publicar
shopify theme check                                             # lint
```
