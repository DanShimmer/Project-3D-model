"""
3D Model Post-processing
- Mesh smoothing
- Polygon reduction
- Scale normalization
- Format conversion
"""
import numpy as np
from pathlib import Path
import trimesh
from config import ProcessingConfig as cfg


def load_mesh(path: str) -> trimesh.Trimesh:
    """Load mesh from file"""
    return trimesh.load(path, force='mesh')


def smooth_mesh(mesh: trimesh.Trimesh, iterations: int = None) -> trimesh.Trimesh:
    """
    Apply Laplacian smoothing to mesh
    """
    if iterations is None:
        iterations = cfg.SMOOTHING_ITERATIONS
    
    print(f"  → Smoothing mesh ({iterations} iterations)...")
    
    # Laplacian smoothing
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
        # Fallback to trimesh's simplification
        print("  ⚠️ pymeshlab not available, using basic simplification")
        ratio = target_faces / current_faces
        mesh = mesh.simplify_quadric_decimation(target_faces)
    
    print(f"  ✓ Reduced to {len(mesh.faces)} faces")
    return mesh


def normalize_scale(mesh: trimesh.Trimesh, target_size: float = 1.0) -> trimesh.Trimesh:
    """
    Normalize mesh to fit in a unit cube centered at origin
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
    Fix common mesh issues
    - Remove duplicate vertices
    - Fix winding order
    - Fill holes
    """
    print("  → Fixing mesh issues...")
    
    # Merge close vertices
    mesh.merge_vertices()
    
    # Remove degenerate faces
    mesh.remove_degenerate_faces()
    
    # Remove duplicate faces
    mesh.remove_duplicate_faces()
    
    # Fix normals
    mesh.fix_normals()
    
    # Fill small holes
    try:
        trimesh.repair.fill_holes(mesh)
    except:
        pass
    
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


def postprocess_mesh(
    input_path: str,
    output_path: str = None,
    smooth: bool = True,
    reduce: bool = True,
    normalize: bool = True,
    target_faces: int = None
) -> str:
    """
    Full post-processing pipeline
    1. Load mesh
    2. Fix issues
    3. Smooth (optional)
    4. Reduce polygons (optional)
    5. Normalize scale (optional)
    6. Export as GLB
    """
    print(f"🔧 Post-processing: {input_path}")
    
    # Load
    mesh = load_mesh(input_path)
    print(f"  Loaded: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
    
    # Fix issues
    mesh = fix_mesh(mesh)
    
    # Smooth
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


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        input_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else None
        
        result = postprocess_mesh(input_path, output_path)
        print(f"Result: {result}")
    else:
        print("Usage: python postprocessing.py <input_mesh> [output_path]")
