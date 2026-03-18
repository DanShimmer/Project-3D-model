"""
3D Model Post-processing
- Mesh smoothing
- Polygon reduction
- Scale normalization + grounding (feet at Y=0)
- Artifact removal (frame/shell detection)
- Auto-fix upright orientation (validation + correction)
- Humanoid mesh cleanup for rigging
- Symmetry enforcement
- Format conversion

Supports Hunyuan3D (Y-up native) output.
Default: Hunyuan3D mode (no Z→Y conversion needed).
"""
import numpy as np
from pathlib import Path
import trimesh
import trimesh.transformations
from config import ProcessingConfig as cfg


def load_mesh(path: str) -> trimesh.Trimesh:
    """Load mesh from file"""
    return trimesh.load(path, force='mesh')


def remove_disconnected_components(mesh: trimesh.Trimesh, keep_largest: bool = True) -> trimesh.Trimesh:
    """
    Remove disconnected mesh components (frames, artifacts, background geometry).
    Keeps only the largest connected component by default.
    """
    print("  → Removing disconnected components...")
    
    # Split into connected components
    components = mesh.split(only_watertight=False)
    
    if len(components) <= 1:
        print(f"    ✓ Mesh is already a single component ({len(mesh.faces)} faces)")
        return mesh
    
    print(f"    Found {len(components)} disconnected components")
    
    if keep_largest:
        # Keep only the largest component by face count
        largest = max(components, key=lambda m: len(m.faces))
        removed_faces = len(mesh.faces) - len(largest.faces)
        print(f"    ✓ Kept largest component: {len(largest.faces)} faces (removed {removed_faces} artifact faces)")
        return largest
    else:
        # Keep components that are at least 10% of the largest
        largest_count = max(len(c.faces) for c in components)
        threshold = largest_count * 0.1
        
        kept = [c for c in components if len(c.faces) >= threshold]
        print(f"    ✓ Kept {len(kept)} significant components out of {len(components)}")
        
        if len(kept) == 1:
            return kept[0]
        
        return trimesh.util.concatenate(kept)


def remove_boundary_artifacts(mesh: trimesh.Trimesh, trim_ratio: float = 0.02) -> trimesh.Trimesh:
    """
    Remove vertices/faces near the bounding box edges.
    3D generators sometimes create a thin shell or frame at the edges of the
    reconstruction volume. This trims geometry at the outermost edges.
    
    trim_ratio: fraction of bounding box to trim from each edge (default 2%)
    """
    print(f"  → Trimming boundary artifacts ({trim_ratio*100:.0f}% from edges)...")
    
    if len(mesh.vertices) == 0:
        return mesh
    
    bounds = mesh.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]
    extents = bounds[1] - bounds[0]
    
    # Calculate trim amount for each axis
    trim = extents * trim_ratio
    inner_min = bounds[0] + trim
    inner_max = bounds[1] - trim
    
    # Find vertices within the trimmed bounds
    mask = np.all(
        (mesh.vertices >= inner_min) & (mesh.vertices <= inner_max),
        axis=1
    )
    
    # Find faces where ALL vertices are within bounds
    face_mask = mask[mesh.faces].all(axis=1)
    
    if face_mask.sum() < len(mesh.faces) * 0.5:
        # Don't trim if it would remove too much (more than 50%)
        print(f"    ⚠️ Trim would remove too many faces, skipping")
        return mesh
    
    trimmed_faces = mesh.faces[face_mask]
    
    if len(trimmed_faces) == 0:
        print(f"    ⚠️ No faces left after trim, skipping")
        return mesh
    
    # Rebuild mesh
    trimmed = trimesh.Trimesh(
        vertices=mesh.vertices,
        faces=trimmed_faces,
        vertex_colors=mesh.visual.vertex_colors if hasattr(mesh.visual, 'vertex_colors') else None,
        process=True
    )
    
    removed = len(mesh.faces) - len(trimmed.faces)
    if removed > 0:
        print(f"    ✓ Removed {removed} boundary faces ({removed/len(mesh.faces)*100:.1f}%)")
    else:
        print(f"    ✓ No boundary artifacts found")
    
    return trimmed


def smooth_mesh(mesh: trimesh.Trimesh, iterations: int = None) -> trimesh.Trimesh:
    """
    Apply Taubin smoothing (shrink-free) to mesh.
    Unlike Laplacian smoothing, Taubin smoothing preserves mesh volume
    while still removing noise/jaggy edges. This is much better
    for animation-ready models.
    
    Falls back to Laplacian if Taubin is not available.
    """
    if iterations is None:
        iterations = cfg.SMOOTHING_ITERATIONS
    
    print(f"  → Smoothing mesh ({iterations} iterations, Taubin volume-preserving)...")
    
    try:
        # Taubin smoothing: alternates shrinking (λ) and inflating (μ)
        # This prevents the mesh from shrinking to a ball
        trimesh.smoothing.filter_taubin(mesh, iterations=iterations)
        print("    ✓ Taubin smoothing applied")
    except (AttributeError, TypeError):
        # Fallback to Laplacian if Taubin not available in this trimesh version
        print("    ⚠️ Taubin not available, using Laplacian fallback")
        trimesh.smoothing.filter_laplacian(mesh, iterations=iterations)
    
    return mesh


def reduce_polygons(mesh: trimesh.Trimesh, target_faces: int = None) -> trimesh.Trimesh:
    """
    Reduce polygon count using quadric decimation
    """
    if target_faces is None:
        target_faces = cfg.TARGET_FACES
    
    current_faces = len(mesh.faces)
    
    if current_faces <= target_faces:
        print(f"  → Mesh already has {current_faces} faces (target: {target_faces})")
        return mesh
    
    print(f"  → Reducing polygons: {current_faces} → {target_faces}...")
    
    try:
        # Try using pymeshlab for better decimation
        import pymeshlab
        
        ms = pymeshlab.MeshSet()
        ms.add_mesh(pymeshlab.Mesh(mesh.vertices, mesh.faces))
        
        # Quadric edge collapse decimation
        ms.meshing_decimation_quadric_edge_collapse(
            targetfacenum=target_faces,
            preservenormal=True,
            preserveboundary=True,
            preservetopology=True,
            qualitythr=0.5
        )
        
        # Get result
        result = ms.current_mesh()
        mesh = trimesh.Trimesh(
            vertices=result.vertex_matrix(),
            faces=result.face_matrix()
        )
        
    except ImportError:
        # Fallback to trimesh's simplification (requires open3d)
        print("  ⚠️ pymeshlab not available, trying trimesh fallback...")
        try:
            mesh = mesh.simplify_quadric_decimation(target_faces)
        except Exception as e:
            print(f"  ⚠️ Polygon reduction skipped (open3d not available): {e}")
            return mesh
    
    print(f"  ✓ Reduced to {len(mesh.faces)} faces")
    return mesh


def normalize_scale(mesh: trimesh.Trimesh, target_size: float = 2.0) -> trimesh.Trimesh:
    """
    Normalize mesh to fit in a box of target_size, grounded at Y=0.
    
    - Centers mesh horizontally (X, Z) using bounding box center
    - Scales uniformly so the largest extent = target_size
    - Grounds model: bottom at Y=0, top at Y=height
    - Default target_size=2.0 → model spans [0, 2] on Y if tallest axis
    - Works well with Three.js viewer + <Center> component
    
    Using bounding box center (not centroid) for consistent positioning.
    Centroid shifts based on vertex density, which varies between models.
    Bounding box center is always geometrically centered.
    
    Grounding (feet at Y=0) is critical for rigging and animation —
    the skeleton root expects the model to stand on the ground plane.
    """
    print(f"  → Normalizing: bbox-center, scale to {target_size}, ground at Y=0...")
    
    # Use bounding box center for horizontal centering (more consistent than centroid)
    bbox_center = (mesh.bounds[0] + mesh.bounds[1]) / 2.0
    mesh.vertices[:, 0] -= bbox_center[0]  # Center X
    mesh.vertices[:, 2] -= bbox_center[2]  # Center Z
    
    # Ground the model: shift so bottom of mesh is at Y=0
    # This is critical for rigging — skeleton root should be at ground level
    y_min = mesh.vertices[:, 1].min()
    mesh.vertices[:, 1] -= y_min  # Now bottom at Y=0, top at Y=height
    
    # Scale to fit in target size
    extents = mesh.extents
    max_extent = max(extents)
    
    if max_extent > 0:
        scale = target_size / max_extent
        mesh.vertices *= scale
    
    final_extents = mesh.extents
    y_range = [mesh.vertices[:, 1].min(), mesh.vertices[:, 1].max()]
    print(f"    ✓ Grounded, extents: X={final_extents[0]:.2f}, Y={final_extents[1]:.2f}, Z={final_extents[2]:.2f}")
    print(f"    ✓ Y range: [{y_range[0]:.2f}, {y_range[1]:.2f}] (feet at {y_range[0]:.2f})")
    
    return mesh


def fix_mesh(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """
    Comprehensive mesh repair pipeline to produce watertight mesh.
    This is critical for animation — holes and non-manifold edges
    cause rigging/skinning to fail.
    
    Steps:
    1. Merge close vertices (fix tiny gaps)
    2. Remove degenerate/duplicate faces
    3. Fix normals consistency
    4. Fill ALL holes (multiple passes)
    5. Attempt watertight closure
    6. Remove non-manifold edges/vertices
    """
    print("  → Comprehensive mesh repair...")
    
    initial_holes = 0
    try:
        # Count boundary edges (= holes)
        edges = mesh.edges_sorted
        edge_counts = {}
        for e in map(tuple, edges):
            edge_counts[e] = edge_counts.get(e, 0) + 1
        initial_holes = sum(1 for c in edge_counts.values() if c == 1)
        print(f"    Boundary edges before repair: {initial_holes}")
    except:
        pass
    
    # Step 1: Merge close vertices to seal micro-gaps
    mesh.merge_vertices(merge_tex=True, merge_norm=True)
    
    # Step 2: Remove degenerate and duplicate faces
    mesh.remove_degenerate_faces()
    mesh.remove_duplicate_faces()
    
    # Step 3: Remove zero-area faces
    face_areas = mesh.area_faces
    valid_faces = face_areas > 1e-10
    if not valid_faces.all():
        removed_count = (~valid_faces).sum()
        mesh.update_faces(valid_faces)
        print(f"    Removed {removed_count} zero-area faces")
    
    # Step 4: Fix normals (consistent winding)
    mesh.fix_normals()
    
    # Step 5: Fill holes — multiple passes with maximum aggressiveness
    for pass_num in range(8):
        try:
            trimesh.repair.fill_holes(mesh)
        except:
            pass
        if mesh.is_watertight:
            print(f"    ✓ Mesh is watertight after fill pass {pass_num + 1}")
            break
    
    # Step 6: If still not watertight, try pymeshlab's powerful repair
    if not mesh.is_watertight:
        try:
            import pymeshlab
            ms = pymeshlab.MeshSet()
            
            # Build pymeshlab mesh with vertex colors if available
            pm = pymeshlab.Mesh(mesh.vertices, mesh.faces)
            ms.add_mesh(pm)
            
            # Close holes — max hole size (in edges) up to 2000
            try:
                ms.meshing_close_holes(maxholesize=2000, selfintersection=False)
                print("    ✓ pymeshlab: holes closed")
            except Exception as e:
                print(f"    ⚠️ pymeshlab close_holes: {e}")
            
            # Repair non-manifold edges/vertices
            try:
                ms.meshing_repair_non_manifold_edges(method=0)
                ms.meshing_repair_non_manifold_vertices(vertdispratio=0)
                print("    ✓ pymeshlab: non-manifold repaired")
            except Exception as e:
                print(f"    ⚠️ pymeshlab non-manifold repair: {e}")
            
            # Get repaired mesh back
            repaired = ms.current_mesh()
            v_new = repaired.vertex_matrix()
            f_new = repaired.face_matrix()
            
            if len(f_new) > 0:
                # Rebuild trimesh, try to preserve vertex colors
                vc = None
                if hasattr(mesh.visual, 'vertex_colors') and mesh.visual.vertex_colors is not None:
                    old_vc = mesh.visual.vertex_colors
                    if len(v_new) == len(old_vc):
                        vc = old_vc
                    elif len(v_new) > len(old_vc):
                        # New vertices from hole-filling get average color
                        avg_color = old_vc[:len(old_vc)].mean(axis=0).astype(np.uint8)
                        extra = np.tile(avg_color, (len(v_new) - len(old_vc), 1))
                        vc = np.vstack([old_vc, extra])
                
                mesh = trimesh.Trimesh(
                    vertices=v_new,
                    faces=f_new,
                    vertex_colors=vc,
                    process=True
                )
                print(f"    ✓ pymeshlab repair: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")
        except ImportError:
            print("    ⚠️ pymeshlab not available — basic repair only")
        except Exception as e:
            print(f"    ⚠️ pymeshlab repair failed: {e}")
    
    # Step 7: Final re-check
    final_holes = 0
    try:
        edges = mesh.edges_sorted
        edge_counts = {}
        for e in map(tuple, edges):
            edge_counts[e] = edge_counts.get(e, 0) + 1
        final_holes = sum(1 for c in edge_counts.values() if c == 1)
    except:
        pass
    
    watertight_str = "✓ WATERTIGHT" if mesh.is_watertight else f"⚠️ {final_holes} boundary edges remaining"
    print(f"    Repair complete: {watertight_str}")
    
    return mesh


def export_glb(mesh: trimesh.Trimesh, output_path: str) -> str:
    """
    Export mesh to GLB format
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Ensure .glb extension
    if output_path.suffix.lower() != '.glb':
        output_path = output_path.with_suffix('.glb')
    
    mesh.export(str(output_path), file_type='glb')
    print(f"  ✓ Exported to {output_path}")
    
    return str(output_path)


def auto_fix_upright(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """
    Auto-detect and fix model orientation so it stands upright (Y-up).
    
    Uses cross-section slice analysis to detect upside-down models:
    1. Ensure Y is the tallest axis (rotate if needed)
    2. Divide model into horizontal slices along Y
    3. Compute XZ spread for each slice
    4. Find the weighted center-of-spread along Y
    5. For humanoid characters, the widest part (shoulders/arms) should be
       in the UPPER portion. If the weighted center is in the lower half,
       the model is likely upside down → flip 180° around X.
    
    This replaces the old simple top/bottom split which failed to detect
    inversions where shoulders (wide) ended up at the bottom.
    
    Works for humanoid characters, creatures, and most upright objects.
    Modifies vertices in-place to preserve TextureVisuals.
    """
    extents = mesh.extents
    x_ext, y_ext, z_ext = extents
    max_ext = max(extents)
    max_axis = np.argmax(extents)
    
    print(f"  → Auto-orientation check: X={x_ext:.3f}, Y={y_ext:.3f}, Z={z_ext:.3f}")
    
    # ── Step 1: Make Y the tallest axis ──────────────────────────────
    if y_ext >= max_ext * 0.85:
        print(f"    ✓ Y is tallest (or near-tallest): Y={y_ext:.3f}, max={max_ext:.3f}")
    else:
        print(f"    ⚠️ Y not tallest: tallest = {'XYZ'[max_axis]} ({max_ext:.3f}), Y = {y_ext:.3f}")
        
        v = mesh.vertices.copy()
        
        if max_axis == 0:
            # X is tallest → rotate 90° around Z: (x,y,z) → (-y, x, z)
            print(f"    → Rotating 90° around Z (X→Y)")
            mesh.vertices[:, 0] = -v[:, 1]
            mesh.vertices[:, 1] = v[:, 0]
            mesh.vertices[:, 2] = v[:, 2]
        elif max_axis == 2:
            # Z is tallest → rotate -90° around X: (x,y,z) → (x, z, -y)
            print(f"    → Rotating -90° around X (Z→Y)")
            mesh.vertices[:, 0] = v[:, 0]
            mesh.vertices[:, 1] = v[:, 2]
            mesh.vertices[:, 2] = -v[:, 1]
        
        if hasattr(mesh, '_cache'):
            mesh._cache.clear()
        
        new_extents = mesh.extents
        print(f"    ✓ After rotation: X={new_extents[0]:.3f}, Y={new_extents[1]:.3f}, Z={new_extents[2]:.3f}")
    
    # ── Step 2: Detect upside-down via cross-section slice analysis ──
    y_min = mesh.vertices[:, 1].min()
    y_max = mesh.vertices[:, 1].max()
    y_range = y_max - y_min
    
    if y_range < 1e-6:
        print(f"    ✓ Model is flat along Y, skipping flip check")
        return mesh
    
    NUM_SLICES = 10
    slice_spreads = np.zeros(NUM_SLICES)
    
    for i in range(NUM_SLICES):
        y_lo = y_min + i * y_range / NUM_SLICES
        y_hi = y_min + (i + 1) * y_range / NUM_SLICES
        mask = (mesh.vertices[:, 1] >= y_lo) & (mesh.vertices[:, 1] < y_hi)
        verts_in_slice = mesh.vertices[mask]
        
        if len(verts_in_slice) < 3:
            continue
        
        # XZ bounding area of this slice
        x_spread = verts_in_slice[:, 0].ptp()
        z_spread = verts_in_slice[:, 2].ptp()
        slice_spreads[i] = x_spread * z_spread
    
    total_spread = slice_spreads.sum()
    
    if total_spread < 1e-10:
        print(f"    ✓ Model has negligible cross-section spread, skipping flip check")
        return mesh
    
    # Weighted center-of-spread along Y (0.0 = bottom, 1.0 = top)
    # For each slice, weight = slice_spread, position = normalized Y center
    slice_centers = np.array([(i + 0.5) / NUM_SLICES for i in range(NUM_SLICES)])
    weighted_center = np.dot(slice_spreads, slice_centers) / total_spread
    
    # Also find which slice has maximum spread
    max_slice_idx = np.argmax(slice_spreads)
    max_slice_y = (max_slice_idx + 0.5) / NUM_SLICES
    
    print(f"    Cross-section analysis ({NUM_SLICES} slices):")
    print(f"      Weighted center of spread: {weighted_center:.3f} (0=bottom, 1=top)")
    print(f"      Max spread at slice {max_slice_idx}/{NUM_SLICES} (Y={max_slice_y:.2f})")
    
    # Print slice spread distribution for debugging
    spread_bar = ""
    max_s = slice_spreads.max() if slice_spreads.max() > 0 else 1
    for i in range(NUM_SLICES):
        bar_len = int(20 * slice_spreads[i] / max_s)
        spread_bar += f"      [{i}] {'█' * bar_len}{'░' * (20 - bar_len)} {slice_spreads[i]:.4f}\n"
    print(f"      Slice spread distribution (bottom→top):\n{spread_bar.rstrip()}")
    
    # Decision: For upright humanoid, the wider part (shoulders/arms) should
    # be ABOVE center. If weighted center < 0.45, model is likely upside down.
    # Threshold 0.45 instead of 0.5 to avoid false positives for symmetric models.
    if weighted_center < 0.45:
        print(f"    ⚠️ Model appears UPSIDE DOWN (spread center {weighted_center:.3f} < 0.45)")
        print(f"    → Flipping 180° (negating Y)")
        mesh.vertices[:, 1] = -mesh.vertices[:, 1]
        if hasattr(mesh, '_cache'):
            mesh._cache.clear()
        print(f"    ✓ Flipped upright")
    else:
        print(f"    ✓ Orientation OK (spread center {weighted_center:.3f} ≥ 0.45)")
    
    return mesh


def cleanup_for_rigging(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """
    Prepare mesh for humanoid rigging (Mixamo, auto-rigging tools).
    
    Requirements for good rigging:
    1. Watertight (no holes) — skinning weights need closed surface
    2. Manifold geometry — no self-intersections, no non-manifold edges
    3. Merged close vertices — no micro-gaps at seams
    4. Symmetry (optional) — makes left/right weight mirroring work
    5. Clean topology — no degenerate faces, consistent normals
    
    This is applied AFTER smoothing and decimation, BEFORE orientation fix.
    """
    print("  → Cleaning mesh for rigging...")
    
    # Step 1: Merge close vertices (seal micro-gaps)
    if cfg.MERGE_CLOSE_VERTICES:
        before = len(mesh.vertices)
        mesh.merge_vertices(merge_tex=True, merge_norm=True)
        after = len(mesh.vertices)
        if before != after:
            print(f"    ✓ Merged vertices: {before} → {after} ({before - after} merged)")
    
    # Step 2: Remove degenerate geometry
    mesh.remove_degenerate_faces()
    mesh.remove_duplicate_faces()
    
    # Remove zero-area faces
    face_areas = mesh.area_faces
    valid = face_areas > 1e-10
    if not valid.all():
        removed = (~valid).sum()
        mesh.update_faces(valid)
        print(f"    ✓ Removed {removed} degenerate faces")
    
    # Step 3: Fix normals
    mesh.fix_normals()
    
    # Step 4: Close holes for watertight mesh
    if cfg.CLOSE_MESH_HOLES:
        for i in range(5):
            try:
                trimesh.repair.fill_holes(mesh)
            except:
                pass
            if mesh.is_watertight:
                break
        
        if mesh.is_watertight:
            print("    ✓ Mesh is watertight (ready for rigging)")
        else:
            print("    ⚠️ Mesh has small holes (rigging may still work)")
            # Try pymeshlab for aggressive hole closing
            try:
                import pymeshlab
                ms = pymeshlab.MeshSet()
                ms.add_mesh(pymeshlab.Mesh(mesh.vertices, mesh.faces))
                ms.meshing_close_holes(maxholesize=2000, selfintersection=False)
                repaired = ms.current_mesh()
                if len(repaired.face_matrix()) > 0:
                    mesh = trimesh.Trimesh(
                        vertices=repaired.vertex_matrix(),
                        faces=repaired.face_matrix(),
                        process=True
                    )
                    if mesh.is_watertight:
                        print("    ✓ pymeshlab sealed remaining holes")
            except ImportError:
                pass
            except Exception as e:
                print(f"    ⚠️ pymeshlab hole closing failed: {e}")
    
    # Step 5: Enforce X-axis symmetry for humanoid characters
    if cfg.SYMMETRIZE_MESH:
        mesh = symmetrize_mesh(mesh)
    
    print(f"    ✓ Rig-ready cleanup complete: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")
    return mesh


def symmetrize_mesh(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """
    Enforce approximate X-axis symmetry for humanoid characters.
    
    Strategy: For each vertex, find its mirror across X=0.
    If a close mirror exists, average their positions to enforce symmetry.
    This preserves the overall shape while making left/right symmetric.
    
    Only applied if the mesh is roughly symmetric already (>60% of vertices
    have a mirror partner). Asymmetric objects (e.g., a gun) are skipped.
    """
    print("    → Checking mesh symmetry...")
    
    verts = mesh.vertices.copy()
    n_verts = len(verts)
    
    if n_verts == 0:
        return mesh
    
    # Center the mesh on X axis first
    x_center = (verts[:, 0].max() + verts[:, 0].min()) / 2.0
    verts[:, 0] -= x_center
    
    # For each vertex, find its mirror across X=0
    # Mirror: (x, y, z) → (-x, y, z)
    mirrored = verts.copy()
    mirrored[:, 0] = -mirrored[:, 0]
    
    # Build KD-tree for efficient nearest-neighbor lookup
    try:
        from scipy.spatial import cKDTree
        tree = cKDTree(verts)
        
        # Find nearest neighbor of each mirrored vertex
        distances, indices = tree.query(mirrored, k=1)
        
        # Count how many vertices have a close mirror partner
        # Threshold: 5% of the mesh's X-extent
        x_extent = verts[:, 0].max() - verts[:, 0].min()
        threshold = max(x_extent * 0.05, 0.01)
        has_mirror = distances < threshold
        mirror_ratio = has_mirror.sum() / n_verts
        
        print(f"      Symmetry ratio: {mirror_ratio:.1%} of vertices have mirror partner")
        
        if mirror_ratio < 0.5:
            print(f"      Skipping symmetry (ratio {mirror_ratio:.1%} < 50%, likely asymmetric object)")
            # Restore original X position
            mesh.vertices[:, 0] -= x_center - (mesh.vertices[:, 0].max() + mesh.vertices[:, 0].min()) / 2.0
            return mesh
        
        # Average symmetric vertices
        symmetric_verts = verts.copy()
        for i in range(n_verts):
            if has_mirror[i]:
                j = indices[i]
                if i != j:  # Don't average with self (center vertices)
                    # Average the Y and Z coordinates
                    symmetric_verts[i, 1] = (verts[i, 1] + verts[j, 1]) / 2.0
                    symmetric_verts[i, 2] = (verts[i, 2] + verts[j, 2]) / 2.0
                    # Enforce exact X mirror
                    avg_abs_x = (abs(verts[i, 0]) + abs(verts[j, 0])) / 2.0
                    symmetric_verts[i, 0] = avg_abs_x if verts[i, 0] >= 0 else -avg_abs_x
        
        # Restore original X center offset
        symmetric_verts[:, 0] += x_center
        
        mesh.vertices = symmetric_verts
        mesh._cache.clear()
        print(f"      ✓ Symmetry enforced ({has_mirror.sum()} vertices adjusted)")
        
    except ImportError:
        print("      ⚠️ scipy not available, skipping symmetry enforcement")
    except Exception as e:
        print(f"      ⚠️ Symmetry enforcement failed: {e}")
    
    return mesh


def postprocess_mesh(
    input_path: str,
    output_path: str = None,
    smooth: bool = True,
    reduce: bool = True,
    normalize: bool = True,
    target_faces: int = None,
    remove_artifacts: bool = True,
    rig_ready: bool = True,
    source: str = 'hunyuan3d'
) -> str:
    """
    Post-processing pipeline for 3D model output.
    
    Post-processing pipeline for Hunyuan3D-2 output.
    
    Pipeline:
    1. Load mesh
    2. Remove disconnected components (floating artifacts)
    3. Basic mesh cleanup (degenerate faces, normals)
    4. (OPTIONAL) Smooth — DISABLED by default
    5. (OPTIONAL) Reduce polygons — only if exceeding target
    6. Auto-fix upright orientation
    7. Normalize scale, center, ground at Y=0
    8. Export as GLB
    """
    print(f"🔧 Post-processing ({source}): {input_path}")
    
    # Load
    mesh = load_mesh(input_path)
    print(f"  Loaded: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
    
    # Check visual type for debugging
    visual_type = type(mesh.visual).__name__ if hasattr(mesh, 'visual') else 'None'
    print(f"  Visual type: {visual_type}")
    
    # Step 1: Remove disconnected components (actual floating artifacts)
    if remove_artifacts:
        mesh = remove_disconnected_components(mesh)
    
    # Step 2: Basic mesh cleanup (non-destructive)
    print("  → Basic mesh cleanup...")
    mesh.merge_vertices(merge_tex=True, merge_norm=True)
    mesh.remove_degenerate_faces()
    mesh.remove_duplicate_faces()
    mesh.fix_normals()
    print(f"    ✓ Cleanup: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")
    
    # Step 3: Smooth — only if configured (DISABLED by default)
    if smooth and cfg.SMOOTHING_ITERATIONS > 0:
        mesh = smooth_mesh(mesh)
    
    # Step 4: Reduce polygons — only if mesh is very large
    if reduce:
        mesh = reduce_polygons(mesh, target_faces)
    
    # Step 5: Hunyuan3D outputs Y-up (GLB standard), no conversion needed
    print("  → Hunyuan3D output: already Y-up (GLB standard)")
    
    # Step 6: Auto-fix upright orientation — validate model is actually upright
    mesh = auto_fix_upright(mesh)
    
    # Step 7: Normalize scale, center horizontally, ground at Y=0
    if normalize:
        mesh = normalize_scale(mesh)
    
    # Export
    if output_path is None:
        output_path = input_path
    
    return export_glb(mesh, output_path)


def render_mesh_thumbnail(mesh_path: str, output_image_path: str, resolution: tuple = (512, 512)) -> str:
    """
    Render a thumbnail image of the 3D mesh from a 3/4 view angle.
    This ensures My Storage thumbnails match the actual 3D model,
    not the SD-generated 2D concept image.
    
    Uses trimesh's built-in scene rendering (pyrender/pyglet backend).
    Falls back to a simple silhouette render if pyrender is unavailable.
    """
    print(f"  📸 Rendering 3D thumbnail...")
    
    try:
        mesh = trimesh.load(mesh_path, force='mesh')
    except Exception as e:
        print(f"    ⚠️ Could not load mesh for thumbnail: {e}")
        return None
    
    try:
        # Method 1: Use trimesh scene rendering (requires pyglet or pyrender)
        scene = trimesh.Scene(mesh)
        
        # Set camera angle - 3/4 elevated view (similar to how user sees it)
        # This gives a nice perspective showing the model's 3D form
        angles = np.radians([30, -45, 0])  # elevation, azimuth, roll
        rotation = trimesh.transformations.euler_matrix(*angles, axes='sxyz')
        
        # Try to render with scene.save_image (requires offscreen rendering)
        # Use neutral gray background to match the app's viewer
        png_data = scene.save_image(resolution=resolution, visible=False, background=[45, 45, 55, 255])
        
        if png_data is not None and len(png_data) > 0:
            with open(output_image_path, 'wb') as f:
                f.write(png_data)
            print(f"    ✓ 3D thumbnail saved: {output_image_path}")
            return output_image_path
            
    except Exception as e:
        print(f"    ⚠️ Scene render failed ({e}), trying fallback...")
    
    try:
        # Method 2: Simple projection-based silhouette thumbnail
        from PIL import Image, ImageDraw
        
        # Work on a copy to avoid modifying the original mesh
        verts_orig = mesh.vertices.copy()
        
        # Center mesh
        verts_orig -= mesh.centroid
        extents = np.ptp(verts_orig, axis=0)
        max_ext = max(extents) if max(extents) > 0 else 1.0
        verts_orig /= max_ext
        
        # Simple orthographic projection from 3/4 view
        angle_y = np.radians(-30)
        angle_x = np.radians(20)
        rot_y = np.array([
            [np.cos(angle_y), 0, np.sin(angle_y)],
            [0, 1, 0],
            [-np.sin(angle_y), 0, np.cos(angle_y)]
        ])
        rot_x = np.array([
            [1, 0, 0],
            [0, np.cos(angle_x), -np.sin(angle_x)],
            [0, np.sin(angle_x), np.cos(angle_x)]
        ])
        verts = verts_orig @ rot_y.T @ rot_x.T
        
        # Project to 2D (simple orthographic)
        w, h = resolution
        margin = 0.12
        scale = min(w, h) * (1.0 - 2 * margin) / 2.0
        cx, cy = w / 2, h * 0.52  # Slightly below center for grounded models
        
        proj_x = (verts[:, 0] * scale + cx).astype(int)
        proj_y = (-verts[:, 1] * scale + cy).astype(int)  # Flip Y
        
        # Create image with dark background (matches viewer)
        img = Image.new('RGB', resolution, (17, 24, 39))
        draw = ImageDraw.Draw(img)
        
        # Get vertex colors
        vertex_colors = None
        if hasattr(mesh, 'visual') and hasattr(mesh.visual, 'vertex_colors'):
            vc = mesh.visual.vertex_colors
            if vc is not None and len(vc) == len(mesh.vertices):
                vertex_colors = vc
        
        # Sort faces by depth (painter's algorithm)
        face_centers_z = verts[mesh.faces].mean(axis=1)[:, 2]
        face_order = np.argsort(face_centers_z)
        
        # Limit faces for performance (skip smallest faces if too many)
        max_render_faces = 50000
        if len(face_order) > max_render_faces:
            face_order = face_order[::len(face_order) // max_render_faces]
        
        # Two light sources for better depth perception
        light1 = np.array([0.5, 0.7, 0.5])
        light1 /= np.linalg.norm(light1)
        light2 = np.array([-0.3, 0.5, -0.2])
        light2 /= np.linalg.norm(light2)
        
        for fi in face_order:
            face = mesh.faces[fi]
            pts = [(int(proj_x[v]), int(proj_y[v])) for v in face]
            
            # Face normal for shading
            v0, v1, v2 = verts[face[0]], verts[face[1]], verts[face[2]]
            normal = np.cross(v1 - v0, v2 - v0)
            norm_len = np.linalg.norm(normal)
            if norm_len > 0:
                normal /= norm_len
            
            # Two-light shading for better depth
            shade1 = max(0, np.dot(normal, light1))
            shade2 = max(0, np.dot(normal, light2))
            shade = 0.25 + 0.55 * shade1 + 0.20 * shade2  # Ambient + 2 lights
            
            if vertex_colors is not None:
                c = vertex_colors[face].mean(axis=0)[:3].astype(float)
                r, g, b = int(c[0] * shade), int(c[1] * shade), int(c[2] * shade)
            else:
                # Bright visible gray for untextured models
                base = int(210 * shade)
                r, g, b = base, base, int(base * 1.05)  # Slight blue tint
            
            r = max(0, min(255, r))
            g = max(0, min(255, g))
            b = max(0, min(255, b))
            
            draw.polygon(pts, fill=(r, g, b))
        
        img.save(output_image_path)
        print(f"    ✓ 3D thumbnail (fallback) saved: {output_image_path}")
        return output_image_path
        
    except Exception as e:
        print(f"    ⚠️ Fallback thumbnail also failed: {e}")
        return None


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        input_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else None
        
        result = postprocess_mesh(input_path, output_path)
        print(f"Result: {result}")
    else:
        print("Usage: python postprocessing.py <input_mesh> [output_path]")
