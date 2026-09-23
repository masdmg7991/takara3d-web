# Herramientas de calidad

`tools/` contiene la automatización que demuestra que el repositorio conserva
sus contratos. No es una carpeta de scripts temporales.

## Entrada principal

- `takara_quality_gate.ps1`: runner único de calidad.

El Quality Gate acumula errores independientes y devuelve código distinto de
cero si existe cualquier fallo bloqueante.

## Convención de nombres

- `takara_test_*.js`: pruebas funcionales ejecutables con Node.
- `takara_validar_*.py`: validadores estáticos o contractuales en Python.
- `takara_validar_*.ps1`: validadores que necesitan PowerShell/Windows.
- `validar_catalogo.py`: autoridad de validación del catálogo público.
- `takara_public_repo_audit.ps1`: auditoría de material publicable.

Un script que no encaje en una categoría debe justificar por qué pertenece al
repositorio antes de añadirse.

## Regla de ejecución

Durante desarrollo se ejecutan primero las pruebas específicas del área
modificada. Antes de commit se ejecuta el Quality Gate completo.

```powershell
.\tools\takara_quality_gate.ps1 -Mode precommit
```

Antes de publicar:

```powershell
.\tools\takara_quality_gate.ps1 -Mode prepush
```

## Reglas para nuevos tests

1. Deben fallar si desaparece el contrato que protegen.
2. No deben validar únicamente una frase histórica si existe una autoridad
   estructurada mejor.
3. Los dobles de test deben reproducir sólo el puerto realmente consumido.
4. Un fallback deliberado debe comprobarse como derivado de su autoridad.
5. Las pruebas no deben escribir sobre producción ni depender de datos reales.

6. Una constante de version puede ser un marcador contractual aunque no se lea
   en runtime. Antes de eliminarla hay que revisar validadores estaticos y
   contratos que puedan comprobar su valor literal.

## Informes

Los informes del Quality Gate se escriben fuera del repositorio. Por defecto el runner
usa ../takara3d-backups/quality_reports, de modo que repo y evidencia quedan como
carpetas hermanas. En CI se usa TAKARA_QUALITY_REPORT_ROOT.
