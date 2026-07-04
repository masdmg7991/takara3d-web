# TAKARA CLEANUP POLICY

Estado: CORE V1-R0E
Proyecto: Takara3D Web
Objetivo: definir como se limpia, revisa y consolida el repo despues de cada fase.

---

## 1. Principio maestro

Una fase no termina cuando visualmente parece bien.

Una fase termina cuando el cambio queda validado, revisable, sin basura tecnica y preparado para decidir si se itera o se consolida.

---

## 2. Limpieza obligatoria por fase

Al terminar cada fase debe revisarse:

- git status;
- git diff --check;
- diff entendible;
- archivos temporales;
- scripts auxiliares;
- backups dentro del repo;
- codigo muerto;
- CSS duplicado;
- JS experimental;
- console.log de pruebas;
- validaciones especificas de la fase.

---

## 3. Archivos prohibidos en repo

No deben quedar dentro del repo:

- _takara_*.ps1;
- *.tmp;
- *.bak;
- *.old;
- *.orig;
- *.rej;
- *.patch;
- backups locales;
- dist generado sin control;
- node_modules;
- capturas temporales;
- pruebas manuales sin documentar.

---

## 4. Backups

Los backups se guardan fuera del repo.

Ruta habitual: Desktop/takara3d-backups.

Un backup dentro del repo se considera basura tecnica.

---

## 5. Commit limpio

Antes de commit debe cumplirse:

1. Quality Gate sin errores.
2. Diff revisado.
3. Archivos concretos seleccionados.
4. Mensaje de commit claro.
5. Sin git add punto.

El commit no debe mezclar documentacion, build, UI y funcionalidad sin motivo.

---

## 6. Push controlado

El push solo se hace tras aprobacion explicita.

Antes de push debe ejecutarse Quality Gate en modo prepush cuando este disponible.

---

## 7. Regla de decision

Al cerrar una fase se decide una de estas opciones:

- iterar;
- corregir;
- consolidar;
- commit;
- push.

No se salta directamente a push desde una fase no validada.
