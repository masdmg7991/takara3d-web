# Takara Quality Gate

El Quality Gate es la frontera automática de calidad del repositorio.

Su objetivo no es sustituir la revisión humana, sino impedir que un cambio
rompa contratos conocidos, reintroduzca deuda ya cerrada o publique basura técnica.

## Modos

- `bootstrap`: validación durante la creación de cimientos.
- `dev`: iteración normal.
- `precommit`: certificación antes de crear un commit.
- `prepush`: certificación antes de publicar cambios.

Ejemplo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\takara_quality_gate.ps1 -Mode prepush
```

## Qué valida

El gate acumula comprobaciones de varias capas:

- estructura mínima del repositorio;
- encoding y ausencia de mojibake;
- archivos temporales o prohibidos;
- contratos del catálogo y datos estructurados;
- entrega, precio y pedido;
- seguridad de fotografía y ficha visual;
- preview protegido;
- Store Registry, Runtime, API pública y QR;
- Store Admin y branding;
- atribución DIRECT/STORE;
- transporte y ACK del pedido;
- auditoría del repositorio público;
- `git diff --check`;
- estado Git final.

Los tests y validadores individuales viven en `tools/` y el runner único es
`tools/takara_quality_gate.ps1`.

## Resultado

- `OK`: comprobación correcta.
- `WARN`: aviso no bloqueante.
- `ERROR`: fallo bloqueante.

El gate continúa tras fallos independientes para producir un diagnóstico completo,
pero devuelve un código de salida distinto de cero si existe cualquier `ERROR`.

## Informes

Los informes siempre se escriben fuera del repositorio.

Por defecto:

`Desktop/takara3d-backups/quality_reports`

En CI puede definirse `TAKARA_QUALITY_REPORT_ROOT` para elegir otra ubicación.

## Integración continua

`.github/workflows/quality-gate.yml` ejecuta el modo `prepush` en:

- `push` a `main`;
- `pull_request`;
- ejecución manual (`workflow_dispatch`).

El workflow usa un runner Windows, prepara Python y Node, ejecuta el mismo gate
que se utiliza localmente y conserva el informe como artefacto.

Esto evita mantener una segunda definición de calidad exclusiva para CI.

## Regla de evolución

Una comprobación nueva debe añadirse cuando protege un contrato estable o previene
la repetición de un fallo real. El gate no debe crecer con checks decorativos o
dependientes de detalles irrelevantes de implementación.

Cuando una autoridad cambia deliberadamente, deben actualizarse conjuntamente:

1. el contrato correspondiente;
2. la implementación;
3. las pruebas/validadores;
4. el Quality Gate si aplica.
