# TAKARA PREVIEW ENGINE CONTRACT

Estado: CORE V1-R0I
Proyecto: Takara3D Web
Objetivo: proteger el preview actual y definir el contrato de cualquier motor futuro.

---

## 1. Principio maestro

El preview ayuda a vender y a orientar al cliente, pero no sustituye la revision humana de la imagen.

El motor actual V16B-1 se considera protegido. No debe modificarse por accidente durante cambios de UI, estilos o arquitectura.

Cualquier cambio de motor debe hacerse como fase propia, con benchmark, comparacion visual y rollback preparado.

---

## 2. Motor actual protegido

Archivo protegido: assets/js/takara-pedido-preview.js

Marcador obligatorio: TAKARA PEDIDO PREVIEW LITHO REAL V16B-1

Hash protegido actual: 1DE7F09D5CCC6A8C5E3990B4AC1B59499B5160887F317A3D4DBABE91F32BA4F6

Controles obligatorios detectables:

- data-takara-litho-mode=on;
- data-takara-litho-mode=off.

El Quality Gate debe fallar si el hash protegido cambia sin fase aprobada.

---

## 3. Contrato de entrada

El preview debe recibir informacion suficiente para representar una litofania de forma orientativa:

- imagen del cliente;
- formato del producto;
- orientacion;
- modo encendido o apagado;
- contexto visual del marco si aplica.

La entrada debe ser explicita. No debe depender de datos fabricados ni de estados ocultos dificiles de auditar.

---

## 4. Contrato de salida

El preview debe devolver una representacion visual clara para el cliente.

La salida debe permitir:

- comparar encendida y apagada;
- entender que es una simulacion;
- no prometer resultado final exacto;
- mantener rendimiento aceptable en movil;
- degradar con elegancia si algo falla.

La salida no debe ocultar que Takara revisa la imagen antes de fabricar.

---

## 5. Reglas de integracion con UI

La UI puede envolver, mover o presentar el preview, pero no debe romper su contrato.

Reglas obligatorias:

- no editar el motor V16B-1 dentro de una fase de maquetacion;
- no sustituir el motor por un mock;
- no eliminar Encendida y Apagada;
- no duplicar scripts experimentales;
- no depender de takara-pedido-configurator.js;
- no acoplar el pedido a detalles internos del motor.

Si se cambia el contenedor visual, el Quality Gate debe seguir validando el motor protegido.

---

## 6. Motor futuro

Un motor futuro solo puede sustituir al actual si mejora de forma demostrable.

La sustitucion requiere:

- fase especifica aprobada;
- backup;
- comparacion visual contra V16B-1;
- pruebas en imagenes reales;
- prueba en movil;
- medicion de rendimiento;
- rollback documentado;
- commit separado.

El motor futuro debe tener una API limpia y estable para que la UI no dependa de detalles internos.

---

## 7. Arquitectura futura recomendada

La arquitectura objetivo para preview sera:

Order App -> Preview Bridge -> Preview Engine

Responsabilidades:

- Order App: recoge datos y muestra estado al cliente;
- Preview Bridge: traduce datos del pedido a entrada del motor;
- Preview Engine: renderiza sin conocer reglas comerciales;
- Quality Gate: protege contrato, hash y marcadores.

El bridge evita que el pedido quede pegado a la implementacion interna del motor.

---

## 8. Rendimiento

El preview debe ser fluido y no bloquear la pagina.

Criterios futuros:

- carga progresiva;
- evitar recalculos innecesarios;
- no renderizar si no hay imagen;
- usar requestAnimationFrame cuando proceda;
- valorar Worker u OffscreenCanvas solo si hay beneficio medido;
- no introducir WebAssembly sin benchmark real.

---

## 9. Fallos y degradacion

Si el preview falla, la pagina debe seguir siendo usable.

Comportamiento esperado:

- mensaje claro al cliente;
- no bloquear el formulario completo si la imagen puede enviarse para revision;
- no mostrar errores tecnicos crudos;
- registrar el fallo en desarrollo;
- permitir continuar como pendiente de revision cuando tenga sentido.

---

## 10. Criterio de aceptacion

El contrato estara cumplido cuando el preview pueda acompañar al pedido sin romper la venta, sin prometer exactitud absoluta y sin poner en riesgo el motor V16B-1.

Tambien estara cumplido cuando cualquier cambio futuro del motor pueda probarse, compararse, rechazarse o aprobarse de forma objetiva.
