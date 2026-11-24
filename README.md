# Calendario de Adviento para Adriana

24 noches, 24 sorpresas. Hecho a mano por Jhoncena.

Página: https://edufake11.github.io/calendario-de-aviento-para-mi-amorcito/

## Estructura

| Archivo | Para qué sirve |
|---|---|
| `js/config.js` | **Todo lo editable**: nombres, mensajes de las 24 puertas, la canción, el final y el modo producción. |
| `index.html` | Estructura de la página. |
| `css/estilos.css` | Diseño (rojo vino, dorado, crema y negro). |
| `js/app.js` | Lógica: hora de Lima, progreso, intro, puertas, árbol, universo, gran final, secretos, modo prueba. |
| `js/sorpresas.js` | Componentes de cada tipo de sorpresa (carta, cupón, regalo, rompecabezas, memoria, constelación, galería, pregunta, audio, video, playlist). |
| `js/efectos.js` | Cielo con estrellas y nieve, partículas, corazón y fuegos artificiales. |
| `js/audio.js` | Nuestra canción, caja de música de respaldo y efectos de sonido. |
| `fotos/` y `fotos/mini/` | Fotos grandes y miniaturas para el álbum, el árbol y el final. |
| `sw.js`, `manifest.webmanifest`, `iconos/` | Para instalarla como app en el celular. |

## Nuestra canción: «Tú y yo» (La Misma Gente)

El archivo está en `audio/tu-y-yo.mp3` (MP3 de 128 kbps, 4:45). Suena al tocar «Abrir mi regalo», sigue sonando por todo el calendario, aparece en la pantalla de bloqueo del celular y acompaña el gran final.

Para cambiarlo, reemplaza el archivo con el mismo nombre. Ten en cuenta que el repositorio es **público**: cualquiera puede descargar lo que esté aquí. Si quitas el archivo o dejas `archivo: ""`, suena una caja de música con «Noche de paz» (dominio público).

Notas para iPhone:
- La canción pasa por Web Audio para poder hacer fundidos (Safari no deja cambiar el volumen de un audio de otra forma).
- El service worker no toca el audio: Safari lo pide por partes y un intermediario puede dejarlo mudo.

### Sincronizar las fotos del final con la canción

En `js/config.js`, dentro de `final`:

- `inicioCancion`: segundo de la canción donde empieza el final (por ejemplo `30` para arrancar en el coro).
- `marcasFotos`: lista con el segundo en que aparece cada una de las 13 fotos, contado desde `inicioCancion`. Ya está sincronizada con la canción (90 BPM): una foto cada 2 compases, y el corazón se forma cuando entra el coro (72 s).
- `momentos`: cuántos segundos después de la última foto aparecen el corazón, la carta, la despedida y la dedicatoria.

## Modo prueba

Al publicar cambios, sube `VERSION` en `sw.js` y el `?v=` de `index.html` para que los celulares no se queden con una copia vieja.

Abre la página con `#probar` al final:
`https://edufake11.github.io/calendario-de-aviento-para-mi-amorcito/#probar`

Arriba a la izquierda aparece un panel para simular cualquier fecha (con hora de Lima), ver la intro, ver el gran final y reiniciar el progreso.

## Antes de compartirlo con Adriana

1. En `js/config.js` cambia `produccion: false` por `produccion: true`. Así `#probar` deja de funcionar por completo.
2. Mándale el enlace **sin** `#probar`.

Importante: GitHub Pages es un alojamiento estático. Cualquiera que sepa inspeccionar la página puede leer `js/config.js` y ver todas las sorpresas. El bloqueo de las puertas es parte de la experiencia, no una medida de seguridad.

## Cómo funciona

- Las puertas se abren a las **00:00 de Lima** (`America/Lima`), sin importar la zona horaria del celular.
- El progreso, los cupones canjeados, los juegos resueltos y las preferencias de sonido se guardan en el navegador (localStorage). Si se abre en otro celular, el progreso empieza de cero, pero las puertas desbloqueadas siguen disponibles.
- «Nuestro pequeño universo» guarda todo lo abierto y sigue disponible después de Navidad.
- Respeta «Reducir movimiento» del sistema y funciona en Safari y Chrome.
- Hay 3 secretos escondidos.
