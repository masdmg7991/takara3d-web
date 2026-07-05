# TAKARA ORDER ENGINE CONTRACT

Estado: CORE V1-R0H
Proyecto: Takara3D Web
Objetivo: definir el contrato funcional del pedido web antes de tocar UI o logica nueva.

---

## 1. Principio maestro

El pedido web debe convertir una intencion de compra en un correo estructurado, claro y accionable.

WhatsApp queda para dudas, trato humano, seguimiento y casos especiales. El pedido formal debe entrar por Gmail.

No se acepta una solucion improvisada tipo mailto como sistema profesional final.

---

## 2. Alcance del motor de pedido

El motor de pedido debe gestionar:

- producto seleccionado;
- formato;
- orientacion;
- imagen del cliente;
- texto personalizado si aplica;
- cantidad;
- datos de contacto;
- observaciones;
- consentimiento basico;
- resumen final;
- envio estructurado por Gmail.

El motor no debe fabricar datos que el cliente no haya dado.

---

## 3. Datos minimos obligatorios

Un pedido no debe considerarse completo sin:

- nombre del cliente;
- email o telefono de contacto;
- producto;
- formato;
- imagen aportada o instruccion clara sobre como aportarla;
- aceptacion de que la imagen sera revisada antes de fabricar;
- confirmacion de que Takara puede contactar para validar el pedido.

Si falta un dato critico, el sistema debe bloquear el envio o marcar el pedido como incompleto.

---

## 4. Datos recomendados

Datos utiles pero no siempre obligatorios:

- telefono;
- preferencia de contacto;
- fecha deseada;
- si es para entrega local o envio;
- direccion solo cuando sea necesaria;
- frase personalizada;
- notas sobre recorte o personas importantes en la foto;
- color o acabado si el producto lo permite.

La direccion completa no debe pedirse antes de ser necesaria.

---

## 5. Validaciones

Validaciones minimas:

- email con formato razonable si se aporta email;
- telefono con longitud razonable si se aporta telefono;
- producto existente en catalogo;
- formato compatible con producto;
- cantidad mayor o igual a uno;
- texto personalizado dentro de limite;
- imagen presente o pendiente declarada;
- consentimiento basico marcado.

La validacion debe ser clara para el cliente, sin mensajes tecnicos.

---

## 6. Resumen del pedido

Antes de enviar, el cliente debe ver un resumen con:

- producto;
- formato;
- precio base si aplica;
- extras si aplica;
- imagen o estado de imagen pendiente;
- datos de contacto;
- aviso de revision humana antes de fabricar.

El resumen debe coincidir con lo que se envia por Gmail.

---

## 7. Correo estructurado

El correo de pedido debe tener asunto claro y cuerpo estructurado.

Asunto recomendado:

Pedido Takara3D - producto - nombre cliente

Bloques minimos del cuerpo:

- identificacion del pedido web;
- datos del cliente;
- producto y formato;
- personalizacion;
- imagen;
- precio o estado pendiente de confirmar;
- observaciones;
- consentimiento;
- fecha y origen web.

El correo debe permitir trabajar el pedido sin tener que reconstruir informacion desde mensajes sueltos.

---

## 8. Estados del pedido

Estados previstos:

- borrador local;
- pendiente de imagen;
- listo para enviar;
- enviado por web;
- pendiente de revision humana;
- aceptado para fabricacion;
- requiere aclaracion.

La web publica solo necesita mostrar estados utiles para el cliente. Los estados internos pueden quedar para backend de produccion futuro o gestion posterior.

---

## 9. Contrato con catalogo

El pedido no debe inventar productos ni precios fuera de catalogo.

El catalogo debe actuar como fuente de verdad para:

- productos disponibles;
- formatos;
- precios base;
- extras;
- productos proximamente;
- restricciones.

Si un producto esta marcado como proximamente, no debe entrar como pedido normal.

---

## 10. Contrato con preview

El pedido puede usar preview para ayudar a decidir, pero el preview no sustituye la revision humana.

El pedido no debe romper el motor V16B-1 ni acoplarse de forma fragil a su implementacion interna.

Cualquier motor futuro debe mantener un contrato estable de entrada y salida.

---

## 11. Limites

El pedido web no debe:

- prometer fabricacion automatica sin revision;
- aceptar imagenes sin opcion de revision;
- enviar pedidos incompletos como si fueran completos;
- depender de WhatsApp como canal principal de pedido;
- duplicar logica de catalogo en HTML;
- ocultar al cliente que puede requerirse confirmacion humana.

---

## 12. Criterio de aceptacion

El contrato estara cumplido cuando un cliente pueda preparar un pedido claro, revisable y enviable por Gmail, sin depender de conversaciones dispersas por WhatsApp.

Tambien estara cumplido cuando Takara pueda recibir el pedido con datos suficientes para revisar imagen, confirmar precio, resolver dudas y fabricar sin perder informacion.
