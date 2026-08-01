import bpy
import os
import sys

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
SOURCE_DIR = os.path.join(PUBLIC_DIR, "source", "paladin_fbx")
OUTPUT_GLB = os.path.join(PUBLIC_DIR, "paladin.glb")
BASE_MESH = "Paladin J Nordstrom.fbx"

def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:       bpy.data.meshes.remove(block)
    for block in bpy.data.materials:    bpy.data.materials.remove(block)
    for block in bpy.data.armatures:    bpy.data.armatures.remove(block)
    for block in bpy.data.actions:      bpy.data.actions.remove(block)

def main():
    print("\n⚔️ Generating Paladin GLB from FBX files...")
    clean_scene()
    
    base_fbx_path = os.path.join(SOURCE_DIR, BASE_MESH)
    if not os.path.exists(base_fbx_path):
        print(f"ERROR: Base mesh not found at {base_fbx_path}")
        sys.exit(1)
        
    print(f"  → Importing base mesh: {BASE_MESH}")
    bpy.ops.import_scene.fbx(filepath=base_fbx_path)
    
    # Identify the main armature
    main_armature = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            main_armature = obj
            break
            
    if not main_armature:
        print("ERROR: No armature found in base mesh!")
        sys.exit(1)
        
    main_armature.name = "PaladinRig"
    
    # Ensure it has animation data and NLA tracks
    if not main_armature.animation_data:
        main_armature.animation_data_create()
        
    # If the base mesh came with an action, rename it to Idle (just in case)
    if main_armature.animation_data.action:
        main_armature.animation_data.action.name = "Base_Idle"
        track = main_armature.animation_data.nla_tracks.new()
        track.name = "Base_Idle"
        track.strips.new("Base_Idle", int(main_armature.animation_data.action.frame_range[0]), main_armature.animation_data.action)
        main_armature.animation_data.action = None

    # Loop through all other FBX files and extract their actions
    fbx_files = [f for f in os.listdir(SOURCE_DIR) if f.endswith('.fbx') and f != BASE_MESH]
    
    for fbx_file in fbx_files:
        action_name = os.path.splitext(fbx_file)[0]
        print(f"  → Importing animation: {action_name}")
        
        # Keep track of existing objects to know what was just imported
        existing_objs = set(bpy.context.scene.objects)
        
        filepath = os.path.join(SOURCE_DIR, fbx_file)
        bpy.ops.import_scene.fbx(filepath=filepath)
        
        new_objs = set(bpy.context.scene.objects) - existing_objs
        
        imported_action = None
        for obj in new_objs:
            if obj.type == 'ARMATURE' and obj.animation_data and obj.animation_data.action:
                imported_action = obj.animation_data.action
                break
                
        if imported_action:
            imported_action.name = action_name
            # Create an NLA track on the MAIN armature for this action
            track = main_armature.animation_data.nla_tracks.new()
            track.name = action_name
            track.strips.new(action_name, int(imported_action.frame_range[0]), imported_action)
            
        # Delete the newly imported armature and mesh to keep the scene clean
        bpy.ops.object.select_all(action='DESELECT')
        for obj in new_objs:
            obj.select_set(True)
        bpy.ops.object.delete()
        
    # Deselect all and select just the main rig and its children for export
    bpy.ops.object.select_all(action='DESELECT')
    main_armature.select_set(True)
    for child in main_armature.children:
        child.select_set(True)
        
    print(f"  → Exporting GLB to {OUTPUT_GLB}")
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        use_selection=True,
        export_format='GLB',
        export_animations=True,
        export_anim_single_armature=False,
        export_nla_strips=True,
        export_apply=True,
    )
    print("✅ Done!")

if __name__ == "__main__":
    main()
