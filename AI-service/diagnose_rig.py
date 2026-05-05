"""
Diagnostic tool: analyze a rigged GLB for tearing causes.
Checks:
1. Multi-primitive structure (separate meshes with seams)
2. Duplicate/shared vertex positions across primitives
3. Weight quality at joint regions
4. Non-manifold edges
"""
import struct, json, sys, os
import numpy as np
from pathlib import Path

def read_glb(path):
    with open(path, 'rb') as f:
        magic, version, total_len = struct.unpack('<III', f.read(12))
        assert magic == 0x46546C67
        json_len, json_type = struct.unpack('<II', f.read(8))
        json_bytes = f.read(json_len)
        gltf = json.loads(json_bytes)
        bin_data = bytearray()
        remaining = total_len - 12 - 8 - json_len
        if remaining > 8:
            bin_len, bin_type = struct.unpack('<II', f.read(8))
            bin_data = bytearray(f.read(bin_len))
    return gltf, bin_data

def read_accessor_floats(gltf, bin_data, acc_idx, components=3):
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

def read_accessor_ushort(gltf, bin_data, acc_idx, components=4):
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

def read_indices(gltf, bin_data, prim):
    if "indices" not in prim:
        return None
    acc = gltf["accessors"][prim["indices"]]
    bv = gltf["bufferViews"][acc["bufferView"]]
    off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    ct = acc["componentType"]
    count = acc["count"]
    result = []
    for i in range(count):
        if ct == 5123:
            val = struct.unpack_from('<H', bin_data, off + i*2)[0]
        elif ct == 5125:
            val = struct.unpack_from('<I', bin_data, off + i*4)[0]
        else:
            val = struct.unpack_from('<B', bin_data, off + i)[0]
        result.append(val)
    return np.array(result, dtype=np.int32)

def main():
    outputs_dir = Path(__file__).parent / "outputs"
    
    # Find latest rigged model
    rigged = sorted(outputs_dir.glob("*_rigged.glb"), key=os.path.getmtime, reverse=True)
    if not rigged:
        print("No rigged models found!")
        return
    
    glb_path = rigged[0]
    print(f"🔍 Analyzing: {glb_path.name}")
    print(f"   Size: {glb_path.stat().st_size / 1024:.1f} KB")
    print()
    
    gltf, bin_data = read_glb(str(glb_path))
    
    # ── 1. Multi-primitive analysis ──
    print("=" * 60)
    print("1. MESH PRIMITIVE STRUCTURE")
    print("=" * 60)
    
    all_positions = []
    prim_info = []
    
    for mi, mesh in enumerate(gltf.get("meshes", [])):
        for pi, prim in enumerate(mesh.get("primitives", [])):
            attrs = prim.get("attributes", {})
            pos = read_accessor_floats(gltf, bin_data, attrs["POSITION"], 3)
            
            has_joints = "JOINTS_0" in attrs
            has_weights = "WEIGHTS_0" in attrs
            indices = read_indices(gltf, bin_data, prim)
            
            print(f"  Mesh[{mi}].Prim[{pi}]: {len(pos)} verts, "
                  f"{'indexed' if indices is not None else 'non-indexed'} "
                  f"({len(indices) if indices is not None else 0} indices), "
                  f"JOINTS={has_joints}, WEIGHTS={has_weights}")
            
            prim_info.append({
                "positions": pos,
                "indices": indices,
                "joints_acc": attrs.get("JOINTS_0"),
                "weights_acc": attrs.get("WEIGHTS_0"),
            })
            all_positions.append(pos)
    
    total_verts = sum(len(p) for p in all_positions)
    print(f"\n  Total: {len(prim_info)} primitive(s), {total_verts} vertices")
    
    # ── 2. Check for shared/duplicate vertices between primitives ──
    print()
    print("=" * 60)
    print("2. INTER-PRIMITIVE VERTEX SHARING (SEAM DETECTION)")
    print("=" * 60)
    
    if len(all_positions) > 1:
        for i in range(len(all_positions)):
            for j in range(i+1, len(all_positions)):
                pos_i = all_positions[i]
                pos_j = all_positions[j]
                # Find near-duplicate positions (within 1e-5)
                dists = np.linalg.norm(pos_i[:, None, :] - pos_j[None, :, :], axis=2)
                close_pairs = np.argwhere(dists < 1e-4)
                if len(close_pairs) > 0:
                    print(f"  ⚠️ Prim[{i}] and Prim[{j}]: {len(close_pairs)} shared boundary vertices!")
                    # Check if those shared vertices have same weights
                    if prim_info[i]["weights_acc"] is not None and prim_info[j]["weights_acc"] is not None:
                        ji = read_accessor_ushort(gltf, bin_data, prim_info[i]["joints_acc"], 4)
                        wi = read_accessor_floats(gltf, bin_data, prim_info[i]["weights_acc"], 4)
                        jj = read_accessor_ushort(gltf, bin_data, prim_info[j]["joints_acc"], 4)
                        wj = read_accessor_floats(gltf, bin_data, prim_info[j]["weights_acc"], 4)
                        
                        mismatched = 0
                        for ci, cj in close_pairs[:50]:  # sample up to 50
                            # Compare dominant bone
                            dom_i = ji[ci][np.argmax(wi[ci])]
                            dom_j = jj[cj][np.argmax(wj[cj])]
                            if dom_i != dom_j:
                                mismatched += 1
                        pct = mismatched / min(len(close_pairs), 50) * 100
                        print(f"     → Dominant bone mismatch: {mismatched}/{min(len(close_pairs),50)} ({pct:.0f}%) — causes seam tearing!")
                else:
                    print(f"  ✅ Prim[{i}] and Prim[{j}]: No shared vertices")
    else:
        print("  Single primitive — no inter-primitive seams possible")
    
    # ── 3. Weight quality analysis ──
    print()
    print("=" * 60)
    print("3. SKIN WEIGHT QUALITY")
    print("=" * 60)
    
    # Get joint names
    skin = gltf.get("skins", [{}])[0]
    joint_nodes = skin.get("joints", [])
    bone_names = [gltf["nodes"][idx].get("name", f"j{idx}") for idx in joint_nodes]
    
    # Collect all weights
    all_w = []
    all_j = []
    offset = 0
    for info in prim_info:
        if info["weights_acc"] is not None:
            w = read_accessor_floats(gltf, bin_data, info["weights_acc"], 4)
            j = read_accessor_ushort(gltf, bin_data, info["joints_acc"], 4)
            all_w.append(w)
            all_j.append(j)
    
    if all_w:
        W = np.vstack(all_w)
        J = np.vstack(all_j)
        
        max_w = W.max(axis=1)  # dominant weight per vertex
        
        print(f"  Total skinned vertices: {len(W)}")
        print(f"  Mean max weight (dominance): {max_w.mean():.3f}")
        print(f"  Median max weight: {np.median(max_w):.3f}")
        print(f"  Min max weight: {max_w.min():.3f}")
        print()
        
        thresholds = [0.5, 0.6, 0.7, 0.8, 0.9]
        for th in thresholds:
            count = np.sum(max_w < th)
            pct = count / len(max_w) * 100
            flag = "🔴" if pct > 10 else "🟡" if pct > 2 else "🟢"
            print(f"  {flag} Vertices with dominance < {th:.0%}: {count} ({pct:.1f}%)")
        
        # ── Joint-region analysis ──
        print()
        print("  --- Joint Region Weight Distribution ---")
        
        all_pos = np.vstack(all_positions)
        
        # Get joint world positions
        joints_pos = {}
        for idx_in_skin, node_idx in enumerate(joint_nodes):
            name = gltf["nodes"][node_idx].get("name", "")
            # Reconstruct world position from bone chain
            # For simplicity, use the IBM inverse (it encodes the world pos)
            ibm_acc = skin.get("inverseBindMatrices")
            if ibm_acc is not None:
                ibm_all = read_accessor_floats(gltf, bin_data, ibm_acc, 16)
                ibm = ibm_all[idx_in_skin].reshape(4, 4).T  # column-major to row-major
                world_pos = -ibm[:3, 3]  # translation is -pos in IBM
                joints_pos[name] = world_pos
        
        # Check weight quality near critical joints
        critical_joints = ["shoulder_l", "shoulder_r", "arm_l", "arm_r", 
                          "forearm_l", "forearm_r", "thigh_l", "thigh_r",
                          "shin_l", "shin_r"]
        
        height = all_pos[:, 1].max() - all_pos[:, 1].min()
        radius = height * 0.08  # check vertices within 8% of model height
        
        for jname in critical_joints:
            if jname not in joints_pos:
                continue
            jpos = joints_pos[jname]
            dists = np.linalg.norm(all_pos - jpos, axis=1)
            near_mask = dists < radius
            near_count = near_mask.sum()
            
            if near_count == 0:
                print(f"    {jname}: no vertices nearby (radius={radius:.4f})")
                continue
            
            near_max_w = max_w[near_mask]
            near_mean = near_max_w.mean()
            low_dom = (near_max_w < 0.5).sum()
            pct_low = low_dom / near_count * 100
            
            flag = "🔴" if pct_low > 20 else "🟡" if pct_low > 5 else "🟢"
            print(f"    {flag} {jname:15s}: {near_count:5d} verts, mean_dom={near_mean:.3f}, <50%: {low_dom} ({pct_low:.0f}%)")
    
    # ── 4. Non-manifold check ──
    print()
    print("=" * 60)
    print("4. NON-MANIFOLD / DISCONNECTED COMPONENT CHECK")
    print("=" * 60)
    
    # Check for disconnected mesh components via flood-fill
    for pi, info in enumerate(prim_info):
        if info["indices"] is None:
            print(f"  Prim[{pi}]: non-indexed, skipping")
            continue
        
        idx = info["indices"]
        n_verts = len(info["positions"])
        
        # Build adjacency
        adj = {i: set() for i in range(n_verts)}
        for t in range(0, len(idx), 3):
            a, b, c = int(idx[t]), int(idx[t+1]), int(idx[t+2])
            adj[a].update([b, c])
            adj[b].update([a, c])
            adj[c].update([a, b])
        
        # Flood fill to count components
        visited = set()
        components = []
        for v in range(n_verts):
            if v in visited:
                continue
            # BFS
            queue = [v]
            comp = set()
            while queue:
                curr = queue.pop()
                if curr in visited:
                    continue
                visited.add(curr)
                comp.add(curr)
                for nb in adj.get(curr, []):
                    if nb not in visited:
                        queue.append(nb)
            components.append(len(comp))
        
        if len(components) == 1:
            print(f"  ✅ Prim[{pi}]: Single connected component ({components[0]} verts)")
        else:
            components.sort(reverse=True)
            print(f"  ⚠️ Prim[{pi}]: {len(components)} DISCONNECTED components!")
            for ci, csize in enumerate(components[:10]):
                print(f"     Component {ci}: {csize} verts")
            if len(components) > 10:
                print(f"     ... and {len(components)-10} more tiny components")
            print(f"     → Disconnected parts move independently under skinning = TEARING!")
    
    # ── 5. Animation amplitude check ──
    print()
    print("=" * 60)
    print("5. ANIMATION AMPLITUDE (Run animation)")
    print("=" * 60)
    
    for anim in gltf.get("animations", []):
        print(f"  Animation: {anim.get('name', 'unnamed')}")
        print(f"  Channels: {len(anim.get('channels', []))}")
        for ch in anim.get("channels", []):
            target = ch["target"]
            node_idx = target["node"]
            path = target["path"]
            node_name = gltf["nodes"][node_idx].get("name", f"node_{node_idx}")
            
            sampler = anim["samplers"][ch["sampler"]]
            output_acc = sampler["output"]
            
            if path == "rotation":
                rots = read_accessor_floats(gltf, bin_data, output_acc, 4)
                # Convert quats to angles
                angles = []
                for q in rots:
                    x, y, z, w = q
                    angle = 2 * np.arccos(np.clip(abs(w), 0, 1))
                    angles.append(np.degrees(angle))
                max_angle = max(angles) if angles else 0
                if max_angle > 5:
                    print(f"    {node_name:20s} rot max: {max_angle:6.1f}°")
    
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    if len(prim_info) > 1:
        print("  🔴 MULTI-PRIMITIVE: Model has separate mesh parts that can tear at seams")
    if all_w:
        mean_dom = max_w.mean()
        if mean_dom < 0.7:
            print(f"  🔴 LOW DOMINANCE: Mean={mean_dom:.3f} — weights too spread, causing stretch")
        elif mean_dom < 0.85:
            print(f"  🟡 MODERATE DOMINANCE: Mean={mean_dom:.3f} — could be sharper")
        else:
            print(f"  🟢 GOOD DOMINANCE: Mean={mean_dom:.3f}")

if __name__ == "__main__":
    main()
