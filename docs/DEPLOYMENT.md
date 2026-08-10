# Despliegue Takara3D Web

## Estado actual

La web actual funciona como sitio estático publicado mediante GitHub Pages.

Repositorio local:

```text
<REPO_LOCAL>
```

Repositorio remoto:

```text
https://github.com/masdmg7991/takara3d-web.git
```

Web pública:

```text
https://takara3d.es/
```

## Regla de despliegue

No se hace push sin validación previa y aprobación explícita.

Antes de publicar:

- Revisar `git status --short`.
- Revisar `git diff --check`.
- Ejecutar quality gate si procede.
- Revisar diff de archivos concretos.
- No usar `git add .`.
- No subir temporales, backups, `.bak`, `.old` ni scripts experimentales.

## Archivos productivos protegidos

No modificar en fases documentales:

```text
index.html
productos.html
pedido.html
contacto.html
assets/css/styles.css
assets/js/takara-pedido-web.js
assets/js/takara-pedido-preview.js
```

## Apps Script

El backend ligero de pedidos/contacto está publicado en Google Apps Script.

Versión actualmente publicada:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_12_3_OPTIONAL_SHOWCASE_CONSENT
```

Candidato local en revisión, todavía no desplegado:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2
```

El candidato local integra `TAKARA_WEB_ORDER_PAYLOAD_V2`,
`TAKARA_ORDER_SNAPSHOT_V2`, `TAKARA_PEDIDO_WEB_V2` y
`TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC`. El correo técnico V2 ya ha sido
validado de forma cruzada contra el parser real de MicroFactory antes y después
de aplicar el candidato local. Mantiene cálculo automático por código postal y
el mapa compacto `TAKARA_POSTAL_NATIONAL_V1_2026_08_03`.
La localidad se completa automáticamente en 7.282 códigos, ofrece selector
nacional en 3.422 y mantiene entrada manual en 147 casos de revisión o códigos
sin cobertura. Las 13 reglas comerciales de Madrid Sur conservan prioridad
porque pueden modificar la tarifa. El servidor recalcula siempre la entrega y
el municipio nacional solo aporta información de ubicación. La versión pública
permanece en V1.12.3 hasta aprobar la interfaz local, validar el candidato y
realizar un despliegue manual controlado.

La comprobación GET debe validar el campo JSON `script` y no comparar la respuesta completa como texto plano.

## Commit y push

Commit recomendado para documentación:

```text
Documentar continuidad y despliegue Takara Web
```

No hacer push hasta revisar en local y confirmar que el diff solo contiene documentación.


## Puente de despliegue V1/V2

El candidato `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2`
acepta de forma temporal dos contratos de pedido: el V2 es la ruta primaria y
el V1 publicado se mantiene únicamente como compatibilidad de transición. Un
payload que declare V2 pero esté incompleto se rechaza y nunca se degrada a V1.

Esto permite el orden de despliegue seguro: primero actualizar la implementación
Apps Script activa conservando la misma URL; validar GET y un POST V2 en
`modo_prueba` sin Drive ni correo; después publicar la web V2. Durante esa ventana
el formulario público V1 continúa operativo. Tras confirmar la web V2 y la
ingesta real de MicroFactory, la compatibilidad V1 podrá retirarse en una fase
posterior explícita.
