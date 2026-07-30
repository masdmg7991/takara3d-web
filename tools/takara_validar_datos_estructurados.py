from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://takara3d.es"
EXPECTED_IMAGES = {
    "Marco vertical de litofanía personalizado": (
        f"{SITE_ORIGIN}/assets/img/fotos/"
        "producto-marco-vertical-familia-card-v18.webp"
    ),
    "Marco horizontal de litofanía personalizado": (
        f"{SITE_ORIGIN}/assets/img/fotos/"
        "producto-marco-horizontal-mascota.webp"
    ),
    "Marco de litofanía personalizado Takara3D": (
        f"{SITE_ORIGIN}/assets/img/fotos/"
        "producto-marco-vertical-familia-card-v18.webp",
        f"{SITE_ORIGIN}/assets/img/fotos/"
        "producto-marco-horizontal-mascota.webp",
    ),
}
JSON_LD_PATTERN = re.compile(
    r'<script\s+type=["\']application/ld\+json["\']\s*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)


class ContractError(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)
    print(f"[OK] {message}")


def read_json_ld(relative_path: str) -> list[object]:
    path = ROOT / relative_path
    require(path.is_file(), f"Existe {relative_path}")
    source = path.read_text(encoding="utf-8-sig")
    blocks = JSON_LD_PATTERN.findall(source)
    require(bool(blocks), f"{relative_path} contiene JSON-LD")

    documents: list[object] = []
    for index, block in enumerate(blocks, start=1):
        try:
            documents.append(json.loads(block))
        except json.JSONDecodeError as error:
            raise ContractError(
                f"JSON-LD inválido en {relative_path}, bloque {index}: {error}"
            ) from error
    return documents


def walk_nodes(value: object):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk_nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_nodes(child)


def product_nodes(relative_path: str) -> list[dict]:
    products: list[dict] = []
    for document in read_json_ld(relative_path):
        for node in walk_nodes(document):
            if node.get("@type") == "Product":
                products.append(node)
    return products


def normalize_images(value: object) -> tuple[str, ...]:
    if isinstance(value, str):
        return (value,)
    if isinstance(value, list) and all(isinstance(item, str) for item in value):
        return tuple(value)
    raise ContractError("El campo image debe ser una URL o una lista de URLs.")


def validate_local_image(url: str) -> None:
    parsed = urlparse(url)
    require(
        f"{parsed.scheme}://{parsed.netloc}" == SITE_ORIGIN,
        f"Imagen usa origen HTTPS Takara3D: {url}",
    )
    relative = parsed.path.lstrip("/")
    path = ROOT / relative
    require(path.is_file(), f"Existe la imagen declarada: {relative}")
    require(path.stat().st_size > 0, f"Imagen no vacía: {relative}")


def validate_product(product: dict) -> None:
    name = product.get("name")
    require(name in EXPECTED_IMAGES, f"Producto reconocido: {name}")

    images = normalize_images(product.get("image"))
    expected = EXPECTED_IMAGES[name]
    expected_images = (expected,) if isinstance(expected, str) else expected
    require(images == expected_images, f"{name} usa sus imágenes contractuales")
    for image in images:
        validate_local_image(image)

    offers = product.get("offers")
    require(isinstance(offers, dict), f"{name} contiene Offer")
    require(offers.get("@type") == "Offer", f"{name} declara @type Offer")
    require(str(offers.get("price")) == "35.00", f"{name} conserva precio 35.00")
    require(offers.get("priceCurrency") == "EUR", f"{name} conserva moneda EUR")
    require(
        offers.get("availability") == "https://schema.org/InStock",
        f"{name} conserva disponibilidad InStock",
    )

    for unsupported in (
        "shippingDetails",
        "hasMerchantReturnPolicy",
        "review",
        "aggregateRating",
    ):
        require(
            unsupported not in offers and unsupported not in product,
            f"{name} no inventa {unsupported}",
        )


def main() -> int:
    products = product_nodes("productos.html") + product_nodes("pedido.html")
    require(len(products) == 3, "Se detectan exactamente tres entidades Product")

    names = [product.get("name") for product in products]
    require(len(set(names)) == 3, "Las tres entidades Product son distintas")
    require(set(names) == set(EXPECTED_IMAGES), "No falta ningún Product contractual")

    for product in products:
        validate_product(product)

    print("[TAKARA_STRUCTURED_DATA_CONTRACT_OK]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
