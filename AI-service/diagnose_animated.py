"""Analyze an animated GLB to find untargeted bones and structural issues."""
import struct, json, os
import numpy as np
from pathlib import Path

def read_glb(path):
    with open(path, 'rb') as f:
        magic, version, total_len = struct.unpack('<III', f.read(12))
        json_len, json_type = struct.unpack('<II', f.read(8))
        gltf = json.loads(f.read(json_len))
        bin_data = bytearray()
        remaining = total_len - 12 - 8 - json_len
        if remaining > 8:
            bin_len, bin_type = struct.unpack('<II', f.read(8))
            bin_data = bytearray(f.read(bin_len))
    return gltf, bin_data

def read_accessor_floats(gltf, bin_data, acc_idx, components):
    acc = gltf["accessors"][acc_idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    stride = bv.get("byteStride", components * 4)
    result = []
    for i in range(count):
        o = off + i * stride
        vals = struct.unpack_from(f'<{components}f', bin_data, o)
        result.append(vals)
    return np.array(result)

def read_accessor_ushort(gltf, bin_data, acc_idx, components):
    acc = gltf["accessors"][acc_idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    stride = bv.get("byteStride", components * 2)
    result = []
    for i in range(count):
        o = off + i * stride
        vals = struct.unpack_from(f'<{components}H', bin_data, o)
        result.append(vals)
    return np.array(result)

def main():
    outputs_dir = Path(__file__).parent / "outputs"
    animated = sorted(outputs_dir.glob("*_animated.glb"), key=os.path.getmtime, reverse=True)
    if not animated:
        print("No animated models found!")
        return
    
    path = animated[0]
    print(f"Analyzing: {path.name}")
    print(f"Size: {path.stat().st_size / 1024:.1f} KB\n")
    
    gltf, bin_data = read_glb(str(path))
    
    # Scene structure
    print("=== SCENE STRUCTURE ===")
    for si, scene in enumerate(gltf.get("scenes", [])):
        print(f"  Scene[{si}] root nodes: {scene.get('nodes', [])}")
    
    # Nodes
    nodes = gltf.get("nodes", [])
    print(f"\n=== NODES ({len(nodes)}) ===")
    for ni, node in enumerate(nodes):
        parts = []
        if "mesh" in node: parts.append(f"mesh={node['mesh']}")
        if "skin" in node: parts.append(f"skin={node['skin']}")
        if "children" in node: parts.append(f"children={node['children'][:5]}{'...' if len(node.get('children',[])) > 5 else ''}")
        name = node.get("name", "")
        print(f"  [{ni:2d}] {name:20s} {' '.join(parts)}")
    
    # Skins
    skins = gltf.get("skins", [])
    print(f"\n=== SKINS ({len(skins)}) ===")
    for si, skin in enumerate(skins):
        joints = skin["joints"]
        print(f"  Skin[{si}]: {len(joints)} joints, skeleton={skin.get('skeleton')}")
        print(f"    Joint indices: {joints}")
    
    # Animations 
    anims = gltf.get("animations", [])
    print(f"\n=== ANIMATIONS ({len(anims)}) ===")
    for ai, anim in enumerate(anims):
        channels = anim.get("channels", [])
        name = anim.get("name", "unnamed")
        print(f"  [{ai}] '{name}' - {len(channels)} channels")
        
        targeted = {}
        for ch in channels:
            target = ch["target"]
            nidx = target["node"]
            path = target["path"]
            nname = nodes[nidx].get("name", f"node_{nidx}")
            if nname not in targeted:
                targeted[nname] = []
            targeted[nname].append(path)
            
            # Check rotation amplitude
            if path == "rotation":
                sampler = anim["samplers"][ch["sampler"]]
                rots = read_accessor_floats(gltf, bin_data, sampler["output"], 4)
                max_angle = 0
                for q in rots:
                    x, y, z, w = q
                    angle = 2 * np.arccos(np.clip(abs(w), 0, 1))
                    max_angle = max(max_angle, np.degrees(angle))
                print(f"    {nname:20s} rot max: {max_angle:6.1f} deg")
            elif path == "translation":
                sampler = anim["samplers"][ch["sampler"]]
                trans = read_accessor_floats(gltf, bin_data, sampler["output"], 3)
                max_trans = np.abs(trans).max()
                print(f"    {nname:20s} trans max: {max_trans:.4f}")
        
        # Find untargeted joint nodes
        if skins:
            joint_indices = skins[0]["joints"]
            untargeted = []
            for ji in joint_indices:
                jname = nodes[ji].get("name", f"node_{ji}")
                if jname not in targeted:
                    untargeted.append(jname)
            print(f"\n    TARGETED bones: {len(targeted)}")
            print(f"    UNTARGETED bones ({len(untargeted)}): {untargeted}")
    
    # Weight distribution per bone
    print(f"\n=== WEIGHT DISTRIBUTION PER BONE ===")
    if skins:
        joint_indices = skins[0]["joints"]
        bone_names = [nodes[ji].get("name", f"j{ji}") for ji in joint_indices]
        
        # Read all weights and joints
        all_w = []
        all_j = []
        for mesh in gltf.get("meshes", []):
            for prim in mesh.get("primitives", []):
                attrs = prim.get("attributes", {})
                if "JOINTS_0" in attrs and "WEIGHTS_0" in attrs:
                    j = read_accessor_ushort(gltf, bin_data, attrs["JOINTS_0"], 4)
                    w = read_accessor_floats(gltf, bin_data, attrs["WEIGHTS_0"], 4)
                    all_j.append(j)
                    all_w.append(w)
        
        if all_w:
            J = np.vstack(all_j)
            W = np.vstack(all_w)
            total_verts = len(W)
            
            # Count how many vertices have each bone as dominant
            dominant_bone = J[np.arange(total_verts), np.argmax(W, axis=1)]
            for bi, bname in enumerate(bone_names):
                count = np.sum(dominant_bone == bi)
                pct = count / total_verts * 100
                in_anim = "ANIMATED" if any(bname in t for a in anims for t in [{}])  else ""
                print(f"    {bname:20s}: {count:6d} verts ({pct:5.1f}%) dominant")
            
            # Check specifically: how many verts dominated by untargeted bones?
            if anims and skins:
                targeted_set = set()
                for anim in anims:
                    for ch in anim.get("channels", []):
                        nidx = ch["target"]["node"]
                        targeted_set.add(nidx)
                
                untargeted_vert_count = 0
                for vi in range(total_verts):
                    dom_joint = int(dominant_bone[vi])
                    dom_node = joint_indices[dom_joint]
                    if dom_node not in targeted_set:
                        untargeted_vert_count += 1
                
                pct = untargeted_vert_count / total_verts * 100
                print(f"\n    CRITICAL: {untargeted_vert_count} vertices ({pct:.1f}%) dominated by UNTARGETED bones")
                print(f"    These vertices will NOT move during animation = TEARING SOURCE")

if __name__ == "__main__":
    main()
