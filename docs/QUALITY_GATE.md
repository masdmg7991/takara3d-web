# TAKARA QUALITY GATE

Estado: CORE V1-R0C
Proyecto: Takara3D Web
Objetivo: que el repo revise al repo en cada iteracion.

---

## 1. Principio maestro

Cada fase debe terminar con una validacion automatica clara.

El Quality Gate no sustituye la revision humana, pero reduce errores repetidos y evita subir basura tecnica.

---

## 2. Modos

- bootstrap: usado mientras se crean los cimientos del repo.
- dev: usado durante iteraciones normales.
- precommit: usado antes de preparar un commit.
- prepush: usado antes de publicar cambios.

---

## 3. Comprobaciones iniciales

El gate inicial comprueba:

- repo Git valido;
- documentos de arquitectura;
- preview V16B-1 protegido;
- Encendida y Apagada en preview;
- pedido.html carga el preview correcto;
- pedido.html no carga configurador experimental;
- mojibake;
- archivos temporales prohibidos;
- marcadores experimentales conocidos;
- catalogo;
- git diff --check;
- estado Git final.

---

## 4. Logs

Formato obligatorio:

- OK para comprobaciones correctas.
- WARN para avisos no bloqueantes.
- ERROR para fallos bloqueantes.

Un script no debe seguir como si todo estuviera bien despues de un ERROR real.

---

## 5. Informes

Los informes se guardan fuera del repo para no ensuciar Git.

Ruta prevista: Desktop/takara3d-backups/quality_reports.

---

## 6. Evolucion futura

Cuando exista stack moderno, el gate incorporara lint, test, build, Playwright y Lighthouse.
