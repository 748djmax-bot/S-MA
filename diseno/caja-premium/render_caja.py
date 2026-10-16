"""Render fotorrealista de la caja premium a partir del boceto a mano.

Uso:
    pip install bpy            # Blender como módulo de Python
    python3 render_caja.py [vista] [ancho] [alto] [muestras]

Vistas: "principal" (tres cuartos, todo visible), "frontal", "detalle".
Las unidades son metros; todas las medidas están en la sección DIMENSIONES.
"""

import math
import os
import sys

import bpy  # noqa: E402  (bpy debe cargarse antes que bmesh)
import bmesh
import numpy as np
from mathutils import Vector

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
VISTA = sys.argv[1] if len(sys.argv) > 1 else "principal"
RES_X = int(sys.argv[2]) if len(sys.argv) > 2 else 2400
RES_Y = int(sys.argv[3]) if len(sys.argv) > 3 else 1800
SAMPLES = int(sys.argv[4]) if len(sys.argv) > 4 else 384

# ---------------------------------------------------------------- DIMENSIONES
L = 0.280      # largo de la caja (eje X)
D = 0.100      # fondo del cuerpo superior (eje Y, frente en -Y)
H = 0.095      # altura del cuerpo con la tapa cerrada
T = 0.003      # espesor del cartón rígido forrado
HD = 0.046     # altura del hueco de la bandeja inferior
REC = 0.013    # profundidad del rebaje donde vive el plano ondulado
LID_H = 0.014  # altura de la tapa
LID_ANG = -101.0  # apertura de la tapa (grados)
DRAWER_D = 0.096
PULL = 0.086   # cuánto sale la bandeja

# ----------------------------------------------------------------- utilidades


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def box(name, x0, x1, y0, y1, z0, z1, mat=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 if v.co.x < 0 else x1
        v.co.y = y0 if v.co.y < 0 else y1
        v.co.z = z0 if v.co.z < 0 else z1
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    if mat:
        ob.data.materials.append(mat)
    return ob


def stadium_prism(name, cx, cy, length, width, z0, z1, mat=None, seg=24):
    """Prisma con planta de 'estadio' (rectángulo con extremos semicirculares)."""
    r = width / 2
    half = length / 2 - r
    pts = []
    for i in range(seg + 1):
        a = -math.pi / 2 + math.pi * i / seg
        pts.append((cx + half + r * math.cos(a), cy + r * math.sin(a)))
    for i in range(seg + 1):
        a = math.pi / 2 + math.pi * i / seg
        pts.append((cx - half + r * math.cos(a), cy + r * math.sin(a)))
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z1)) for x, y in pts]
    bm.faces.new(list(reversed(bot)))
    bm.faces.new(top)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    if mat:
        ob.data.materials.append(mat)
    return ob


def cut(target, cutter):
    m = target.modifiers.new("cut_" + cutter.name, "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.solver = "EXACT"
    m.material_mode = "TRANSFER"
    m.object = cutter
    cutter.hide_render = True
    cutter.hide_viewport = True
    cutter.display_type = "WIRE"


def bevel(ob, w=0.0011, seg=3, angle=35):
    m = ob.modifiers.new("bevel", "BEVEL")
    m.width = w
    m.segments = seg
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle)
    m.harden_normals = False
    return m


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


# ------------------------------------------------------------------ materiales


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes["Principled BSDF"]


def mat_paper(name, color, rough=0.62, sheen=0.35, bump=0.06, scale=1800.0):
    m, n, l, p = new_mat(name)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Sheen Weight"].default_value = sheen
    p.inputs["Sheen Roughness"].default_value = 0.55
    p.inputs["Specular IOR Level"].default_value = 0.35
    tc = n.new("ShaderNodeTexCoord")
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 8
    noise.inputs["Roughness"].default_value = 0.7
    l.new(tc.outputs["Object"], noise.inputs["Vector"])
    # leve variación tonal de fibra
    coarse = n.new("ShaderNodeTexNoise")
    coarse.inputs["Scale"].default_value = 60.0
    l.new(tc.outputs["Object"], coarse.inputs["Vector"])
    mix = n.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = color
    darker = [c * 0.94 for c in color[:3]] + [1]
    mix.inputs["B"].default_value = darker
    ramp = n.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = 0.35
    ramp.inputs["From Max"].default_value = 0.75
    l.new(coarse.outputs["Fac"], ramp.inputs["Value"])
    l.new(ramp.outputs["Result"], mix.inputs["Factor"])
    l.new(mix.outputs["Result"], p.inputs["Base Color"])
    b = n.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = bump
    b.inputs["Distance"].default_value = 0.0004
    l.new(noise.outputs["Fac"], b.inputs["Height"])
    l.new(b.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_silver():
    m, n, l, p = new_mat("plateado_satinado")
    p.inputs["Base Color"].default_value = srgb("#CDD0D3")
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Anisotropic"].default_value = 0.35
    tc = n.new("ShaderNodeTexCoord")
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 400
    noise.inputs["Detail"].default_value = 6
    l.new(tc.outputs["Object"], noise.inputs["Vector"])
    mr = n.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.26
    mr.inputs["To Max"].default_value = 0.36
    l.new(noise.outputs["Fac"], mr.inputs["Value"])
    l.new(mr.outputs["Result"], p.inputs["Roughness"])
    return m


def mat_waves():
    m, n, l, p = new_mat("ondas_degradado_azul")
    attr = n.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    l.new(attr.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.48
    p.inputs["Sheen Weight"].default_value = 0.25
    p.inputs["Sheen Roughness"].default_value = 0.4
    p.inputs["Coat Weight"].default_value = 0.12
    p.inputs["Coat Roughness"].default_value = 0.35
    tc = n.new("ShaderNodeTexCoord")
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1500
    l.new(tc.outputs["Object"], noise.inputs["Vector"])
    b = n.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = 0.04
    b.inputs["Distance"].default_value = 0.0003
    l.new(noise.outputs["Fac"], b.inputs["Height"])
    l.new(b.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_labradorite():
    m, n, l, p = new_mat("labradorita")
    tc = n.new("ShaderNodeTexCoord")
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 70
    noise.inputs["Detail"].default_value = 10
    noise.inputs["Distortion"].default_value = 1.2
    l.new(tc.outputs["Object"], noise.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.45
    ramp.color_ramp.elements[0].color = srgb("#1A1F22")
    ramp.color_ramp.elements[1].position = 0.70
    ramp.color_ramp.elements[1].color = srgb("#24566F")
    e = ramp.color_ramp.elements.new(0.82)
    e.color = srgb("#3E8FA6")
    l.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.38
    p.inputs["Coat Weight"].default_value = 0.35
    p.inputs["Coat Roughness"].default_value = 0.06
    p.inputs["Thin Film Thickness"].default_value = 380
    p.inputs["Thin Film IOR"].default_value = 1.7
    return m


def mat_amber_glass():
    m, n, l, p = new_mat("vidrio_ambar")
    p.inputs["Base Color"].default_value = srgb("#B8661E")
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.06
    p.inputs["IOR"].default_value = 1.5
    return m


def mat_ribbon():
    m, n, l, p = new_mat("cinta_cobalto")
    p.inputs["Base Color"].default_value = srgb("#1438A6")
    p.inputs["Roughness"].default_value = 0.55
    p.inputs["Sheen Weight"].default_value = 0.25
    p.inputs["Sheen Tint"].default_value = srgb("#6F8FE8")
    tc = n.new("ShaderNodeTexCoord")
    wave = n.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 900
    wave.inputs["Distortion"].default_value = 0.6
    wave.wave_profile = "SIN"
    wave.bands_direction = "Y"
    l.new(tc.outputs["Object"], wave.inputs["Vector"])
    b = n.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = 0.25
    b.inputs["Distance"].default_value = 0.0002
    l.new(wave.outputs["Fac"], b.inputs["Height"])
    l.new(b.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_silicone():
    m, n, l, p = new_mat("silicona_led")
    p.inputs["Base Color"].default_value = srgb("#E9EEF2")
    p.inputs["Subsurface Weight"].default_value = 0.7
    p.inputs["Subsurface Radius"].default_value = (0.004, 0.005, 0.006)
    p.inputs["Subsurface Scale"].default_value = 0.4
    p.inputs["Roughness"].default_value = 0.38
    p.inputs["Emission Color"].default_value = srgb("#5CC6FF")
    p.inputs["Emission Strength"].default_value = 0.25
    return m


def mat_simple(name, hexcol, rough=0.5, metal=0.0, **kw):
    m, n, l, p = new_mat(name)
    p.inputs["Base Color"].default_value = srgb(hexcol)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    for k, v in kw.items():
        p.inputs[k].default_value = v
    return m


# ----------------------------------------------------------------- geometría


def wave_field(u, v):
    """Campo orgánico que dibuja las bandas sinuosas del boceto."""
    f = (
        0.55 * np.sin(2 * np.pi * (1.35 * u + 0.35 * np.sin(2 * np.pi * (0.9 * v + 0.6 * u)) + 0.15))
        + 0.35 * np.sin(2 * np.pi * (0.55 * u - 0.8 * v + 0.2 * np.sin(2 * np.pi * 1.7 * u)))
        + 0.25 * np.cos(2 * np.pi * (2.3 * u + 0.6 * v * v))
        - 0.45 * np.exp(-(((u - 0.12) / 0.10) ** 2 + ((v - 0.0) / 0.35) ** 2))
        + 0.30 * np.exp(-(((u + 0.30) / 0.12) ** 2 + ((v - 0.25) / 0.3) ** 2))
    )
    return (f - f.min()) / (f.max() - f.min())


def build_wave_plane(mat, stone_xy, stone_r):
    x0, x1 = -L / 2 + T - 0.001, L / 2 - T + 0.001
    y0, y1 = -D / 2 + T - 0.001, D / 2 - T + 0.001
    step = 0.0005
    xs = np.arange(x0, x1 + 1e-9, step)
    ys = np.arange(y0, y1 + 1e-9, step)
    X, Y = np.meshgrid(xs, ys)
    u = X / L
    v = Y / D
    f = wave_field(u, v)

    K = 6  # capas superpuestas
    g = f * K
    k = np.clip(np.floor(g), 0, K - 1)
    fr = g - k
    s = np.clip((fr - 0.86) / 0.14, 0, 1)
    s = s * s * (3 - 2 * s)
    level = (k + s) / K           # 0..1 escalonado suave
    hmax = 0.0088
    Z = level * hmax

    # nido de la piedra: depresión circular suave
    sx, sy = stone_xy
    r = np.sqrt((X - sx) ** 2 + ((Y - sy) * 1.15) ** 2)
    t = np.clip((r - stone_r) / 0.004, 0, 1)
    t = t * t * (3 - 2 * t)
    cup_floor = -0.0012 + 0.0016 * (r / stone_r) ** 2
    Z = np.where(r < stone_r, cup_floor, Z * t + 0.0009 * (1 - t) * 0)
    level = np.where(r < stone_r + 0.004, level * t, level)

    base = H - REC
    Z = Z + base + 0.0018

    palette = [srgb(c) for c in ("#071A33", "#0E3461", "#1B4E8A", "#3A6F9F", "#78A3C6", "#B6D2E6", "#E2EFF6")]
    pal = np.array([c[:3] for c in palette])
    pos = level * (len(pal) - 1)
    i0 = np.clip(np.floor(pos).astype(int), 0, len(pal) - 2)
    w = (pos - i0)[..., None]
    col = pal[i0] * (1 - w) + pal[i0 + 1] * w

    ny, nx = X.shape
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1)
    idx = np.arange(nx * ny).reshape(ny, nx)
    a = idx[:-1, :-1].ravel()
    b = idx[:-1, 1:].ravel()
    c = idx[1:, 1:].ravel()
    d = idx[1:, :-1].ravel()
    nf = a.size

    me = bpy.data.meshes.new("plano_ondulado")
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.astype(np.float32).ravel())
    me.loops.add(nf * 4)
    me.loops.foreach_set("vertex_index", np.stack([a, b, c, d], axis=1).astype(np.int32).ravel())
    me.polygons.add(nf)
    me.polygons.foreach_set("loop_start", (np.arange(nf) * 4).astype(np.int32))
    me.update(calc_edges=True)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    rgba = np.concatenate([col.reshape(-1, 3), np.ones((nx * ny, 1))], axis=1)
    ca.data.foreach_set("color", rgba.astype(np.float32).ravel())
    me.polygons.foreach_set("use_smooth", np.ones(nf, dtype=bool))
    ob = link(bpy.data.objects.new("plano_ondulado", me))
    ob.data.materials.append(mat)
    # base sólida debajo para que no se vea vacío en ningún ángulo
    box("base_ondas", x0, x1, y0, y1, H - REC - 0.004, base + 0.0006, mat)
    return ob, base


def build_ribbon(mat, x, y_face, z_top, width=0.013):
    """Lengüeta/tirador de cinta grosgrain en bucle que sale del frente."""
    ctrl = [
        (y_face + 0.004, z_top - 0.010),
        (y_face - 0.006, z_top - 0.0095),
        (y_face - 0.017, z_top - 0.012),
        (y_face - 0.022, z_top - 0.019),
        (y_face - 0.019, z_top - 0.026),
        (y_face - 0.009, z_top - 0.026),
        (y_face - 0.002, z_top - 0.0215),
        (y_face + 0.004, z_top - 0.0205),
    ]
    pts = []
    for i in range(len(ctrl) - 1):
        p0 = Vector((0,) + ctrl[max(i - 1, 0)])
        p1 = Vector((0,) + ctrl[i])
        p2 = Vector((0,) + ctrl[i + 1])
        p3 = Vector((0,) + ctrl[min(i + 2, len(ctrl) - 1)])
        for s in range(10):
            t = s / 10
            t2, t3 = t * t, t * t * t
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            pts.append(q)
    pts.append(Vector((0,) + ctrl[-1]))
    me = bpy.data.meshes.new("tirador")
    bm = bmesh.new()
    rows = []
    for q in pts:
        rows.append((bm.verts.new((x - width / 2, q.y, q.z)), bm.verts.new((x + width / 2, q.y, q.z))))
    for i in range(len(rows) - 1):
        a, b = rows[i]
        c, d = rows[i + 1]
        bm.faces.new((a, b, d, c))
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new("tirador", me))
    ob.data.materials.append(mat)
    so = ob.modifiers.new("grosor", "SOLIDIFY")
    so.thickness = 0.0007
    smooth(ob)
    return ob


def build_led_strap(mat, cx, cy, z0, length=0.128, width=0.0158, th=0.0032):
    """Manilla LED: correa de silicona extendida, con módulo de luz, hebilla y orificios."""
    band = stadium_prism("manilla_led", cx, cy, length, width, z0, z0 + th, mat, seg=20)
    bevel(band, w=0.0012, seg=4, angle=50)
    smooth(band)
    zt = z0 + th
    graphite = mat_simple("grafito_satinado", "#25282C", rough=0.3, metal=0.4)
    face = mat_simple("cristal_led", "#0B0D10", rough=0.05, **{"Coat Weight": 1.0})
    led = mat_simple("led", "#FFFFFF", rough=0.2, **{"Emission Color": srgb("#6FD0FF"), "Emission Strength": 22.0})
    metal = mat_simple("acero_hebilla", "#CFCFCC", rough=0.25, metal=1.0)
    mx = cx + 0.006
    mod = box("modulo_led", mx - 0.017, mx + 0.017, cy - 0.0098, cy + 0.0098, zt - 0.001, zt + 0.0052, graphite)
    bevel(mod, w=0.0022, seg=5, angle=60)
    scr = box("pantalla_led", mx - 0.0135, mx + 0.0135, cy - 0.0065, cy + 0.0065, zt + 0.0040, zt + 0.0056, face)
    bevel(scr, w=0.0012, seg=4, angle=60)
    for i in range(9):
        for j in range(3):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.00055,
                                                 location=(mx - 0.0096 + i * 0.0024, cy - 0.0028 + j * 0.0028,
                                                           zt + 0.0055))
            d = bpy.context.active_object
            d.scale.z = 0.35
            d.data.materials.append(led)
    # orificios de ajuste
    hole = mat_simple("orificio", "#3A3D40", rough=0.6)
    for i in range(5):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.0011, depth=0.0004,
                                            location=(cx - length / 2 + 0.010 + i * 0.0065, cy, zt + 0.00005))
        bpy.context.active_object.data.materials.append(hole)
    # hebilla
    bx = cx + length / 2 - 0.012
    for (x0_, x1_, y0_, y1_) in ((bx - 0.004, bx + 0.004, cy - 0.0095, cy - 0.0075),
                                 (bx - 0.004, bx + 0.004, cy + 0.0075, cy + 0.0095),
                                 (bx - 0.004, bx - 0.0024, cy - 0.0095, cy + 0.0095),
                                 (bx + 0.0024, bx + 0.004, cy - 0.0095, cy + 0.0095)):
        b = box("hebilla", x0_, x1_, y0_, y1_, zt - 0.0005, zt + 0.0016, metal)
        bevel(b, w=0.0005, seg=3, angle=60)
    return band


def build_bottle(glass, cap_mat, cx, cy, cz, r=0.0095, body=0.052, cap=0.027):
    """Frasco roll-on de aceite esencial (10 ml) recostado sobre el eje X."""
    x_start = cx - (body + cap) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=r, depth=body,
                                        location=(x_start + body / 2, cy, cz), rotation=(0, math.pi / 2, 0))
    b = bpy.context.active_object
    b.name = "frasco_vidrio"
    b.data.materials.append(glass)
    bevel(b, w=0.0035, seg=6, angle=60)
    smooth(b)
    # cuello y bola
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r * 0.62, depth=0.006,
                                        location=(x_start + body + 0.002, cy, cz), rotation=(0, math.pi / 2, 0))
    neck = bpy.context.active_object
    neck.data.materials.append(glass)
    smooth(neck)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=r * 0.97, depth=cap,
                                        location=(x_start + body + 0.004 + cap / 2, cy, cz), rotation=(0, math.pi / 2, 0))
    c = bpy.context.active_object
    c.name = "tapa_frasco"
    c.data.materials.append(cap_mat)
    bevel(c, w=0.0018, seg=5, angle=60)
    smooth(c)


def build_envelope(paper, silver, x0, x1, y0, y1, z0, lid):
    """Sobre (carta mensaje) dentro del bolsillo plateado de la tapa (coords locales de la tapa)."""
    env = box("sobre", x0, x1, y0, y1, z0, z0 + 0.0016, paper)
    bevel(env, w=0.0005, seg=2)
    env.parent = lid
    # solapa triangular levemente elevada
    me = bpy.data.meshes.new("solapa")
    bm = bmesh.new()
    zf = z0 - 0.00005
    cx = (x0 + x1) / 2
    a = bm.verts.new((x0 + 0.0008, y0 + 0.0008, zf))
    b = bm.verts.new((x1 - 0.0008, y0 + 0.0008, zf))
    c = bm.verts.new((cx, y0 + (y1 - y0) * 0.58, zf))
    bm.faces.new((a, c, b))
    bm.to_mesh(me)
    bm.free()
    fl = link(bpy.data.objects.new("solapa", me))
    fl.data.materials.append(mat_paper("papel_solapa", srgb("#E3D8C3"), rough=0.75, sheen=0.4, bump=0.08, scale=2200))
    so = fl.modifiers.new("g", "SOLIDIFY")
    so.thickness = 0.0011
    so.offset = -1.0
    bevel(fl, w=0.0003, seg=2)
    fl.parent = lid
    return env


# -------------------------------------------------------------------- escena


def build_scene():
    reset()
    sc = bpy.context.scene

    crudo = mat_paper("carton_crudo", srgb("#DCC9A8"))
    crudo_int = mat_paper("carton_crudo_interior", srgb("#D3BF9E"), rough=0.7)
    suede = mat_paper("forro_arena", srgb("#9A815F"), rough=0.9, sheen=0.45, bump=0.12, scale=2600)
    silver = mat_silver()
    waves = mat_waves()
    stone_m = mat_labradorite()
    glass = mat_amber_glass()
    cap_m = mat_simple("aluminio_cepillado", "#C9C9C6", rough=0.32, metal=1.0, **{"Anisotropic": 0.6})
    ribbon_m = mat_ribbon()
    silicone = mat_silicone()
    env_paper = mat_paper("papel_algodon", srgb("#F1EADC"), rough=0.75, sheen=0.4, bump=0.08, scale=2200)

    # ---- cuerpo exterior (manga) ----
    body = box("cuerpo", -L / 2, L / 2, -D / 2, D / 2, 0, H, crudo)
    body.data.materials.append(crudo_int)
    cav = box("hueco_bandeja", -L / 2 + T, L / 2 - T, -D / 2 - 0.01, D / 2 - T, T, HD, crudo_int)
    top = box("rebaje_superior", -L / 2 + T, L / 2 - T, -D / 2 + T, D / 2 - T, H - REC, H + 0.01, crudo_int)
    cut(body, cav)
    cut(body, top)
    bevel(body)

    # ---- plano ondulado + piedra ----
    stone_xy = (-0.062, -0.004)
    build_wave_plane(waves, stone_xy, 0.0165)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=1.0)
    st = bpy.context.active_object
    st.name = "piedra_labradorita"
    st.scale = (0.0175, 0.0128, 0.0068)
    st.rotation_euler = (math.radians(4), math.radians(-6), math.radians(28))
    st.location = (stone_xy[0], stone_xy[1], H - REC + 0.0018 - 0.0004 + 0.0068 * 0.8)
    disp_tex = bpy.data.textures.new("piedra_n", "CLOUDS")
    disp_tex.noise_scale = 0.9
    dm = st.modifiers.new("irregular", "DISPLACE")
    dm.texture = disp_tex
    dm.strength = 0.22
    dm.mid_level = 0.5
    smooth(st)
    st.data.materials.append(stone_m)

    # ---- tapa abisagrada con bolsillo plateado ----
    lid = box("tapa", -L / 2, L / 2, -D, 0, 0, LID_H, crudo)
    lid.data.materials.append(silver)
    lid_cav = box("hueco_tapa", -L / 2 + T, L / 2 - T, -D + T, -T, -0.01, LID_H - T, silver)
    lid_cav.parent = lid
    cut(lid, lid_cav)
    bevel(lid)
    # panel plateado con ventana (bolsillo del sobre)
    panel = box("panel_plateado", -L / 2 + T + 0.0002, L / 2 - T - 0.0002, -D + T + 0.0002, -T - 0.0002,
                LID_H - T - 0.0045, LID_H - T, silver)
    win_x, win_y = 0.106, 0.037
    pb = LID_H - T - 0.0045  # cara visible del panel (mira hacia abajo con la tapa cerrada)
    win = box("ventana_sobre", -win_x, win_x, -D / 2 - win_y, -D / 2 + win_y, pb - 0.01, pb + 0.0035, silver)
    win.parent = lid
    cut(panel, win)
    bevel(panel, w=0.0006, seg=2)
    panel.parent = lid
    build_envelope(env_paper, silver, -win_x + 0.0025, win_x - 0.0025, -D / 2 - win_y + 0.0025,
                   -D / 2 + win_y - 0.0025, pb + 0.0035 - 0.0016, lid)
    # colocar la tapa: bisagra en la arista trasera superior
    # girar sobre la bisagra
    pivot = bpy.data.objects.new("bisagra", None)
    link(pivot)
    pivot.location = (0, D / 2, H)
    lid.parent = pivot  # la tapa ya está modelada con la bisagra en su origen
    pivot.rotation_euler = (math.radians(LID_ANG), 0, 0)
    # cinta-bisagra de tela en el lomo
    hinge = box("lomo", -L / 2 + 0.002, L / 2 - 0.002, D / 2 - 0.0002, D / 2 + 0.0006, H - 0.012, H + 0.001, crudo)

    # ---- bandeja extraíble ----
    dx0, dx1 = -L / 2 + T + 0.0006, L / 2 - T - 0.0006
    dy0 = -D / 2 - PULL
    dy1 = dy0 + DRAWER_D
    dz1 = HD - 0.0008
    drawer = box("bandeja", dx0, dx1, dy0, dy1, T + 0.0004, dz1, crudo)
    drawer.data.materials.append(suede)
    inset = box("rebaje_bandeja", dx0 + T, dx1 - T, dy0 + T, dy1 - T, dz1 - 0.0022, dz1 + 0.01, crudo_int)
    cut(drawer, inset)
    surf = dz1 - 0.0022
    oil_c = (-0.074, dy0 + 0.033)
    brc_c = (0.056, dy0 + 0.047)
    oil = stadium_prism("hueco_aceite", oil_c[0], oil_c[1], 0.086, 0.0235, surf - 0.0125, surf + 0.01, suede)
    brc = stadium_prism("hueco_manilla", brc_c[0], brc_c[1], 0.134, 0.0225, surf - 0.0075, surf + 0.01, suede)
    cut(drawer, oil)
    cut(drawer, brc)
    bevel(drawer, w=0.0009)

    build_bottle(glass, cap_m, oil_c[0], oil_c[1], surf - 0.0125 + 0.0095 + 0.0002)
    build_led_strap(silicone, brc_c[0], brc_c[1], surf - 0.0075 + 0.0002)
    build_ribbon(ribbon_m, 0.058, dy0, dz1)

    # ---- estudio ----
    bd = mat_simple("ciclorama", "#E1DFDB", rough=0.85)
    bpy.ops.mesh.primitive_plane_add(size=1)
    fl = bpy.context.active_object
    fl.name = "ciclorama"
    bm = bmesh.new()
    rows = []
    for i in range(41):
        t = i / 40
        if t < 0.6:
            y, z = -2.0 + t / 0.6 * 2.6, 0.0
        else:
            a = (t - 0.6) / 0.4 * (math.pi / 2)
            y, z = 0.6 + 0.6 * math.sin(a), 0.6 - 0.6 * math.cos(a)
        rows.append((bm.verts.new((-3, y, z)), bm.verts.new((3, y, z))))
    for i in range(40):
        a, b = rows[i]
        c, d = rows[i + 1]
        bm.faces.new((a, b, d, c))
    top_y = 1.2
    bm.to_mesh(fl.data)
    bm.free()
    fl.data.materials.clear()
    fl.data.materials.append(bd)
    smooth(fl)

    def area(name, loc, size, power, color="#FFF6EC", target=(0, -0.02, 0.05)):
        ld = bpy.data.lights.new(name, "AREA")
        ld.shape = "RECTANGLE"
        ld.size, ld.size_y = size
        ld.energy = power
        ld.color = srgb(color)[:3]
        ob = link(bpy.data.objects.new(name, ld))
        ob.location = loc
        d = Vector(target) - Vector(loc)
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return ob

    area("softbox_principal", (-0.75, -0.55, 0.95), (0.7, 0.55), 60)
    area("relleno", (0.85, -0.65, 0.45), (0.8, 0.6), 9, "#F2F5FF")
    area("contraluz", (0.25, 0.9, 0.85), (0.9, 0.4), 30)
    area("cenital", (0.0, -0.1, 1.3), (0.6, 0.6), 12)

    world = bpy.data.worlds.new("mundo")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = srgb("#D9D4CC")
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.12

    # ---- cámara ----
    cam_d = bpy.data.cameras.new("cam")
    cam = link(bpy.data.objects.new("cam", cam_d))
    sc.camera = cam
    views = {
        # (posición, objetivo, focal)
        "principal": ((-0.50, -0.92, 0.74), (0.006, -0.022, 0.058), 72),
        "frontal": ((0.36, -0.95, 0.52), (0.0, -0.03, 0.05), 80),
        "detalle": ((-0.20, -0.45, 0.36), (-0.03, -0.06, 0.05), 85),
        "tapa": ((-0.10, -0.55, 0.30), (0.0, 0.05, 0.14), 60),
    }
    loc, tgt, focal = views[VISTA]
    cam.location = loc
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam_d.lens = focal
    cam_d.sensor_width = 36
    cam_d.dof.use_dof = True
    cam_d.dof.focus_distance = (Vector(tgt) - Vector(loc)).length
    cam_d.dof.aperture_fstop = 9.0 if VISTA != "detalle" else 5.6

    # ---- render ----
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 12
    sc.cycles.transmission_bounces = 12
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.render.resolution_x = RES_X
    sc.render.resolution_y = RES_Y
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    sc.view_settings.exposure = -0.25
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = os.path.join(OUT_DIR, f"render_caja_{VISTA}.png")


if __name__ == "__main__":
    build_scene()
    bpy.ops.render.render(write_still=True)
    print("OK ->", bpy.context.scene.render.filepath)
