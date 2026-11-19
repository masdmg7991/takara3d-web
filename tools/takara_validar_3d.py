"""Guard the new architecture and the approved GLB identities."""
from pathlib import Path
import hashlib
import json
import re
import struct
from takara_validar_vertical_back import validate as validate_vertical_back

ROOT = Path(__file__).resolve().parents[1]


def glb_json(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', raw)
    assert magic == 0x46546C67 and version == 2 and length == len(raw), f'Invalid GLB: {path.name}'
    json_length, json_type = struct.unpack_from('<II', raw, 12)
    assert json_type == 0x4E4F534A, f'GLB JSON missing: {path.name}'
    return json.loads(raw[20:20 + json_length])


def primitive_signature(doc):
    return [
        (primitive.get('material'),
         doc['accessors'][primitive['indices']]['count'] if 'indices' in primitive else 0,
         doc['accessors'][primitive['attributes']['POSITION']]['count'])
        for mesh in doc['meshes'] for primitive in mesh['primitives']
    ]


def main():
    page = (ROOT / 'pedido.html').read_text(encoding='utf-8-sig')
    core = (ROOT / 'assets/js/3d/product-viewer.js').read_text(encoding='utf-8-sig')
    for word in ('MARCO', 'Lithophane', 'FrameText', 'personalizacion', 'precio'):
        assert word not in core, f'Core contains product/business knowledge: {word}'
    for old in ('takara-pedido-preview.js', 'takara-frame-text.js', '3d/frame-viewer.js'):
        assert not (ROOT / 'assets/js' / old).exists(), f'Obsolete renderer retained: {old}'
    assert 'data-takara-preview-canvas' not in page
    assert 'data-takara-frame-text-overlay' not in page
    assert len(re.findall(r'<script[^>]*src="assets/js/3d/order-preview.js', page)) == 1
    assert 'data-takara-product-stage' in page
    assert 'data-takara-product-status' in page and 'data-takara-product-retry' in page
    order = (ROOT / 'assets/js/takara-pedido-web.js').read_text(encoding='utf-8-sig')
    assert 'preview.capture(expectedPhoto)' in order
    for old in ('sourceCanvas', 'createOverlayImage', 'waitForPreviewPhoto'):
        assert old not in order, f'Order retains old capture: {old}'
    expected = {
        'vertical': 'b9924227d15439f2d6f863226036bdfaf4ddafa701619a07d14da3e82f92eb9b',
        'horizontal': '3bd9650529315713deb88b0aa9998c6ad52a0348fcee503f978e88cc97c6fba8',
    }
    for variant, digest in expected.items():
        model = ROOT / f'assets/models/marco/{variant}.glb'
        assert hashlib.sha256(model.read_bytes()).hexdigest() == digest, f'Approved model changed: {variant}'
    compact_expected = {
        'vertical': 'c09ce873c49556195fd97d40f34f2adc5a474312d7a704604c9aac96602e3460',
        'horizontal': 'fc941edd2975eda9853fdf5a7ad80a12b33f00f86dc1165ae6994c81789fefb1',
    }
    for variant, digest in compact_expected.items():
        source = glb_json(ROOT / f'assets/models/marco/{variant}.glb')
        compact_path = ROOT / f'assets/models/marco/{variant}-compact.glb'
        assert hashlib.sha256(compact_path.read_bytes()).hexdigest() == digest, f'Compact model changed: {variant}'
        compact = glb_json(compact_path)
        assert 'KHR_mesh_quantization' in compact.get('extensionsRequired', []), f'Quantization missing: {variant}'
        for key in ('materials', 'meshes', 'nodes'):
            assert [item.get('name') for item in source[key]] == [item.get('name') for item in compact[key]], f'{key} changed: {variant}'
        assert primitive_signature(source) == primitive_signature(compact), f'Topology changed: {variant}'
    validate_vertical_back()
    assert (ROOT / 'assets/vendor/model-viewer/LICENSE').is_file()
    vendor = ROOT / 'assets/vendor/model-viewer'
    manifest = json.loads((vendor / 'INTEGRITY.json').read_text(encoding='utf-8'))
    assert manifest['version'] == '4.4.0'
    for filename, record in manifest['files'].items():
        data = (vendor / filename).read_bytes()
        assert len(data) == record['bytes'], f'Vendor size changed: {filename}'
        assert hashlib.sha256(data).hexdigest() == record['sha256'], f'Vendor changed: {filename}'
    print('TAKARA_3D_ARCHITECTURE_OK: one renderer, approved source GLBs, compact derivatives, real capture')


if __name__ == '__main__':
    main()
