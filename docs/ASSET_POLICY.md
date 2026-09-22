# Pol?tica de assets p?blicos

El repositorio p?blico contiene **assets de entrega**, no un archivo hist?rico
de originales de dise?o.

## Reglas

1. Un asset pesado debe tener un consumidor verificable en HTML, CSS, JavaScript
   o documentaci?n t?cnica necesaria.
2. Los masters, comparativas de trabajo, renders descartados y backups viven
   fuera del repositorio.
3. No se recomprime un asset usado s?lo para reducir bytes sin comprobar
   calidad visual y dimensiones.
4. Para fotograf?as p?blicas se prefiere WebP cuando no se pierde calidad
   relevante ni compatibilidad necesaria.
5. Los nombres deben describir el uso, no la sesi?n o fase que los cre?.
6. El Quality Gate bloquea im?genes grandes sin referencias conocidas.

## Umbrales

- A partir de 200 KiB, una imagen debe tener al menos un consumidor textual
  detectable dentro del repositorio.
- Ning?n asset individual debe superar 2,5 MB sin una decisi?n t?cnica
  documentada.

Los originales retirados del repo se conservan, cuando sea necesario, en el
archivo externo de backups y nunca dentro de Git.
