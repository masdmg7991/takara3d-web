# Gobierno de GitHub

Estado: preparado localmente; activación remota pendiente de autorización de publicación.

## Objetivo

`main` debe representar código publicado y verificable. Ningún merge debe saltarse
el Quality Gate, y publicar código nunca debe equivaler a desplegar Apps Script.

## Autoridades

- Repositorio: `masdmg7991/takara3d-web`.
- Rama canónica: `main`.
- Workflow requerido: `Quality Gate`.
- Contrato de despliegue: `docs/DEPLOYMENT.md`.
- Política pública: `docs/PUBLIC_REPO_POLICY.md`.

## Estado deseado de `main`

Cuando W11 se active remotamente:

- cambios mediante pull request;
- `Quality Gate` obligatorio antes de merge;
- conversaciones de revisión resueltas;
- force-push deshabilitado;
- borrado de `main` deshabilitado;
- actualización de rama permitida cuando GitHub pueda hacerlo de forma segura;
- CODEOWNERS usado como routing de ownership;
- aprobación obligatoria de CODEOWNER desactivada mientras sólo exista un mantenedor.

Exigir aprobación de CODEOWNER con un único mantenedor podría bloquear cambios propios
sin aportar una segunda revisión real. Esa opción sólo debe activarse cuando exista
otro revisor autorizado.

## Workflow CI

El workflow:

- se ejecuta en pull requests hacia `main`;
- se ejecuta también cuando `main` cambia;
- usa permisos `contents: read`;
- no persiste credenciales Git tras checkout;
- no consume secretos;
- ejecuta el Quality Gate en modo `prepush`;
- conserva el reporte como artefacto durante un periodo limitado;
- no hace push, release, deploy ni mutación de Apps Script.

## Secuencia de activación remota

Tras autorización explícita de publicación:

1. publicar la rama candidata, no `main` directamente;
2. abrir PR contra `main`;
3. verificar una ejecución real del workflow `Quality Gate`;
4. activar protección de `main` usando el check real ya existente;
5. verificar que force-push y borrado están bloqueados;
6. hacer merge sólo con CI GREEN;
7. tratar cualquier deploy de Apps Script como operación distinta y posterior.

## Merge

Preferencia: squash merge para una historia pública compacta cuando el PR represente
una unidad coherente. Merge commit o rebase sólo cuando exista una razón técnica.

## Separación publicación / deploy

Un push o merge puede publicar archivos de GitHub Pages. No cambia automáticamente
el deployment de Apps Script. El backend LIVE sólo cambia mediante una promoción
explícita y verificada según `docs/DEPLOYMENT.md`.

## Regla de seguridad

El gobierno remoto nunca debe habilitarse parcialmente de forma que `main` parezca
protegida sin tener un Quality Gate real disponible. Primero se demuestra el check;
después se convierte en obligatorio.
