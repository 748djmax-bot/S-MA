# Caja premium — render 3D desde el boceto

Modelo 3D paramétrico (Blender/Cycles) construido a partir del boceto a mano.
Respeta la estructura del dibujo: cuerpo superior con tapa abisagrada, plano
ondulado con la piedra y bandeja inferior extraíble con dos compartimentos.

| Archivo | Contenido |
| --- | --- |
| `render_caja_principal.png` | Vista principal en tres cuartos: todos los elementos visibles |
| `render_caja_detalle.png` | Detalle de la piedra, el frasco y la manilla LED |
| `render_caja_tapa.png` | Interior de la tapa: bolsillo plateado con el sobre |
| `render_caja.py` | Escena completa (geometría, materiales, luces, cámara) |

## Correspondencia con el boceto

- **Carta mensaje** → sobre de papel algodón en un bolsillo plateado satinado dentro de la tapa.
- **Plano ondulado** → capas superpuestas con relieve, degradado de azul profundo a azul hielo.
- **Piedra (labradorita)** → alojada en un nido rebajado en el extremo izquierdo del plano.
- **Espacio para aceite** → cuna ajustada a un roll-on de 10 ml en vidrio ámbar.
- **Espacio para manilla LED** → ranura alargada con la correa, su módulo de luz y la hebilla.
- **Tirador** → lengüeta de cinta grosgrain azul cobalto en el frente de la bandeja.

## Medidas (cm)

28 × 10 × 9,5 (cuerpo) · bandeja 9,6 de fondo, extraída 8,6 · cartón rígido de 3 mm.

## Volver a renderizar

```bash
pip install bpy
python3 render_caja.py principal 2000 1500 256   # vista, ancho, alto, muestras
```

Colores, medidas y apertura de la tapa/bandeja están al inicio del script.
