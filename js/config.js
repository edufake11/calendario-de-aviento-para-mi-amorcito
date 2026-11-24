/* ==========================================================================
   CALENDARIO DE ADVIENTO PARA ADRIANA · CONFIGURACIÓN
   --------------------------------------------------------------------------
   Todo lo que se puede personalizar está en este archivo.

   ► ANTES DE COMPARTIRLO CON ADRIANA cambia  produccion: false  →  true
     Así se desactiva por completo el modo de pruebas (#probar).

   Nota: GitHub Pages es un alojamiento estático. Cualquiera que sepa
   inspeccionar la página puede leer este archivo. El bloqueo de puertas
   es parte de la experiencia, no una medida de seguridad.
   ========================================================================== */

window.CALENDARIO = {
  produccion: false,

  para: "Adriana",
  de: "Jhoncena",
  anio: 2026,
  zonaHoraria: "America/Lima",   // las puertas se abren a las 00:00 de Lima
  firma: "Te amo",

  titulo: "Feliz Navidad, mi amor",
  subtitulo: "He guardado un poquito de nosotros detrás de cada puerta.",

  intro: {
    frase: "Durante 24 noches, una puerta se abrirá solo para ti.",
    fraseNavidad: "Ya es Navidad. Todo lo que abriste en diciembre sigue aquí, esperándote."
  },

  /* Mensajes al volver a la página (se elige uno al azar). */
  regresos: [
    "Volviste. Me encanta que vuelvas.",
    "Hola de nuevo, mi amor. Mañana a las 00:00 hay otra puerta.",
    "Cada vez que entras, este calendario se pone feliz. Yo también.",
    "Aquí sigue tu universo, guardadito para ti."
  ],

  /* ------------------------------------------------------------------------
     NUESTRA CANCIÓN · «Tú y yo» — La Misma Gente
     Sube tu archivo autorizado como  audio/tu-y-yo.mp3  (o cambia la ruta).
     Mientras el archivo no exista, suena la caja de música navideña y el
     reproductor de la canción no se muestra.
     enlaceOficial: opcional, un enlace oficial (Spotify, YouTube del canal
     oficial…) que aparece como «Escúchala en…» si el archivo no está.
     ------------------------------------------------------------------------ */
  cancion: {
    archivo: "audio/tu-y-yo.mp3",
    titulo: "Tú y yo",
    artista: "La Misma Gente",
    etiqueta: "Nuestra canción",
    frase: "Entre tantas canciones en el mundo, esta siempre será la nuestra.",
    enlaceOficial: "",
    textoEnlace: "Escúchala en su versión oficial"
  },

  final: {
    entrada: "La última puerta",
    despedida: "Feliz Navidad, Adriana",
    cierre: "Te amo muchoo, mi amorcito.",
    dedicatoria: "24 días, 24 sorpresas y una sola persona a quien dedicarle todas. Gracias por ser parte de mi historia, Adriana. Que nunca deje de sonar nuestra canción. Feliz Navidad, mi amor.",

    /* Sincronización con la canción (en segundos).
       inicioCancion: segundo de «Tú y yo» donde empieza el final.
       marcasFotos: en qué segundo (contado desde inicioCancion) aparece cada
       foto. Escucha la canción y anota los golpes o el coro que te gusten.
       Si la dejas vacía, sale una foto cada 2,8 segundos.
       Los demás momentos se cuentan desde la última foto.

       Ya sincronizado con «Tú y yo» (90 BPM, un compás = 2,667 s):
       una foto cada 2 compases desde los 5,3 s; el corazón se forma a los
       72 s, cuando entra el coro; la carta a los 77 s; «Feliz Navidad» y los
       fuegos artificiales a los 85 s, en el momento más alto de la canción;
       y la dedicatoria a los 93 s. */
    inicioCancion: 0,
    marcasFotos: [5.33, 10.67, 16, 21.33, 26.67, 32, 37.33, 42.67, 48, 53.33, 58.67, 64, 69.33],
    momentos: { corazon: 2.67, carta: 8, despedida: 16, dedicatoria: 24 }
  },

  /* ------------------------------------------------------------------------
     LAS 24 SORPRESAS
     tipo: "carta" | "vale" | "regalo" | "rompecabezas" | "memoria"
           | "constelacion" | "final"
     Plantillas listas para usar (ver al final del archivo):
           "galeria" | "pregunta" | "audio" | "video" | "playlist"
     ------------------------------------------------------------------------ */
  sorpresas: [
    { tipo: "carta", foto: "fotos/d1.jpg", titulo: "Empieza la cuenta regresiva", texto: "Durante 24 días vas a encontrar aquí un poquito de nosotros.\nVuelve cada noche a las 00:00: siempre habrá algo esperándote." },
    { tipo: "vale", titulo: "Te invito a una cena", texto: "Tú eliges el lugar y el día.\nYo invito, sin mirar la carta de precios." },
    { tipo: "carta", foto: "fotos/d3.jpg", titulo: "Mira esa carita", texto: "Si alguna vez no sabes cuánto te amo, piensa en cómo nos mira Moca.\nAsí, pero más." },
    { tipo: "vale", titulo: "Vale por un paseo de luces", texto: "Una noche para caminar juntos y ver las luces de Navidad.\nTú dices a dónde, y la chocolatada va por mi cuenta." },
    { tipo: "rompecabezas", foto: "fotos/d5.jpg", titulo: "Nuestras fotos de la compu", texto: "Cualquier lugar se vuelve bonito si estás tú.\nHasta una computadora de la universidad." },
    { tipo: "vale", titulo: "Un día con todo lo que tú elijas", texto: "Desayuno, plan, comida, peli y postre.\nTodo el día decides tú y yo solo digo que sí." },
    { tipo: "carta", foto: "fotos/d7.jpg", titulo: "Nuestro viaje", texto: "Uno de mis recuerdos favoritos.\nQuiero muchos viajes más contigo." },
    { tipo: "regalo", titulo: "El que querías para tu cumple", texto: "Sé que lo querías para tu cumpleaños y no pude dártelo.\nTarde, pero llegó: ahora sí es tuyo." },
    { tipo: "carta", foto: "fotos/d9.jpg", titulo: "Prueba de que estamos igual de locos", texto: "Por eso nos entendemos tan bien.\nNo cambies nunca." },
    { tipo: "regalo", titulo: "Un poquito de glow", texto: "Para que tu maquillaje te dure todo el día.\nAunque sin nada ya eres la más bonita." },
    { tipo: "carta", foto: "fotos/d11.jpg", titulo: "Esa laguna en Huaraz", texto: "Hacía frío, había viento y estaba nublado.\nY yo estaba feliz porque estaba contigo." },
    { tipo: "regalo", titulo: "Un Minion para ti", texto: "Bob y su osito Tim vienen a hacerte compañía.\nPara que lo abraces cuando yo no esté." },
    { tipo: "carta", foto: "fotos/d13.jpg", titulo: "Tu cara de «ya vámonos»", texto: "Hasta enojada eres la más bonita.\nGracias por aguantarme las fotos." },
    { tipo: "regalo", titulo: "Una flor que no se marchita", texto: "Para que tengas flores en tu cuarto todo el año.\nComo lo que siento por ti." },
    { tipo: "carta", foto: "fotos/d15.jpg", titulo: "Mis dos dormilonas", texto: "Tú y Moca, juntitas en el sillón.\nUna de mis fotos favoritas: me da mucha ternura verlas así." },
    { tipo: "regalo", titulo: "Un juego para los dos", texto: "Preguntas y retos solo para nosotros.\nYa veremos quién se pone más rojo." },
    { tipo: "memoria", fotos: ["fotos/mini/d1.jpg", "fotos/mini/d3.jpg", "fotos/mini/d5.jpg", "fotos/mini/d7.jpg", "fotos/mini/d11.jpg", "fotos/mini/d15.jpg"], foto: "fotos/d17.jpg", titulo: "Mitad del camino y un poquito más", texto: "Ya van diecisiete puertas.\nQuedan siete sorpresas y muchas ganas de verte." },
    { tipo: "regalo", titulo: "Un tulipán para llevar contigo", texto: "Para tus llaves, tu mochila o donde quieras.\nAsí me llevas a todos lados." },
    { tipo: "constelacion", foto: "fotos/d19.jpg", titulo: "Lo que más espero", texto: "Pasar estas fiestas contigo.\nLo demás es decoración." },
    { tipo: "regalo", titulo: "Tulipanes para ti", texto: "Porque mereces flores aunque no haya un motivo.\nY hoy el motivo es que te amo." },
    { tipo: "carta", foto: "fotos/d21.jpg", titulo: "Moca también lo sabe", texto: "Que en brazos de quien te ama se duerme mejor.\nHoy es el día más largo del año, y aun así contigo se me pasa volando." },
    { tipo: "regalo", titulo: "Para que te tapes riendo", texto: "Una manta con una foto tuya, de las graciosas 😜\nCada vez que te tapes te vas a reír y te vas a acordar de mí." },
    { tipo: "carta", foto: "fotos/d23.jpg", titulo: "Casi", texto: "Mañana es Nochebuena.\nGracias por este año, por tu paciencia, por tu risa y por todas nuestras fotos borrosas." },
    { tipo: "final", regalo: true, foto: "fotos/d24.jpg", titulo: "Feliz Navidad, mi amor", texto: "Esa noche en el Puente de los Suspiros pensé que no quería estar en ningún otro lugar.\nTu último regalo brilla: un anillito para que me lleves siempre contigo.\nTe amo muchoo, mi amorcito." }
  ]
};

/* --------------------------------------------------------------------------
   PLANTILLAS (cópialas dentro de "sorpresas" en lugar de un día).
   Rellena los campos con tus propios recuerdos; no hay nada inventado.

   Galería de Polaroids:
   { tipo: "galeria", titulo: "…", texto: "…",
     fotos: [{ src: "fotos/d7.jpg", pie: "…" }, { src: "fotos/d11.jpg", pie: "…" }] }

   Pregunta sobre nosotros:
   { tipo: "pregunta", titulo: "…", pregunta: "¿…?",
     opciones: ["…", "…", "…"], correcta: 0,
     acierto: "¡Sabía que te acordabas!", fallo: "Casi… inténtalo otra vez", texto: "…" }

   Mensaje de voz (sube el archivo a la carpeta audio/):
   { tipo: "audio", titulo: "…", src: "audio/mensaje.m4a", texto: "…" }

   Video de recuerdos (sube el archivo a la carpeta video/, mejor .mp4 corto):
   { tipo: "video", titulo: "…", src: "video/recuerdo.mp4", poster: "fotos/d7.jpg", texto: "…" }

   Playlist (enlaces a Spotify, YouTube, etc.):
   { tipo: "playlist", titulo: "…", texto: "…",
     canciones: [{ titulo: "…", artista: "…", enlace: "https://…" }] }
   -------------------------------------------------------------------------- */
