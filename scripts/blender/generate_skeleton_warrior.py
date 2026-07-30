"""
Skeleton Warrior Generator for Echoes of the Scale
===================================================
Generates a low-poly skeleton warrior with:
- Skull, ribcage, spine, pelvis, arms, legs
- A sword in the right hand
- A shield on the left arm
- Full armature rig
- Animations: Idle, Walk, Attack, Death
- Exports as .glb to the public/ folder

Run headlessly:
  blender --background --python generate_skeleton_warrior.py
"""

import bpy
import math
import os
from mathutils import Vector, Euler

# ── Configuration ─────────────────────────────────────────────────────────────
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "public")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "skeleton-warrior.glb")

# ── Clean Scene ───────────────────────────────────────────────────────────────
def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:       bpy.data.meshes.remove(block)
    for block in bpy.data.materials:    bpy.data.materials.remove(block)
    for block in bpy.data.armatures:    bpy.data.armatures.remove(block)
    for block in bpy.data.actions:      bpy.data.actions.remove(block)

# ── Materials ─────────────────────────────────────────────────────────────────
def create_materials():
    bone_mat = bpy.data.materials.new(name="Bone")
    bsdf = bone_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.85, 0.78, 0.62, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.7

    metal_mat = bpy.data.materials.new(name="DarkMetal")
    bsdf = metal_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.15, 0.15, 0.18, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.35
    bsdf.inputs["Metallic"].default_value = 0.95

    eye_mat = bpy.data.materials.new(name="GlowEye")
    bsdf = eye_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1.0, 0.2, 0.05, 1.0)
    bsdf.inputs["Emission Color"].default_value = (1.0, 0.3, 0.05, 1.0)
    bsdf.inputs["Emission Strength"].default_value = 8.0

    return bone_mat, metal_mat, eye_mat

# ── Mesh Builders ─────────────────────────────────────────────────────────────
def make_skull(bone_mat, eye_mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.18, location=(0, 0, 1.65))
    skull = bpy.context.object
    skull.name = "Skull"
    skull.scale = (1.0, 1.1, 1.05)
    bpy.ops.object.transform_apply(scale=True)
    skull.data.materials.append(bone_mat)

    bpy.ops.mesh.primitive_cube_add(size=0.14, location=(0, 0.08, 1.55))
    jaw = bpy.context.object
    jaw.scale = (0.9, 0.7, 0.5)
    bpy.ops.object.transform_apply(scale=True)
    jaw.data.materials.append(bone_mat)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.035, location=(-0.06, 0.14, 1.68))
    l_eye = bpy.context.object
    l_eye.data.materials.append(eye_mat)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.035, location=(0.06, 0.14, 1.68))
    r_eye = bpy.context.object
    r_eye.data.materials.append(eye_mat)

    bpy.ops.object.select_all(action='DESELECT')
    for o in [skull, jaw, l_eye, r_eye]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = skull
    bpy.ops.object.join()
    return skull

def make_spine(bone_mat):
    parts = []
    for i in range(6):
        z = 1.45 - i * 0.1
        bpy.ops.mesh.primitive_cube_add(size=0.07, location=(0, 0, z))
        v = bpy.context.object
        v.scale = (1.2, 0.8, 0.8)
        bpy.ops.object.transform_apply(scale=True)
        v.data.materials.append(bone_mat)
        parts.append(v)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    parts[0].name = "Spine"
    return parts[0]

def make_ribcage(bone_mat):
    ribs = []
    for i in range(4):
        z = 1.4 - i * 0.08
        sf = 1.0 - i * 0.08
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.18 * sf, minor_radius=0.015,
            major_segments=12, minor_segments=4,
            location=(0, 0.02, z)
        )
        rib = bpy.context.object
        rib.scale = (1.0, 0.6, 0.8)
        rib.rotation_euler = (0.3, 0, 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        rib.data.materials.append(bone_mat)
        ribs.append(rib)
    bpy.ops.object.select_all(action='DESELECT')
    for r in ribs:
        r.select_set(True)
    bpy.context.view_layer.objects.active = ribs[0]
    bpy.ops.object.join()
    ribs[0].name = "Ribcage"
    return ribs[0]

def make_pelvis(bone_mat):
    bpy.ops.mesh.primitive_cube_add(size=0.2, location=(0, 0, 0.88))
    p = bpy.context.object
    p.name = "Pelvis"
    p.scale = (1.3, 0.6, 0.6)
    bpy.ops.object.transform_apply(scale=True)
    p.data.materials.append(bone_mat)
    return p

def make_limb(name, start, end, radius, bone_mat):
    direction = Vector(end) - Vector(start)
    length = direction.length
    mid = (Vector(start) + Vector(end)) / 2
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, vertices=6, location=mid)
    limb = bpy.context.object
    limb.name = name
    up = Vector((0, 0, 1))
    rot = up.rotation_difference(direction.normalized())
    limb.rotation_mode = 'QUATERNION'
    limb.rotation_quaternion = rot
    bpy.ops.object.transform_apply(rotation=True)
    limb.data.materials.append(bone_mat)

    for pos in [start, end]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=radius * 1.5, location=pos)
        j = bpy.context.object
        j.data.materials.append(bone_mat)
        bpy.ops.object.select_all(action='DESELECT')
        j.select_set(True)
        limb.select_set(True)
        bpy.context.view_layer.objects.active = limb
        bpy.ops.object.join()
    return limb

def make_hand(name, loc, bone_mat):
    bpy.ops.mesh.primitive_cube_add(size=0.06, location=loc)
    h = bpy.context.object
    h.name = name
    h.scale = (1.0, 0.5, 1.2)
    bpy.ops.object.transform_apply(scale=True)
    h.data.materials.append(bone_mat)
    fingers = []
    for i in range(3):
        fl = (loc[0] + (i - 1) * 0.025, loc[1] + 0.02, loc[2] - 0.05)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.007, depth=0.06, vertices=4, location=fl)
        f = bpy.context.object
        f.data.materials.append(bone_mat)
        fingers.append(f)
    bpy.ops.object.select_all(action='DESELECT')
    h.select_set(True)
    for f in fingers:
        f.select_set(True)
    bpy.context.view_layer.objects.active = h
    bpy.ops.object.join()
    return h

def make_foot(name, loc, bone_mat):
    bpy.ops.mesh.primitive_cube_add(size=0.08, location=(loc[0], loc[1] + 0.04, loc[2]))
    f = bpy.context.object
    f.name = name
    f.scale = (0.6, 1.2, 0.3)
    bpy.ops.object.transform_apply(scale=True)
    f.data.materials.append(bone_mat)
    return f

def make_sword(metal_mat):
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=0.04, location=(0.35, 0, 1.05))
    b = bpy.context.object
    b.name = "Blade"
    b.scale = (0.3, 1.0, 12.0)
    bpy.ops.object.transform_apply(scale=True)
    b.data.materials.append(metal_mat)
    parts.append(b)
    bpy.ops.mesh.primitive_cube_add(size=0.04, location=(0.35, 0, 1.12))
    g = bpy.context.object
    g.scale = (3.0, 1.0, 0.5)
    bpy.ops.object.transform_apply(scale=True)
    g.data.materials.append(metal_mat)
    parts.append(g)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.12, vertices=6, location=(0.35, 0, 1.18))
    h = bpy.context.object
    h.data.materials.append(metal_mat)
    parts.append(h)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = b
    bpy.ops.object.join()
    b.name = "Sword"
    return b

def make_shield(metal_mat):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=0.03, vertices=8, location=(-0.4, 0.05, 1.1))
    s = bpy.context.object
    s.name = "Shield"
    s.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    s.data.materials.append(metal_mat)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=4, radius=0.05, location=(-0.4, 0.07, 1.1))
    boss = bpy.context.object
    boss.data.materials.append(metal_mat)
    bpy.ops.object.select_all(action='DESELECT')
    s.select_set(True)
    boss.select_set(True)
    bpy.context.view_layer.objects.active = s
    bpy.ops.object.join()
    return s

# ── Assemble ──────────────────────────────────────────────────────────────────
def build_warrior():
    bone_mat, metal_mat, eye_mat = create_materials()
    parts = []
    parts.append(make_skull(bone_mat, eye_mat))
    parts.append(make_spine(bone_mat))
    parts.append(make_ribcage(bone_mat))
    parts.append(make_pelvis(bone_mat))
    parts.append(make_limb("RUpperArm", (0.22, 0, 1.42), (0.35, 0, 1.24), 0.025, bone_mat))
    parts.append(make_limb("RLowerArm", (0.35, 0, 1.24), (0.35, 0, 1.05), 0.02, bone_mat))
    parts.append(make_hand("RHand", (0.35, 0, 1.0), bone_mat))
    parts.append(make_limb("LUpperArm", (-0.22, 0, 1.42), (-0.35, 0, 1.24), 0.025, bone_mat))
    parts.append(make_limb("LLowerArm", (-0.35, 0, 1.24), (-0.4, 0, 1.08), 0.02, bone_mat))
    parts.append(make_hand("LHand", (-0.4, 0, 1.03), bone_mat))
    parts.append(make_limb("RThigh", (0.1, 0, 0.85), (0.12, 0, 0.5), 0.03, bone_mat))
    parts.append(make_limb("RShin", (0.12, 0, 0.5), (0.12, 0, 0.08), 0.025, bone_mat))
    parts.append(make_foot("RFoot", (0.12, 0, 0.04), bone_mat))
    parts.append(make_limb("LThigh", (-0.1, 0, 0.85), (-0.12, 0, 0.5), 0.03, bone_mat))
    parts.append(make_limb("LShin", (-0.12, 0, 0.5), (-0.12, 0, 0.08), 0.025, bone_mat))
    parts.append(make_foot("LFoot", (-0.12, 0, 0.04), bone_mat))
    parts.append(make_sword(metal_mat))
    parts.append(make_shield(metal_mat))

    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    warrior = bpy.context.object
    warrior.name = "SkeletonWarrior"

    # Ground the feet at y=0
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    warrior.location = (0, 0, 0)
    bbox_min_z = min(v.co.z for v in warrior.data.vertices)
    for v in warrior.data.vertices:
        v.co.z -= bbox_min_z
    bpy.ops.object.shade_smooth()
    return warrior

# ── Armature ──────────────────────────────────────────────────────────────────
def create_armature(warrior):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm_obj = bpy.context.object
    arm_obj.name = "SkeletonRig"

    bpy.ops.object.mode_set(mode='EDIT')
    armature = arm_obj.data
    for b in armature.edit_bones:
        armature.edit_bones.remove(b)

    def add_bone(name, head, tail, parent_name=None):
        bone = armature.edit_bones.new(name)
        bone.head = Vector(head)
        bone.tail = Vector(tail)
        if parent_name and parent_name in armature.edit_bones:
            bone.parent = armature.edit_bones[parent_name]
        return bone

    add_bone("Root",        (0, 0, 0),       (0, 0, 0.1))
    add_bone("Hips",        (0, 0, 0.88),    (0, 0, 0.95),    "Root")
    add_bone("Spine",       (0, 0, 0.95),    (0, 0, 1.15),    "Hips")
    add_bone("Chest",       (0, 0, 1.15),    (0, 0, 1.4),     "Spine")
    add_bone("Neck",        (0, 0, 1.4),     (0, 0, 1.5),     "Chest")
    add_bone("Head",        (0, 0, 1.5),     (0, 0, 1.75),    "Neck")
    add_bone("Shoulder.R",  (0.15, 0, 1.42), (0.22, 0, 1.42), "Chest")
    add_bone("UpperArm.R",  (0.22, 0, 1.42), (0.35, 0, 1.24), "Shoulder.R")
    add_bone("LowerArm.R",  (0.35, 0, 1.24), (0.35, 0, 1.05), "UpperArm.R")
    add_bone("Hand.R",      (0.35, 0, 1.05), (0.35, 0, 0.95), "LowerArm.R")
    add_bone("Shoulder.L",  (-0.15, 0, 1.42),(-0.22, 0, 1.42),"Chest")
    add_bone("UpperArm.L",  (-0.22, 0, 1.42),(-0.35, 0, 1.24),"Shoulder.L")
    add_bone("LowerArm.L",  (-0.35, 0, 1.24),(-0.4, 0, 1.08), "UpperArm.L")
    add_bone("Hand.L",      (-0.4, 0, 1.08), (-0.4, 0, 0.98), "LowerArm.L")
    add_bone("UpperLeg.R",  (0.1, 0, 0.85),  (0.12, 0, 0.5),  "Hips")
    add_bone("LowerLeg.R",  (0.12, 0, 0.5),  (0.12, 0, 0.08), "UpperLeg.R")
    add_bone("Foot.R",      (0.12, 0, 0.08), (0.12, 0.08, 0), "LowerLeg.R")
    add_bone("UpperLeg.L",  (-0.1, 0, 0.85), (-0.12, 0, 0.5), "Hips")
    add_bone("LowerLeg.L",  (-0.12, 0, 0.5), (-0.12, 0, 0.08),"UpperLeg.L")
    add_bone("Foot.L",      (-0.12, 0, 0.08),(-0.12, 0.08, 0),"LowerLeg.L")

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent with automatic weights
    bpy.ops.object.select_all(action='DESELECT')
    warrior.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    return arm_obj

# ── Animations (Blender 5.2 Layered Action API) ──────────────────────────────
def kf(arm_obj, bone_name, frame, rot=None, loc=None):
    """Set a keyframe on a pose bone."""
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    bone = arm_obj.pose.bones.get(bone_name)
    if not bone:
        bpy.ops.object.mode_set(mode='OBJECT')
        return
    bone.rotation_mode = 'XYZ'
    if rot:
        bone.rotation_euler = Euler(rot)
        bone.keyframe_insert(data_path='rotation_euler', frame=frame)
    if loc:
        bone.location = Vector(loc)
        bone.keyframe_insert(data_path='location', frame=frame)
    bpy.ops.object.mode_set(mode='OBJECT')

def create_idle(arm_obj):
    action = bpy.data.actions.new(name="Idle")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action
    action.use_cyclic = True

    for f in [1, 24, 48]:
        sw = 0.02 if f == 24 else 0.0
        bob = 0.01 if f == 24 else 0.0
        kf(arm_obj, "Spine", f, rot=(sw, 0, 0))
        kf(arm_obj, "Chest", f, rot=(-sw * 0.5, 0, 0))
        kf(arm_obj, "Head",  f, rot=(sw * 0.3, sw * 0.5, 0))
        kf(arm_obj, "Hips",  f, loc=(0, 0, bob))
        kf(arm_obj, "UpperArm.R", f, rot=(sw, 0, 0))
        kf(arm_obj, "UpperArm.L", f, rot=(-sw, 0, 0))
    return action

def create_walk(arm_obj):
    action = bpy.data.actions.new(name="Walk")
    arm_obj.animation_data.action = action
    action.use_cyclic = True

    sw, asw = 0.4, 0.3
    poses = {
        1:  {"UpperLeg.R": (-sw,0,0), "UpperLeg.L": (sw,0,0),
             "LowerLeg.R": (0.1,0,0), "LowerLeg.L": (-0.3,0,0),
             "UpperArm.R": (asw,0,0), "UpperArm.L": (-asw,0,0),
             "Spine": (0.05,0,0.02)},
        7:  {"UpperLeg.R": (0,0,0), "UpperLeg.L": (0,0,0),
             "LowerLeg.R": (-0.3,0,0), "LowerLeg.L": (0,0,0),
             "UpperArm.R": (0,0,0), "UpperArm.L": (0,0,0),
             "Spine": (0.02,0,-0.02)},
        13: {"UpperLeg.R": (sw,0,0), "UpperLeg.L": (-sw,0,0),
             "LowerLeg.R": (-0.3,0,0), "LowerLeg.L": (0.1,0,0),
             "UpperArm.R": (-asw,0,0), "UpperArm.L": (asw,0,0),
             "Spine": (0.05,0,-0.02)},
        19: {"UpperLeg.R": (0,0,0), "UpperLeg.L": (0,0,0),
             "LowerLeg.R": (0,0,0), "LowerLeg.L": (-0.3,0,0),
             "UpperArm.R": (0,0,0), "UpperArm.L": (0,0,0),
             "Spine": (0.02,0,0.02)},
    }
    for frame, bones in poses.items():
        for bn, r in bones.items():
            kf(arm_obj, bn, frame, rot=r)
    # Loop
    for bn, r in poses[1].items():
        kf(arm_obj, bn, 25, rot=r)
    return action

def create_attack(arm_obj):
    action = bpy.data.actions.new(name="Attack")
    arm_obj.animation_data.action = action

    # Rest
    kf(arm_obj, "UpperArm.R", 1, rot=(0,0,0))
    kf(arm_obj, "LowerArm.R", 1, rot=(0,0,0))
    kf(arm_obj, "Chest", 1, rot=(0,0,0))
    kf(arm_obj, "UpperArm.L", 1, rot=(0,0,0))
    # Wind up
    kf(arm_obj, "UpperArm.R", 8, rot=(-1.2,0,-0.3))
    kf(arm_obj, "LowerArm.R", 8, rot=(-0.5,0,0))
    kf(arm_obj, "Chest", 8, rot=(0.1,0,0.2))
    kf(arm_obj, "UpperArm.L", 8, rot=(0.3,0,0.4))
    # Slash
    kf(arm_obj, "UpperArm.R", 14, rot=(0.8,0,0.3))
    kf(arm_obj, "LowerArm.R", 14, rot=(0.3,0,0))
    kf(arm_obj, "Chest", 14, rot=(-0.15,0,-0.3))
    kf(arm_obj, "UpperArm.L", 14, rot=(0.2,0,0.3))
    # Recovery
    kf(arm_obj, "UpperArm.R", 24, rot=(0,0,0))
    kf(arm_obj, "LowerArm.R", 24, rot=(0,0,0))
    kf(arm_obj, "Chest", 24, rot=(0,0,0))
    kf(arm_obj, "UpperArm.L", 24, rot=(0,0,0))
    return action

def create_death(arm_obj):
    action = bpy.data.actions.new(name="Death")
    arm_obj.animation_data.action = action

    bones_zero = ["Spine","Chest","Head","Hips","UpperArm.R","UpperArm.L",
                  "UpperLeg.R","UpperLeg.L","Root"]
    for bn in bones_zero:
        kf(arm_obj, bn, 1, rot=(0,0,0))
    kf(arm_obj, "Root", 1, loc=(0,0,0))

    kf(arm_obj, "Spine", 10, rot=(0.3,0,0.1))
    kf(arm_obj, "Chest", 10, rot=(0.2,0,0))
    kf(arm_obj, "Head",  10, rot=(0.4,0,-0.2))
    kf(arm_obj, "UpperArm.R", 10, rot=(0,0,-0.5))
    kf(arm_obj, "UpperArm.L", 10, rot=(0,0,0.5))

    kf(arm_obj, "Root", 20, rot=(1.2,0,0.3))
    kf(arm_obj, "Root", 20, loc=(0,0.3,-0.5))
    kf(arm_obj, "Spine", 20, rot=(0.5,0,0.2))
    kf(arm_obj, "Head",  20, rot=(0.8,0.3,-0.3))
    kf(arm_obj, "UpperArm.R", 20, rot=(0.5,0,-1.0))
    kf(arm_obj, "UpperArm.L", 20, rot=(0.3,0,1.0))

    kf(arm_obj, "Root", 36, rot=(1.2,0,0.3))
    kf(arm_obj, "Root", 36, loc=(0,0.3,-0.5))
    return action

# ── Export ─────────────────────────────────────────────────────────────────────
def export_glb(arm_obj):
    bpy.ops.object.select_all(action='DESELECT')
    arm_obj.select_set(True)
    for child in arm_obj.children:
        child.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj

    # Push all actions to NLA tracks so they all export
    if arm_obj.animation_data:
        for action in bpy.data.actions:
            track = arm_obj.animation_data.nla_tracks.new()
            track.name = action.name
            strip = track.strips.new(action.name, int(action.frame_range[0]), action)
        arm_obj.animation_data.action = None

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_FILE,
        use_selection=True,
        export_format='GLB',
        export_animations=True,
        export_anim_single_armature=False,
        export_nla_strips=True,
        export_apply=True,
    )
    print(f"\n{'='*60}")
    print(f"  Skeleton Warrior exported to: {OUTPUT_FILE}")
    print(f"{'='*60}\n")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("\n🦴 Generating Skeleton Warrior...")
    clean_scene()
    print("  → Building mesh...")
    warrior = build_warrior()
    print("  → Creating armature...")
    arm_obj = create_armature(warrior)
    print("  → Animating: Idle...")
    create_idle(arm_obj)
    print("  → Animating: Walk...")
    create_walk(arm_obj)
    print("  → Animating: Attack...")
    create_attack(arm_obj)
    print("  → Animating: Death...")
    create_death(arm_obj)
    print("  → Exporting .glb...")
    export_glb(arm_obj)
    print("✅ Done!")

if __name__ == "__main__":
    main()
