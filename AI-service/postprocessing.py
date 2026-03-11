"""
3D Model Post-processing
- Mesh smoothing
- Polygon reduction
- Scale normalization
- Artifact removal (frame/shell detection)
- Format conversion
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
    TripoSR sometimes creates a thin shell or frame at the edges of the
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
    Normalize mesh to fit in a box of target_size, centered at origin.
    Default target_size=2.0 so the model spans [-1, 1] on each axis,
    which works well with the Three.js viewer camera at z=3.
    """
    print(f"  → Normalizing scale to {target_size}...")
    
    # Center the mesh
    mesh.vertices -= mesh.centroid
    
    # Scale to fit in target size
    extents = mesh.extents
    max_extent = max(extents)
    
    if max_extent > 0:
        scale = target_size / max_extent
        mesh.vertices *= scale
    
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


def orient_mesh_upright(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """
    Convert TripoSR's coordinate system to GLB/Three.js standard (Y-up).
    
    Uses the EXACT same rotation matrices as TripoSR's own
    `to_gradio_3d_orientation()` in tsr/utils.py:
      1) Rotate -90° around X axis  (Z-up → Y-up)
      2) Rotate +90° around Y axis  (adjust front-facing direction)
    """
    print("  → Converting coordinate system (TripoSR Z-up → GLB Y-up)...")
    
    extents_before = mesh.extents.copy()
    
    # Use trimesh's rotation_matrix (same as TripoSR's to_gradio_3d_orientation)
    # Step 1: -π/2 around X → converts Z-up to Y-up
    rot_x = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
    mesh.apply_transform(rot_x)
    
    # Step 2: +π/2 around Y → corrects front-facing direction
    rot_y = trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0])
    mesh.apply_transform(rot_y)
    
    new_extents = mesh.extents
    print(f"    Before: X={extents_before[0]:.3f}, Y={extents_before[1]:.3f}, Z={extents_before[2]:.3f}")
    print(f"    After:  X={new_extents[0]:.3f}, Y={new_extents[1]:.3f}, Z={new_extents[2]:.3f}")
    print(f"    ✓ Orientation fixed (identical to TripoSR's to_gradio_3d_orientation)")
    return mesh


def postprocess_mesh(
    input_path: str,
    output_path: str = None,
    smooth: bool = True,
    reduce: bool = True,
    normalize: bool = True,
    target_faces: int = None,
    remove_artifacts: bool = True
) -> str:
    """
    Full post-processing pipeline
    1. Load mesh
    2. Fix issues
    3. Remove disconnected components (frames/artifacts)
    4. Remove boundary artifacts (edge shells from TripoSR)
    5. Smooth (optional)
    6. Reduce polygons (optional)
    7. Normalize scale (optional)
    8. Export as GLB
    """
    print(f"🔧 Post-processing: {input_path}")
    
    # Load
    mesh = load_mesh(input_path)
    print(f"  Loaded: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
    
    # First pass repair (fix before removing components to not break connectivity)
    mesh = fix_mesh(mesh)
    
    # Remove disconnected components (removes frames/background artifacts)
    if remove_artifacts:
        mesh = remove_disconnected_components(mesh)
        # Also trim boundary artifacts (thin shells at volume edges)
        # Reduced from 2% to 1% to preserve more detail
        mesh = remove_boundary_artifacts(mesh, trim_ratio=0.01)
    
    # Second pass repair — fill holes created by artifact removal
    print("  → Second-pass hole filling after artifact removal...")
    mesh = fix_mesh(mesh)
    
    # Orient mesh upright (Y-up) — fixes TripoSR sideways output
    mesh = orient_mesh_upright(mesh)
    
    # Smooth (Taubin volume-preserving)
    if smooth:
        mesh = smooth_mesh(mesh)
    
    # Reduce polygons
    if reduce:
        mesh = reduce_polygons(mesh, target_faces)
    
    # Normalize
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
        
        # Center mesh
        mesh.vertices -= mesh.centroid
        extents = mesh.extents
        max_ext = max(extents) if max(extents) > 0 else 1.0
        mesh.vertices /= max_ext
        
        # Simple orthographic projection from 3/4 view
        # Rotate mesh to get a nice viewing angle
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
        verts = mesh.vertices @ rot_y.T @ rot_x.T
        
        # Project to 2D (simple orthographic)
        w, h = resolution
        margin = 0.15
        scale = min(w, h) * (1.0 - 2 * margin) / 2.0
        cx, cy = w / 2, h / 2
        
        proj_x = (verts[:, 0] * scale + cx).astype(int)
        proj_y = (-verts[:, 1] * scale + cy).astype(int)  # Flip Y
        
        # Create image with neutral gray background (matches viewer)
        img = Image.new('RGB', resolution, (45, 45, 55))
        draw = ImageDraw.Draw(img)
        
        # Draw faces as filled polygons
        if hasattr(mesh, 'visual') and hasattr(mesh.visual, 'vertex_colors'):
            vertex_colors = mesh.visual.vertex_colors
        else:
            vertex_colors = None
        
        # Sort faces by depth (painter's algorithm)
        face_centers_z = verts[mesh.faces].mean(axis=1)[:, 2]
        face_order = np.argsort(face_centers_z)
        
        for fi in face_order:
            face = mesh.faces[fi]
            pts = [(int(proj_x[v]), int(proj_y[v])) for v in face]
            
            # Face normal for simple shading
            v0, v1, v2 = verts[face[0]], verts[face[1]], verts[face[2]]
            normal = np.cross(v1 - v0, v2 - v0)
            norm_len = np.linalg.norm(normal)
            if norm_len > 0:
                normal /= norm_len
            
            # Simple directional lighting
            light_dir = np.array([0.5, 0.7, 0.5])
            light_dir /= np.linalg.norm(light_dir)
            shade = max(0.2, abs(np.dot(normal, light_dir)))
            
            if vertex_colors is not None and len(vertex_colors) > 0:
                # Use vertex colors (average of face vertices)
                c = vertex_colors[face].mean(axis=0)[:3].astype(float)
                r, g, b = int(c[0] * shade), int(c[1] * shade), int(c[2] * shade)
            else:
                # Default gray shading
                base = int(200 * shade)
                r, g, b = base, base, base
            
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
