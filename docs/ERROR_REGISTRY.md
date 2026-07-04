# TAKARA ERROR REGISTRY

Estado: CORE V1-R0D
Proyecto: Takara3D Web
Objetivo: registrar errores reales, aprender de ellos y convertirlos en validaciones automaticas.

---

## 1. Principio maestro

Un error repetido debe convertirse en detector, regla o fase de preflight.

Este archivo no es decorativo. Sirve para evitar repetir fallos de ejecucion, escritura, consola, validacion y arquitectura.

---

## 2. Formato de registro

Cada error debe registrar:

- ID;
- sintoma;
- causa;
- detector automatico;
- prevencion;
- estado.

---

## 3. Errores registrados

### TK-WEB-001 - Bloques PowerShell largos cortados

Sintoma: PowerShell queda esperando con prompt secundario al cortarse un bloque de texto largo.

Causa: uso de documentos largos dentro de un unico bloque de escritura.

Detector automatico: evitar fases con documentos completos dentro de un unico bloque largo.

Prevencion: escribir documentos por lineas, en fases pequenas y reejecutables.

Estado: mitigado desde CORE V1-R0A-1.

### TK-WEB-002 - Mensajes OK despues de un error real

Sintoma: una consola pegada sigue ejecutando lineas y muestra mensajes OK despues de haber lanzado un error.

Causa: el pegado continua despues de un throw o de un fallo de script.

Detector automatico: en revision humana, cualquier ERROR previo invalida los OK posteriores de la misma ejecucion.

Prevencion: revisar el primer ERROR real, no el ultimo mensaje bonito.

Estado: regla activa.

### TK-WEB-003 - Detector de mojibake con patrones literales

Sintoma: el propio script de calidad es marcado como problematico por contener patrones literales de texto roto.

Causa: el detector incluia caracteres problematicos directamente dentro del archivo.

Detector automatico: el gate escanea su propio archivo.

Prevencion: construir patrones mediante codigos de caracter, no escribiendo los caracteres problematicos literalmente.

Estado: corregido en CORE V1-R0C-1R.

### TK-WEB-004 - StrictMode y propiedad Count en resultados no array

Sintoma: PowerShell falla indicando que no encuentra la propiedad Count.

Causa: una consulta puede devolver cero, uno o varios elementos; bajo StrictMode no siempre existe Count si no se fuerza array.

Detector automatico: revisar usos de Count sobre resultados de comandos.

Prevencion: envolver resultados en array con arroba y parentesis antes de usar Count.

Estado: corregido en CORE V1-R0C-1R.

### TK-WEB-005 - Codificacion fea en salida de consola Python

Sintoma: la salida del validador Python puede verse con caracteres raros en consola aunque el script pase.

Causa: diferencia entre codificacion de salida del proceso y codificacion de consola de Windows PowerShell.

Detector automatico: revisar logs de Quality Gate buscando caracteres de dibujo de caja o texto visualmente corrupto.

Prevencion: fase futura para normalizar salida de consola con codificacion UTF-8 controlada.

Estado: pendiente de mejora de logs.
