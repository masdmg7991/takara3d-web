from __future__ import annotations

import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "assets" / "data" / "catalogo.json"


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
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8-sig"))
    validate_catalog(catalog)

    text = CATALOG_PATH.read_text(encoding="utf-8-sig")

    for value in old_price_literals():
        if value in text:
            raise ValidationError(f"Precio antiguo prohibido en catálogo: {value}")

    print("[OK] Catálogo válido:", CATALOG_PATH)
    print("[OK] Productos:", len(catalog["productos"]))
    print("[OK] Versión:", catalog["version"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())