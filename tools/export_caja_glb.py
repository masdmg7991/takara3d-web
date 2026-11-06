"""Export the local box preview from read-only SolidWorks parts.

Requires SolidWorks, pywin32, numpy, trimesh and Pillow on the CAD workstation.
The CAD originals and intermediate tessellation never belong in the web repository.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


def read_parts(source, switch_part):
    import pythoncom
    import win32com.client
    from win32com.client import VARIANT

    sw = win32com.client.Dispatch("SldWorks.Application")
    names = ["Base_Circular_V2", "Base_Cuadrada", "Base+rodameinto", "Tapa_Inferior_Base", "USB Type-C"]
    paths = [source / "V2" / (name + ".SLDPRT") for name in names]
    paths += [source / "Cuerpo.SLDPRT", source / "Cuerpo_Base.SLDPRT", switch_part]
    result = {}
    for path in paths:
        if not path.is_file():
            raise FileNotFoundError(path.name)
        errors = VARIANT(pythoncom.VT_BYREF | pythoncom.VT_I4, 0)
        warnings = VARIANT(pythoncom.VT_BYREF | pythoncom.VT_I4, 0)
        # swOpenDocOptions_Silent | swOpenDocOptions_ReadOnly. Never save a source.
        doc = sw.OpenDoc6(str(path.resolve()), 1, 3, "", errors, warnings)
        if not doc:
            raise RuntimeError(f"Could not read {path.name}: {errors.value}")
        vertices = np.asarray(doc.GetTessTriangles(True), dtype=np.float32).reshape(-1, 3)
        normals = doc.GetTessNorms
        if callable(normals):
            normals = normals()
        result[path.stem] = (vertices, np.asarray(normals, dtype=np.float32).reshape(-1, 3))
    return result


def build(parts):
    scene = trimesh.Scene()
    body = PBRMaterial(name="BOX_BODY", baseColorFactor=[24, 24, 24, 255], metallicFactor=0, roughnessFactor=.96)
    base = PBRMaterial(name="BOX_BASE", baseColorFactor=[24, 24, 24, 255], metallicFactor=0, roughnessFactor=.96)
    metal = PBRMaterial(name="BOX_USB", baseColorFactor=[180, 183, 185, 255], metallicFactor=.8, roughnessFactor=.32)
    switch = PBRMaterial(name="BOX_SWITCH", baseColorFactor=[12, 12, 12, 255], metallicFactor=0, roughnessFactor=.8)
    manifest = []

    def translation(x=0, y=0, z=0):
        return trimesh.transformations.translation_matrix([x, y, z])

    def radial_mount(angle, radius, anchor, tilt=0):
        """Align a CAD mounting face to its measured tangent plane in the shell."""
        centre = translation(x=np.sin(angle) * radius, y=-.0095, z=np.cos(angle) * radius)
        facing = trimesh.transformations.rotation_matrix(angle, [0, 1, 0])
        facing = facing @ trimesh.transformations.rotation_matrix(tilt, [1, 0, 0])
        return centre @ facing @ translation(*(-np.asarray(anchor)))

    # Flip the circular shell around its centre; the bottom cover stays underneath.
    pedestal_flip = translation(y=-.0095) @ trimesh.transformations.rotation_matrix(np.pi, [0, 0, 1]) @ translation(y=.0095)

    def part(name, material=body, transform=None, pedestal=False):
        vertices, normals = parts[name]
        mesh = trimesh.Trimesh(vertices=vertices, faces=np.arange(len(vertices)).reshape(-1, 3), vertex_normals=normals, process=False)
        mesh.visual = TextureVisuals(material=material)
        # Share identical vertices only when their normals also match: retain CAD edges.
        mesh.merge_vertices(merge_tex=False, merge_norm=False)
        if transform is not None:
            mesh.apply_transform(transform)
        if pedestal:
            mesh.apply_transform(pedestal_flip)
        scene.add_geometry(mesh, node_name=name, geom_name=name)
        manifest.append({"part": name, "triangles": len(mesh.faces), "bounds_m": mesh.bounds.tolist()})

    part("Cuerpo")
    part("Base_Cuadrada")
    part("Cuerpo_Base")
    part("Base_Circular_V2", material=base, transform=translation(y=-.019), pedestal=True)
    part("Base+rodameinto", material=base, transform=translation(x=-.009806, y=-.010))
    lid = translation(y=-.019) @ trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])
    part("Tapa_Inferior_Base", material=base, transform=lid)
    # Shell CAD: large opening at +22.5 degrees, 64 mm tangent radius;
    # small opening at -22.5 degrees, 64.5303 mm radius (after the shell flip).
    # Use the rear of each front flange as its mounting anchor, not its bbox centre.
    usb_mount = radial_mount(-np.pi / 8, .0645303, [-.035115438, .010517695, .018])
    switch_mount = radial_mount(np.pi / 8, .064, [0, .0085, 0], tilt=np.pi / 2)
    part("USB Type-C", material=metal, transform=usb_mount)
    part("Interruptor", material=switch, transform=switch_mount)
    for i in range(4):
        material = PBRMaterial(name=f"BOX_PHOTO_{i + 1}", baseColorFactor=[255] * 4,
            baseColorTexture=Image.new("RGBA", (2, 2), (232, 228, 215, 255)),
            normalTexture=Image.new("RGB", (2, 2), (128, 128, 255)),
            emissiveTexture=Image.new("RGB", (2, 2), (0, 0, 0)),
            emissiveFactor=[1, 1, 1], metallicFactor=0, roughnessFactor=.93, doubleSided=True)
        vertices = [[-.05, .0165, .060], [.05, .0165, .060], [.05, .1165, .060], [-.05, .1165, .060]]
        mesh = trimesh.Trimesh(vertices=vertices, faces=[[0, 1, 2], [0, 2, 3]], process=False)
        mesh.visual = TextureVisuals(uv=[[0, 1], [1, 1], [1, 0], [0, 0]], material=material)
        mesh.apply_transform(trimesh.transformations.rotation_matrix(i * np.pi / 2, [0, 1, 0]))
        scene.add_geometry(mesh, node_name=f"photo-{i + 1}", geom_name=f"photo-{i + 1}")
    return scene.export(file_type="glb"), manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parts-dir", type=Path, required=True, help="Cuadrada directory containing Cuerpo and V2")
    parser.add_argument("--switch-part", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    data, parts = build(read_parts(args.parts_dir, args.switch_part))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(data)
    record = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "parts": parts}
    if args.manifest:
        args.manifest.write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(json.dumps({key: record[key] for key in ("bytes", "sha256")}))


if __name__ == "__main__":
    main()
