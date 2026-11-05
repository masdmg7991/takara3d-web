"""Reproduce the vertical back-plate shading repair from the preserved CAD export."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]
MODEL = "assets/models/marco/vertical.glb"
SOURCE_REF = "9f24dfebaf20a89722c88693cb77dae6f5f57b8a"
SOURCE_SHA256 = "903bbd8ce6ffdc6f44eb0d248829d7a8ce83b89b8a069864f361c6dcfd350e33"
RESULT_SHA256 = "b9924227d15439f2d6f863226036bdfaf4ddafa701619a07d14da3e82f92eb9b"
TARGET = "Tapa_Trasera_Vertical_Plancha-2-solid1"


def read_glb(data):
    magic, version, length = struct.unpack_from("<III", data)
    assert (magic, version, length) == (0x46546C67, 2, len(data)), "Invalid GLB"
    size, kind = struct.unpack_from("<II", data, 12)
    assert kind == 0x4E4F534A
    model = json.loads(data[20:20 + size])
    binary_size, kind = struct.unpack_from("<II", data, 20 + size)
    assert kind == 0x004E4942 and 28 + size + binary_size == len(data)
    return model, data[28 + size:]


def view_bytes(model, binary, view_index):
    view = model["bufferViews"][view_index]
    start = view.get("byteOffset", 0)
    return binary[start:start + view["byteLength"]]


def original_bytes():
    return subprocess.check_output(["git", "show", f"{SOURCE_REF}:{MODEL}"], cwd=ROOT)


def repair(source):
    assert hashlib.sha256(source).hexdigest() == SOURCE_SHA256, "Unexpected source model"
    model, binary = read_glb(source)
    mesh = next(mesh for mesh in model["meshes"] if mesh["name"] == TARGET)
    assert len(mesh["primitives"]) == 1
    primitive = mesh["primitives"][0]
    assert primitive.get("mode", 4) == 4
    assert model["materials"][primitive["material"]]["name"] == "FRAME_BACK_BLACK"
    assert set(primitive["attributes"]) == {"POSITION", "NORMAL"}
    position_id = primitive["attributes"]["POSITION"]
    normal_id = primitive["attributes"]["NORMAL"]
    index_id = primitive["indices"]
    accessors = model["accessors"]
    view_ids = [accessors[i]["bufferView"] for i in (position_id, normal_id, index_id)]
    for view_id in view_ids:
        assert sum(a.get("bufferView") == view_id for a in accessors) == 1
        assert "byteStride" not in model["bufferViews"][view_id]
    assert all(accessors[i].get("byteOffset", 0) == 0 for i in (position_id, normal_id, index_id))
    assert accessors[position_id]["componentType"] == accessors[normal_id]["componentType"] == 5126
    assert accessors[index_id]["componentType"] == 5123
    positions = list(struct.iter_unpack("<3f", view_bytes(model, binary, view_ids[0])))
    indices = struct.unpack(f"<{accessors[index_id]['count']}H", view_bytes(model, binary, view_ids[2]))
    flat_positions, flat_normals = bytearray(), bytearray()
    # Split shared vertices so each triangle keeps its own geometric normal.
    # Positions, triangle order/winding, cutouts and every other mesh stay intact.
    for offset in range(0, len(indices), 3):
        triangle = [positions[i] for i in indices[offset:offset + 3]]
        u = [triangle[1][j] - triangle[0][j] for j in range(3)]
        v = [triangle[2][j] - triangle[0][j] for j in range(3)]
        normal = [u[1]*v[2] - u[2]*v[1], u[2]*v[0] - u[0]*v[2], u[0]*v[1] - u[1]*v[0]]
        length = math.sqrt(sum(value*value for value in normal))
        assert length > 0, "Degenerate back-plate triangle"
        normal = [value / length for value in normal]
        for vertex in triangle:
            flat_positions.extend(struct.pack("<3f", *vertex))
            flat_normals.extend(struct.pack("<3f", *normal))
    replacements = dict(zip(view_ids, (
        bytes(flat_positions), bytes(flat_normals), struct.pack(f"<{len(indices)}H", *range(len(indices)))
    )))
    for accessor_id in (position_id, normal_id):
        accessors[accessor_id]["count"] = len(indices)
    rebuilt = bytearray()
    for view_id, view in enumerate(model["bufferViews"]):
        rebuilt.extend(b"\0" * (-len(rebuilt) % 4))
        data = replacements.get(view_id, view_bytes(model, binary, view_id))
        view["byteOffset"], view["byteLength"] = len(rebuilt), len(data)
        rebuilt.extend(data)
    model["buffers"][0]["byteLength"] = len(rebuilt)
    rebuilt.extend(b"\0" * (-len(rebuilt) % 4))
    metadata = json.dumps(model, separators=(",", ":"), ensure_ascii=False).encode()
    metadata += b" " * (-len(metadata) % 4)
    result = (struct.pack("<III", 0x46546C67, 2, 28 + len(metadata) + len(rebuilt))
              + struct.pack("<II", len(metadata), 0x4E4F534A) + metadata
              + struct.pack("<II", len(rebuilt), 0x004E4942) + rebuilt)
    assert hashlib.sha256(result).hexdigest() == RESULT_SHA256, "Unexpected repair output"
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    args.output.write_bytes(repair(original_bytes()))
    print("TAKARA_VERTICAL_NORMALS_REPAIRED " + RESULT_SHA256)


if __name__ == "__main__":
    main()
