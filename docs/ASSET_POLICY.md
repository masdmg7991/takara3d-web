# Política de assets públicos

El repositorio público contiene **assets de entrega**, no un archivo histórico
de originales de diseño.

## Reglas

1. Un asset pesado público debe tener un consumidor verificable de runtime web:
   HTML, CSS, JavaScript, JSON o XML. Una mención documental o de test no basta
   para justificar que el binario permanezca en `assets/`.
2. Los masters, comparativas de trabajo, renders descartados y backups viven
   fuera del repositorio.
3. No se recomprime un asset usado sólo para reducir bytes sin comprobar
   calidad visual, dimensiones y semántica de color/transparencia.
4. Para fotografías públicas se prefiere WebP cuando no se pierde calidad
   relevante ni compatibilidad necesaria.
5. Los nombres deben describir el uso, no la sesión o fase que los creó.
6. El Quality Gate bloquea imágenes grandes sin consumidores web reales.
7. Las imágenes locales con `src` literal en HTML declaran `width` y `height`
   intrínsecos para reservar su relación de aspecto antes de completar la carga.
8. Las imágenes fuera del primer viewport deben usar carga diferida cuando no
   afecte al comportamiento o a la experiencia prevista.

## Umbrales

- A partir de 200 KiB, una imagen debe tener al menos un consumidor web real.
- Ningún asset individual debe superar 2,5 MB sin una decisión técnica
  documentada.

Los originales retirados del repo se conservan, cuando sea necesario, en el
archivo externo de backups y nunca dentro de Git.
