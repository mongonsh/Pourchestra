from __future__ import annotations

import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "client" / "assets" / "moon-koto"
OUT.mkdir(parents=True, exist_ok=True)


COLORS = [
    (1.0, 0.22, 0.38, 1.0),
    (1.0, 0.61, 0.10, 1.0),
    (0.05, 0.76, 0.68, 1.0),
    (0.39, 0.36, 1.0, 1.0),
]


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.35,
    emission: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    if node is not None:
        node.inputs["Base Color"].default_value = color
        metallic_input = node.inputs.get("Metallic IOR Level")
        if metallic_input is None:
            metallic_input = node.inputs.get("Metallic")
        if metallic_input is not None:
            metallic_input.default_value = metallic
        node.inputs["Roughness"].default_value = roughness
        if emission > 0:
            emission_input = node.inputs.get("Emission Color")
            if emission_input is None:
                emission_input = node.inputs.get("Emission")
            strength_input = node.inputs.get("Emission Strength")
            if emission_input is not None:
                emission_input.default_value = color
            if strength_input is not None:
                strength_input.default_value = emission
    return mat


def add_uv_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    segments: int = 48,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=max(16, segments // 2),
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_beveled_cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bevel: float = 0.12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new(name="Soft carved edges", type="BEVEL")
    modifier.width = bevel
    modifier.segments = 4
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth_by_angle()
    return obj


def add_torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=64,
        minor_segments=16,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def create_lathe(
    name: str,
    profile: list[tuple[float, float]],
    mat: bpy.types.Material,
    segments: int = 72,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for segment in range(segments):
        angle = (segment / segments) * math.tau
        cosine = math.cos(angle)
        sine = math.sin(angle)
        for radius, z in profile:
            vertices.append((radius * cosine, radius * sine, z))
    profile_length = len(profile)
    for segment in range(segments):
        next_segment = (segment + 1) % segments
        for index in range(profile_length - 1):
            a = segment * profile_length + index
            b = next_segment * profile_length + index
            faces.append((a, b, b + 1, a + 1))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def point_camera(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_camera(
    resolution: tuple[int, int],
    *,
    location: tuple[float, float, float] = (0.0, -8.0, 5.0),
    target: tuple[float, float, float] = (0.0, 0.0, 0.6),
    ortho: float = 4.8,
    transparent: bool = True,
) -> bpy.types.Object:
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho
    point_camera(camera, target)
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = resolution[0]
    scene.render.resolution_y = resolution[1]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = transparent
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.use_file_extension = True
    scene.render.filter_size = 1.25
    return camera


def setup_lights() -> None:
    world = bpy.context.scene.world
    world.color = (0.018, 0.025, 0.075)
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background is not None:
        background.inputs["Color"].default_value = (0.018, 0.025, 0.075, 1.0)
        background.inputs["Strength"].default_value = 0.18

    bpy.ops.object.light_add(type="AREA", location=(-3.5, -4.5, 7.0))
    key = bpy.context.object
    key.data.energy = 950
    key.data.color = (1.0, 0.78, 0.48)
    key.data.shape = "DISK"
    key.data.size = 5.0
    point_camera(key, (0.0, 0.0, 0.4))

    bpy.ops.object.light_add(type="AREA", location=(4.0, -1.0, 5.0))
    fill = bpy.context.object
    fill.data.energy = 700
    fill.data.color = (0.25, 0.5, 1.0)
    fill.data.size = 4.0
    point_camera(fill, (0.0, 0.0, 0.8))

    bpy.ops.object.light_add(type="POINT", location=(0.0, -1.5, 3.5))
    rim = bpy.context.object
    rim.data.energy = 240
    rim.data.color = (0.55, 0.95, 1.0)
    rim.data.shadow_soft_size = 1.2


def render(path: Path) -> None:
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print(f"RENDERED {path}")


def create_bowl(color: tuple[float, float, float, float], index: int) -> None:
    clear_scene()
    setup_camera((384, 384), ortho=4.4)
    setup_lights()
    lacquer = material(f"Bowl lacquer {index}", color, metallic=0.18, roughness=0.2)
    dark = material("Dark lacquer", (0.025, 0.032, 0.09, 1.0), metallic=0.25, roughness=0.22)
    gold = material("Moon gold", (0.94, 0.63, 0.16, 1.0), metallic=0.85, roughness=0.16)
    glow = material(f"Sand glow {index}", color, roughness=0.22, emission=1.6)
    ivory = material("Ivory inlay", (1.0, 0.91, 0.7, 1.0), metallic=0.08, roughness=0.22)

    profile = [
        (0.4, 0.0),
        (0.68, 0.08),
        (0.92, 0.42),
        (1.08, 0.9),
        (0.98, 1.05),
        (0.79, 0.94),
        (0.68, 0.52),
        (0.35, 0.16),
    ]
    bowl = create_lathe("Moon bowl", profile, lacquer)
    bowl.location.z = -0.2
    add_torus("Gold rim", (0.0, 0.0, 0.84), 1.01, 0.055, gold)
    add_cylinder("Foot", (0.0, 0.0, -0.24), 0.45, 0.2, dark)
    add_torus("Foot trim", (0.0, 0.0, -0.34), 0.42, 0.055, gold)
    add_uv_sphere("Spirit sand", (0.0, 0.0, 0.77), (0.76, 0.76, 0.09), glow)

    for petal in range(5):
        angle = petal * math.tau / 5 + 0.32
        x = math.cos(angle) * 0.28
        z = 0.36 + math.sin(angle) * 0.23
        pearl = add_uv_sphere("Ivory blossom", (x, -0.97, z), (0.13, 0.055, 0.2), ivory, segments=24)
        pearl.rotation_euler.y = angle

    render(OUT / f"moon-bowl-{index}.png")


def create_bridge() -> None:
    clear_scene()
    setup_camera((768, 256), location=(0.0, -9.0, 4.1), target=(0.0, 0.0, 0.0), ortho=5.2)
    setup_lights()
    wood = material("Carved bamboo", (0.38, 0.12, 0.055, 1.0), metallic=0.04, roughness=0.26)
    gold = material("Gold fittings", (0.96, 0.64, 0.17, 1.0), metallic=0.9, roughness=0.14)
    cream = material("String ivory", (1.0, 0.9, 0.67, 1.0), roughness=0.22)
    teal = material("Inlay glow", (0.12, 0.92, 0.78, 1.0), roughness=0.14, emission=1.8)

    add_beveled_cube("Lacquer bridge", (0.0, 0.0, 0.0), (2.25, 0.26, 0.18), wood, 0.15)
    add_beveled_cube("Gold upper edge", (0.0, -0.27, 0.16), (2.0, 0.035, 0.04), gold, 0.035)
    for x in (-2.08, 2.08):
        add_cylinder("End cap", (x, 0.0, 0.0), 0.33, 0.28, gold, (0.0, math.pi / 2, 0.0))
        add_uv_sphere("End pearl", (x, -0.31, 0.0), (0.15, 0.08, 0.15), cream, segments=32)
    for x in (-1.55, 1.55):
        add_torus("Binding", (x, 0.0, 0.0), 0.285, 0.035, cream, (0.0, math.pi / 2, 0.0))
    add_uv_sphere("Spirit inlay", (0.0, -0.34, 0.0), (0.19, 0.07, 0.19), teal, segments=32)
    render(OUT / "bamboo-bridge.png")


def create_fan() -> None:
    clear_scene()
    setup_camera((384, 384), location=(0.0, -8.0, 4.4), target=(0.0, 0.0, 0.7), ortho=4.7)
    setup_lights()
    teal = material("Fan silk", (0.03, 0.72, 0.66, 1.0), metallic=0.05, roughness=0.25)
    navy = material("Fan shadow", (0.03, 0.05, 0.15, 1.0), metallic=0.22, roughness=0.2)
    gold = material("Fan ribs", (0.96, 0.66, 0.2, 1.0), metallic=0.8, roughness=0.18)
    ivory = material("Moon mark", (1.0, 0.91, 0.68, 1.0), roughness=0.2, emission=0.35)

    for index in range(9):
        angle = math.radians(-52 + index * 13)
        rib = add_beveled_cube(
            "Fan rib",
            (math.sin(angle) * 0.82, 0.02, 0.02 + math.cos(angle) * 0.82),
            (0.055, 0.045, 0.95),
            gold,
            0.035,
        )
        rib.rotation_euler.y = angle
    fan = add_uv_sphere("Silk fan", (0.0, 0.06, 0.92), (1.35, 0.16, 0.92), teal)
    fan.scale.z *= 0.68
    add_uv_sphere("Fan shadow", (0.0, 0.12, 0.6), (1.05, 0.08, 0.45), navy)
    add_cylinder("Fan pin", (0.0, -0.18, 0.0), 0.2, 0.18, gold, (math.pi / 2, 0.0, 0.0))
    add_uv_sphere("Moon sigil", (0.0, -0.15, 0.92), (0.24, 0.055, 0.24), ivory, segments=32)
    render(OUT / "wind-fan.png")


def create_reddit_koto_guide() -> None:
    clear_scene()
    setup_camera(
        (768, 768),
        location=(0.0, -9.0, 4.8),
        target=(0.0, 0.0, 1.18),
        ortho=5.25,
    )
    setup_lights()
    snoo_white = material(
        "Snoo porcelain", (0.94, 0.97, 1.0, 1.0), metallic=0.03, roughness=0.22
    )
    snoo_shadow = material(
        "Snoo shadow", (0.63, 0.73, 0.84, 1.0), metallic=0.06, roughness=0.25
    )
    ink = material(
        "Snoo ink", (0.015, 0.025, 0.065, 1.0), metallic=0.18, roughness=0.16
    )
    reddit_orange = material(
        "Reddit orange", (1.0, 0.20, 0.02, 1.0), metallic=0.08, roughness=0.2
    )
    indigo = material(
        "Kimono indigo", (0.055, 0.075, 0.28, 1.0), metallic=0.08, roughness=0.28
    )
    teal = material(
        "Kimono moon teal", (0.05, 0.72, 0.66, 1.0), metallic=0.12, roughness=0.23
    )
    coral = material(
        "Kimono coral", (1.0, 0.23, 0.38, 1.0), metallic=0.08, roughness=0.24
    )
    gold = material(
        "Kimono gold", (0.96, 0.64, 0.16, 1.0), metallic=0.82, roughness=0.14
    )
    koto_wood = material(
        "Koto paulownia", (0.45, 0.16, 0.06, 1.0), metallic=0.03, roughness=0.25
    )
    koto_highlight = material(
        "Koto lacquer", (0.74, 0.31, 0.09, 1.0), metallic=0.1, roughness=0.18
    )
    string_ivory = material(
        "Koto silk strings", (1.0, 0.91, 0.67, 1.0), metallic=0.05, roughness=0.18
    )

    # Snoo's soft robot silhouette and porcelain face.
    add_uv_sphere("Snoo body", (0.0, 0.05, 0.64), (0.68, 0.46, 0.83), snoo_white)
    add_uv_sphere("Snoo head", (0.0, -0.09, 1.72), (0.86, 0.58, 0.68), snoo_white)
    add_uv_sphere("Face plate", (0.0, -0.61, 1.62), (0.58, 0.12, 0.42), snoo_white)
    for side in (-1.0, 1.0):
        add_uv_sphere(
            "Snoo eye",
            (0.29 * side, -0.735, 1.78),
            (0.105, 0.045, 0.13),
            ink,
            segments=32,
        )
        add_uv_sphere(
            "Eye glint",
            (0.26 * side, -0.772, 1.82),
            (0.025, 0.016, 0.03),
            snoo_white,
            segments=20,
        )
    add_uv_sphere("Snoo smile", (0.0, -0.758, 1.53), (0.15, 0.026, 0.035), ink, segments=24)
    add_uv_sphere("Smile mask", (0.0, -0.777, 1.57), (0.12, 0.018, 0.034), snoo_white, segments=24)

    antenna = add_cylinder(
        "Snoo antenna",
        (0.34, -0.03, 2.34),
        0.045,
        0.82,
        snoo_shadow,
        (0.0, math.radians(31), 0.0),
    )
    antenna.rotation_euler.y = math.radians(31)
    add_uv_sphere("Reddit antenna orb", (0.56, -0.03, 2.68), (0.18, 0.15, 0.18), reddit_orange, segments=36)

    # Indigo kimono with crossing coral lapels, gold obi, and moon-teal sleeves.
    add_uv_sphere("Kimono robe", (0.0, -0.1, 0.62), (0.7, 0.46, 0.78), indigo)
    left_lapel = add_beveled_cube(
        "Coral lapel", (-0.16, -0.54, 0.89), (0.11, 0.045, 0.55), coral, 0.07
    )
    left_lapel.rotation_euler.y = math.radians(-18)
    right_lapel = add_beveled_cube(
        "Ivory lapel", (0.15, -0.55, 0.89), (0.09, 0.045, 0.52), snoo_white, 0.06
    )
    right_lapel.rotation_euler.y = math.radians(18)
    add_beveled_cube("Gold obi", (0.0, -0.57, 0.49), (0.58, 0.07, 0.14), gold, 0.08)
    add_uv_sphere("Obi moon", (0.0, -0.68, 0.49), (0.14, 0.045, 0.14), teal, segments=32)
    for side in (-1.0, 1.0):
        sleeve = add_uv_sphere(
            "Kimono sleeve",
            (0.65 * side, -0.1, 0.72),
            (0.39, 0.36, 0.58),
            teal,
        )
        sleeve.rotation_euler.y = math.radians(11 * side)
        add_uv_sphere(
            "Snoo hand",
            (0.76 * side, -0.76, 0.83),
            (0.2, 0.14, 0.2),
            snoo_white,
            segments=32,
        )

    # A readable miniature koto in the foreground: long resonant body, silk strings,
    # individual bridges, and gold end caps. It is held across both hands.
    koto = add_beveled_cube(
        "Koto body", (0.0, -0.86, 0.72), (1.36, 0.18, 0.15), koto_wood, 0.16
    )
    koto.rotation_euler.y = math.radians(-2)
    add_beveled_cube(
        "Koto soundboard", (0.0, -1.045, 0.79), (1.19, 0.035, 0.095), koto_highlight, 0.07
    )
    for end_x in (-1.26, 1.26):
        add_cylinder(
            "Koto gold end cap",
            (end_x, -0.88, 0.72),
            0.19,
            0.13,
            gold,
            (0.0, math.pi / 2, 0.0),
        )
    for string_index in range(7):
        string_z = 0.735 + string_index * 0.018
        add_cylinder(
            "Koto silk string",
            (0.0, -1.096, string_z),
            0.012,
            2.31,
            string_ivory,
            (0.0, math.pi / 2, 0.0),
        )
    for bridge_index, bridge_x in enumerate((-0.78, -0.38, 0.02, 0.42, 0.82)):
        bridge = add_beveled_cube(
            "Koto movable bridge",
            (bridge_x, -1.12, 0.81 + (bridge_index % 2) * 0.016),
            (0.035, 0.035, 0.16),
            string_ivory,
            0.025,
        )
        bridge.rotation_euler.y = math.radians(-7 + bridge_index * 3)

    add_uv_sphere("Left foot", (-0.28, -0.04, -0.04), (0.26, 0.34, 0.18), snoo_white, segments=32)
    add_uv_sphere("Right foot", (0.28, -0.04, -0.04), (0.26, 0.34, 0.18), snoo_white, segments=32)
    render(OUT / "reddit-koto-guide.png")


def create_backdrop() -> None:
    clear_scene()
    setup_camera(
        (840, 1560),
        location=(0.0, -14.0, 6.6),
        target=(0.0, 0.0, 4.4),
        ortho=10.6,
        transparent=False,
    )
    setup_lights()
    navy = material("Night sky", (0.014, 0.02, 0.075, 1.0), roughness=1.0)
    indigo = material("Indigo haze", (0.045, 0.06, 0.18, 1.0), roughness=0.9)
    moon = material("Moon", (1.0, 0.83, 0.47, 1.0), roughness=0.6, emission=2.4)
    wood = material("Torii lacquer", (0.26, 0.035, 0.055, 1.0), metallic=0.12, roughness=0.3)
    gold = material("Lantern gold", (0.95, 0.55, 0.12, 1.0), metallic=0.35, roughness=0.22, emission=0.7)
    stone = material("Garden stone", (0.12, 0.15, 0.22, 1.0), roughness=0.68)
    teal = material("Spirit mist", (0.04, 0.48, 0.48, 1.0), roughness=0.45, emission=0.28)

    backdrop = add_beveled_cube("Night backdrop", (0.0, 2.8, 4.5), (5.5, 0.16, 7.0), navy, 0.0)
    backdrop.rotation_euler.x = 0.0
    add_uv_sphere("Moon", (2.7, 2.25, 7.6), (1.25, 0.35, 1.25), moon)
    add_uv_sphere("Indigo cloud", (-2.8, 1.9, 6.7), (2.6, 0.35, 0.85), indigo)
    add_uv_sphere("Teal cloud", (2.5, 1.7, 2.0), (2.6, 0.3, 0.7), teal)

    for x in (-4.25, 4.25):
        add_beveled_cube("Torii post", (x, 1.6, 4.8), (0.18, 0.18, 3.35), wood, 0.08)
    add_beveled_cube("Torii crown", (0.0, 1.6, 7.7), (4.8, 0.22, 0.22), wood, 0.09)
    add_beveled_cube("Torii lower beam", (0.0, 1.58, 7.15), (4.2, 0.18, 0.18), wood, 0.08)

    for side in (-1.0, 1.0):
        x = side * 4.0
        add_cylinder("Lantern post", (x, 0.8, 1.15), 0.08, 2.0, stone)
        add_beveled_cube("Lantern", (x, 0.65, 2.2), (0.32, 0.22, 0.42), gold, 0.1)
        add_uv_sphere("Garden stone", (side * 3.25, 1.1, -0.15), (1.2, 0.8, 0.52), stone)

    for star in range(24):
        angle = star * 2.399
        radius = 1.4 + (star % 6) * 0.56
        x = math.cos(angle) * radius
        z = 4.4 + math.sin(angle * 1.7) * 3.4
        size = 0.025 + (star % 3) * 0.018
        add_uv_sphere("Star", (x, 2.32, z), (size, 0.02, size), moon, segments=16)

    render(OUT / "moon-garden-bg.png")


if __name__ == "__main__":
    os.environ.setdefault("BLENDER_EEVEE", "1")
    if "--guide-only" in sys.argv:
        create_reddit_koto_guide()
    else:
        create_backdrop()
        for color_index, color_value in enumerate(COLORS):
            create_bowl(color_value, color_index)
        create_bridge()
        create_fan()
        create_reddit_koto_guide()
    print(f"All Moon Koto assets rendered to {OUT}")
