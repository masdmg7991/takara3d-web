# Contribuir a Takara 3D Web

El objetivo del repositorio es que cada cambio sea pequeño, explicable,
reproducible y verificable.

## Principios

1. **Conservar comportamiento antes de refactorizar.**
2. **Una fuente de verdad por responsabilidad.**
3. **Frontend no autoritativo para datos que el backend puede recalcular.**
4. **Fail-closed en identidad, permisos y contratos críticos.**
5. **Tests y documentación acompañan al contrato, no lo sustituyen.**
6. **Nada entra en `main` si el Quality Gate está rojo.**

## Antes de cambiar código

```powershell
git status --short
git diff --check
```

El árbol debe estar limpio o los cambios existentes deben estar entendidos y
delimitados.

## Durante el cambio

- Evitar reescrituras masivas sin necesidad.
- Separar refactorización de cambios funcionales.
- No duplicar una autoridad existente.
- Añadir o actualizar pruebas cuando cambia un contrato.
- No introducir secretos, datos privados ni artefactos locales.
- Mantener compatibilidad deliberada sólo cuando tenga consumidor conocido.

## Validación

Ejecutar primero las pruebas específicas y después:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\takara_quality_gate.ps1 -Mode precommit
```

Antes de publicar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\takara_quality_gate.ps1 -Mode prepush
```

Además:

```powershell
git diff --check
git status --short
```

## Commits

Un commit debe representar una responsabilidad coherente.

Buenos ejemplos:

- `Separa validación de Store del adaptador Sheets`
- `Centraliza autoridad del endpoint público`
- `Añade cobertura de idempotencia del pedido`

Evitar commits que mezclen limpieza, UI, documentación y comportamiento sin una
razón causal común.

## Pull requests

Una revisión debe poder responder rápidamente:

- qué cambia;
- por qué cambia;
- qué contrato protege;
- qué pruebas lo demuestran;
- qué riesgo queda fuera del alcance.

## Publicación

El repositorio y el despliegue son operaciones diferentes. Que un cambio esté
en GitHub no implica que deba desplegarse el backend.

Las reglas de publicación viven en `docs/DEPLOYMENT.md`.
