"""Verify the repair changes shading only, preserving the original CAD triangles."""
import math
import struct
from takara_repair_vertical_normals import (
    ROOT, MODEL, TARGET, original_bytes, read_glb, view_bytes, repair,
)


def validate():
    source = original_bytes()
    actual = (ROOT / MODEL).read_bytes()
    assert actual == repair(source), "Vertical model differs from its reproducible repair"
    before, old_binary = read_glb(source)
    after, new_binary = read_glb(actual)
    for key in before:
        if key not in ("accessors", "buffers", "bufferViews"):
            assert before[key] == after[key], f"Model metadata changed: {key}"
    primitive = next(m for m in before["meshes"] if m["name"] == TARGET)["primitives"][0]
    position_id, normal_id, index_id = (
        primitive["attributes"]["POSITION"], primitive["attributes"]["NORMAL"], primitive["indices"]
    )
    edited_views = {before["accessors"][i]["bufferView"] for i in (position_id, normal_id, index_id)}
    assert len(before["bufferViews"]) == len(after["bufferViews"])
    for view_id in range(len(before["bufferViews"])):
        if view_id not in edited_views:
            assert view_bytes(before, old_binary, view_id) == view_bytes(after, new_binary, view_id), (
                f"Unrelated model data changed: bufferView {view_id}"
            )
    assert len(before["accessors"]) == len(after["accessors"])
    for accessor_id, old in enumerate(before["accessors"]):
        expected = dict(old)
        if accessor_id in (position_id, normal_id):
            expected["count"] = before["accessors"][index_id]["count"]
        assert expected == after["accessors"][accessor_id]

    def data(model, binary, accessor_id):
        return view_bytes(model, binary, model["accessors"][accessor_id]["bufferView"])

    old_points = list(struct.iter_unpack("<3f", data(before, old_binary, position_id)))
    old_indices = [i[0] for i in struct.iter_unpack("<H", data(before, old_binary, index_id))]
    points = list(struct.iter_unpack("<3f", data(after, new_binary, position_id)))
    normals = list(struct.iter_unpack("<3f", data(after, new_binary, normal_id)))
    indices = [i[0] for i in struct.iter_unpack("<H", data(after, new_binary, index_id))]
    assert indices == list(range(len(indices)))
    assert [old_points[i] for i in old_indices] == [points[i] for i in indices], (
        "Back-plate triangle positions/order/winding changed"
    )
    assert len(indices) // 3 == 1132
    for i in range(0, len(points), 3):
        p, q, r = points[i:i + 3]
        u, v = [q[j] - p[j] for j in range(3)], [r[j] - p[j] for j in range(3)]
        face = (u[1]*v[2] - u[2]*v[1], u[2]*v[0] - u[0]*v[2], u[0]*v[1] - u[1]*v[0])
        length = math.sqrt(sum(n*n for n in face))
        for normal in normals[i:i + 3]:
            assert abs(sum(n*n for n in normal) - 1) < 1e-6
            assert abs(sum(face[j]*normal[j] for j in range(3)) / length - 1) < 1e-6, (
                "Back-plate normal blends across an edge"
            )
    print("TAKARA_VERTICAL_BACK_OK: 1132 identical triangles; face normals; other meshes/materials/textures unchanged")


if __name__ == "__main__":
    validate()
