# TAKARA ERROR REGISTRY

Estado: CORE V1-R0I
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

### TK-WEB-006 - Warning de Git tratado como error por PowerShell

Sintoma: Quality Gate falla durante git diff --check aunque Git solo emite un warning y el exit code real es cero.

Causa: PowerShell puede tratar salida de error estandar de un proceso nativo como NativeCommandError si ErrorActionPreference esta en Stop.

Detector automatico: ejecutar Quality Gate en modo bootstrap y precommit despues de modificar tooling.

Prevencion: capturar salida de comandos nativos y decidir por LASTEXITCODE, no por la presencia de texto en stderr.

Estado: corregido en CORE V1-R0H-1R2.

### TK-WEB-007 - Reemplazo por bloque exacto no encuentra el objetivo

Sintoma: una fase intenta corregir un archivo buscando un bloque literal completo, no lo encuentra y aun asi el pegado continua ejecutando pasos posteriores.

Causa: el reemplazo dependia de saltos de linea y texto exacto. Si el archivo cambia minimamente, el bloque no coincide.

Detector automatico: validar que el contenido nuevo esperado existe antes de ejecutar el Quality Gate.

Prevencion: usar reemplazo por anclas de linea o parsing estructural, no Replace de bloques largos fragiles.

Estado: corregido en CORE V1-R0H-1R2.

### TK-WEB-008 - Quality Gate bloquea documentacion por mencionar marcadores prohibidos

Sintoma: un documento de contrato menciona un archivo o marcador prohibido para explicar que no debe usarse, y el Quality Gate lo bloquea como si estuviera en codigo productivo.

Causa: el escaneo de marcadores experimentales se aplicaba tambien a docs y tools.

Detector automatico: ejecutar Quality Gate despues de crear documentacion que enumera restricciones.

Prevencion: separar escaneo de encoding para todo el repo y escaneo de marcadores solo para archivos productivos.

Estado: corregido en CORE V1-R0I-1R.

### TK-WEB-009 - Foto obligatoria eludible mediante campos del payload

Sintoma: un POST manipulado puede omitir la fotografia y declarar un modo de
transporte, una bandera de presencia o un modo de prueba para que el servidor
acepte una solicitud incompleta.

Causa: la validacion del backend confiaba en campos enviados por el mismo
cliente que debia validar.

Detector automatico: prueba funcional que envia los tres bypasses conocidos y
exige que todos terminen con el error de foto ausente.

Prevencion: la foto original es obligatoria en servidor; se decodifica, se
limita por tamano real y se identifica por firma binaria antes de crear carpetas
en Drive.

Estado: corregido en CORE V1-R0I.

### TK-WEB-010 - Ficha visual acepta bytes arbitrarios declarados como JPEG

Sintoma: una ficha visual opcional con `image/jpeg` declarado puede llegar a
los correos aunque sus bytes correspondan a PNG, texto o un JPEG truncado.

Causa: el backend comprobaba el MIME y el tamano declarados por el cliente,
pero no verificaba la firma binaria completa antes de crear el blob.

Detector automatico: prueba adversaria permanente con JPEG real, PNG
disfrazado, texto, JPEG truncado, secuencia demasiado corta, MIME interno
incoherente, tamano declarado falso y Base64 sobredimensionado.

Prevencion: limitar el Base64 antes de decodificar, comparar el tamano binario
real y exigir marcadores JPEG de inicio y fin. Una ficha invalida se descarta
sin crear blob, sin adjuntarse a correos y sin bloquear el pedido principal.

Estado: corregido en Apps Script V1.12.1, pendiente de despliegue controlado.
