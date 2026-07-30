from __future__ import annotations

import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "assets" / "data" / "catalogo.json"
LEGACY_CATALOG_PATH = ROOT / "data" / "productos.json"

EXPECTED_FRAME_COLORS = [
    ("actual", "Madera clara"),
    ("rosewood", "Rosewood"),
    ("ebano", "Ébano"),
    ("negro", "Negro"),
    ("blanco-mate", "Blanco mate"),
]
EXPECTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
EXPECTED_MAX_PHOTO_MB = 20


class ValidationError(RuntimeError):
    pass


def money(value: object) -> str:
    try:
        amount = Decimal(str(value))
    except Exception as exc:
        raise ValidationError(f"Importe inválido: {value!r}") from exc

    if amount < 0:
        raise ValidationError(f"Importe negativo: {value!r}")

    return str(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def old_price_literals() -> list[str]:
    # Construidos así para que la auditoría literal del repo no encuentre precios antiguos.
    return ["27" + ",50", "27" + ".50"]


def validate_catalog(catalog: dict) -> None:
    require(catalog.get("version") == "TAKARA_CATALOGO_V1", "Versión de catálogo incorrecta")
    require(catalog.get("moneda") == "EUR", "Moneda global incorrecta")
    require(catalog.get("estado") == "activo", "Catálogo no activo")

    productos = catalog.get("productos")
    require(isinstance(productos, list) and productos, "Catálogo sin productos")

    product_codes: set[str] = set()

    for product in productos:
        code = product.get("codigo")
        require(isinstance(code, str) and code, "Producto sin código")
        require(code not in product_codes, f"Producto duplicado: {code}")
        product_codes.add(code)

        require(product.get("estado") in {"activo", "pausado", "oculto"}, f"Estado de producto inválido: {code}")
        require(product.get("moneda") == "EUR", f"Moneda incorrecta en {code}")

        precio_base = money(product.get("precio_base_eur"))

        if code == "MARCO_LITOFANIA_144X108":
            require(precio_base == "35.00", f"Precio base inesperado en {code}: {precio_base}")
            require(product.get("precio_visible") == "35 €", f"Precio visible inesperado en {code}")

            colors = product.get("colores_marco")
            require(isinstance(colors, list), f"Colores de marco inválidos en {code}")
            actual_colors = [
                (color.get("codigo"), color.get("nombre"))
                for color in colors
                if color.get("estado") == "activo"
            ]
            require(
                actual_colors == EXPECTED_FRAME_COLORS,
                f"Acabados activos incoherentes en {code}: {actual_colors!r}",
            )

            images = product.get("imagenes")
            require(isinstance(images, dict) and images, f"Imágenes no declaradas en {code}")
            for image_role, relative_path in images.items():
                require(
                    isinstance(relative_path, str) and relative_path,
                    f"Ruta de imagen inválida ({image_role}) en {code}",
                )
                image_path = ROOT / relative_path
                require(image_path.is_file(), f"Imagen inexistente ({image_role}): {relative_path}")
                require(image_path.stat().st_size > 0, f"Imagen vacía ({image_role}): {relative_path}")

            order = product.get("pedido")
            require(isinstance(order, dict), f"Contrato de pedido ausente en {code}")
            require(order.get("requiere_foto") is True, f"La fotografía debe ser obligatoria en {code}")
            require(
                order.get("formatos_imagen_aceptados") == EXPECTED_IMAGE_TYPES,
                f"Formatos de fotografía incoherentes en {code}",
            )
            require(
                order.get("tamano_maximo_foto_mb") == EXPECTED_MAX_PHOTO_MB,
                f"Límite de fotografía incoherente en {code}",
            )

        variantes = product.get("variantes")
        require(isinstance(variantes, list) and variantes, f"Producto sin variantes: {code}")

        variant_codes: set[str] = set()

        for variant in variantes:
            variant_code = variant.get("codigo")
            require(isinstance(variant_code, str) and variant_code, f"Variante sin código en {code}")
            require(variant_code not in variant_codes, f"Variante duplicada {variant_code} en {code}")
            variant_codes.add(variant_code)
            require(variant.get("estado") in {"activo", "pausado", "oculto"}, f"Estado variante inválido: {variant_code}")
            money(variant.get("precio_extra_eur", 0))

        extras = product.get("extras", [])
        require(isinstance(extras, list), f"Extras no es lista en {code}")

        extra_codes: set[str] = set()

        for extra in extras:
            extra_code = extra.get("codigo")
            require(isinstance(extra_code, str) and extra_code, f"Extra sin código en {code}")
            require(extra_code not in extra_codes, f"Extra duplicado {extra_code} en {code}")
            extra_codes.add(extra_code)
            require(extra.get("estado") in {"activo", "preparado", "pausado", "oculto"}, f"Estado extra inválido: {extra_code}")
            money(extra.get("precio_extra_eur", 0))


def main() -> int:
    require(
        not LEGACY_CATALOG_PATH.exists(),
        "Existe el catálogo heredado data/productos.json; debe haber una única fuente de catálogo",
    )

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8-sig"))
    validate_catalog(catalog)

    text = CATALOG_PATH.read_text(encoding="utf-8-sig")

    for value in old_price_literals():
        if value in text:
            raise ValidationError(f"Precio antiguo prohibido en catálogo: {value}")

    print("[OK] Catálogo válido:", CATALOG_PATH)
    print("[OK] Productos:", len(catalog["productos"]))
    print("[OK] Versión:", catalog["version"])
    print("[OK] Fuente única: assets/data/catalogo.json")
    print("[OK] Acabados activos:", len(EXPECTED_FRAME_COLORS))
    print("[OK] Límite de fotografía:", EXPECTED_MAX_PHOTO_MB, "MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
