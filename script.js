/*
 * CERACECI - script.js para Cloudflare Pages
 *
 * El navegador obtiene el catálogo desde /api/catalogo.
 * Cloudflare consulta Google Apps Script desde el servidor.
 */

const URL_CSV = "/api/catalogo";

/*
 * Caché local del catálogo.
 *
 * La última versión válida se guarda en el navegador para que,
 * al volver a abrir o recargar la página, los productos aparezcan
 * inmediatamente. Después se consulta Cloudflare en segundo plano.
 */
const CACHE_CATALOGO_LOCAL = "ceraceci_catalogo_csv_v6";

/*
 * Reemplazá este número por el WhatsApp real de Ceraceci.
 *
 * Debe incluir:
 * 54 = Argentina
 * 9 = celulares argentinos
 * código de área
 * número
 *
 * No debe tener +, espacios, guiones ni paréntesis.
 */
const NUMERO_WHATSAPP = "5492477314865";

const contenedorProductos =
  document.getElementById("productos");

const buscador =
  document.getElementById("buscador");

const formBusqueda =
  document.getElementById("formBusqueda");

const filtroCategoria =
  document.getElementById("filtroCategoria");

const ordenarProductos =
  document.getElementById("ordenarProductos");

const seccionBusqueda =
  document.querySelector(".busqueda");

const avisoProductoCompartido =
  document.getElementById("avisoProductoCompartido");

const verCatalogoCompleto =
  document.getElementById("verCatalogoCompleto");

const avisoCopiado =
  document.getElementById("avisoCopiado");

const modalInformacionProducto =
  document.getElementById("modalInformacionProducto");

const modalInfoTitulo =
  document.getElementById("modalInfoTitulo");

const modalInfoContenido =
  document.getElementById("modalInfoContenido");

const cerrarModalInfo =
  document.getElementById("cerrarModalInfo");

let botonInformacionAnterior = null;

const estado =
  document.getElementById("estado");

const abrirCarrito =
  document.getElementById("abrirCarrito");

const cerrarCarrito =
  document.getElementById("cerrarCarrito");

const fondoCarrito =
  document.getElementById("fondoCarrito");

const carritoElemento =
  document.getElementById("carrito");

const productosCarrito =
  document.getElementById("productosCarrito");

const cantidadCarrito =
  document.getElementById("cantidadCarrito");

const valorCarrito =
  document.getElementById("valorCarrito");

const iconoCarrito =
  document.getElementById("iconoCarrito");

const totalCarrito =
  document.getElementById("totalCarrito");

const cantidadItemsCarrito =
  document.getElementById("cantidadItemsCarrito");

const vaciarCarrito =
  document.getElementById("vaciarCarrito");

const finalizarPedido =
  document.getElementById("finalizarPedido");

const compartirCarrito =
  document.getElementById("compartirCarrito");

const barraComparacion =
  document.getElementById("barraComparacion");

const resumenComparacion =
  document.getElementById("resumenComparacion");

const abrirComparacion =
  document.getElementById("abrirComparacion");

const limpiarComparacion =
  document.getElementById("limpiarComparacion");

const cancelarComparacionMovil =
  document.getElementById("cancelarComparacionMovil");

const abrirComparacionMovil =
  document.getElementById("abrirComparacionMovil");

const accionesComparacionMovil =
  document.querySelector(".acciones-comparacion-movil");

const botonesModoComparacion =
  Array.from(
    document.querySelectorAll(
      ".activar-modo-comparacion"
    )
  );

const seccionComparacion =
  document.getElementById("seccionComparacion");

const productosComparados =
  document.getElementById("productosComparados");

const contadorComparacion =
  document.getElementById("contadorComparacion");

const volverCatalogo =
  document.getElementById("volverCatalogo");

const limpiarComparacionVista =
  document.getElementById("limpiarComparacionVista");

let productosAgrupados = [];
let productosMostrados = [];
let carritoCompras = cargarCarritoGuardado();
let productosSeleccionadosComparacion = [];
let comparacionAbierta = false;
let modoSeleccionComparacion = false;
let productoCompartidoPendiente =
  new URLSearchParams(window.location.search).get("producto");
const selectoresPersonalizadosPC = new Map();


/* =========================================
   GALERÍA DE FOTOS - v187

   - Flechas realmente dentro de la foto.
   - Flechas más discretas.
   - Recorte visual fuerte de margen blanco para la nueva tanda
     de productos con varias fotos (incluye Foto 1).
   - Mismo recorte en zoom, siempre conservando proporción.
   - Navegación de zoom dentro de la propia imagen.

   GALERÍA DE FOTOS

   Estos estilos afectan únicamente a los controles que se dibujan
   ENCIMA de la foto. No cambian tamaños, orden ni posición de los
   demás elementos de la tarjeta.
========================================= */

function asegurarEstilosGaleriaFotos() {
  if (document.getElementById("ceraceci-galeria-fotos")) {
    return;
  }

  const estilo = document.createElement("style");
  estilo.id = "ceraceci-galeria-fotos";
  estilo.textContent = `
    /*
      El contenedor es la única referencia de posición para flechas y puntos.
      Esto impide que la galería altere o invada Compartir/Comparar.
    */
    .contenedor-foto-producto{
      position:relative !important;
    }

    /* Navegación de fotos superpuesta DENTRO de la imagen. */
    .contenedor-foto-producto .foto-navegacion{
      position:absolute;
      top:50%;
      z-index:8;
      display:grid;
      place-items:center;
      width:22px;
      height:28px;
      padding:0;
      transform:translateY(-50%);
      color:rgba(152,55,30,.92);
      background:rgba(252,251,250,.46);
      border:1px solid rgba(152,55,30,.38);
      border-radius:999px;
      box-shadow:0 1px 5px rgba(32,24,20,.08);
      font:500 19px/1 Arial,sans-serif;
      cursor:pointer;
      opacity:.58;
      transition:opacity .14s ease, background-color .14s ease, border-color .14s ease;
      -webkit-tap-highlight-color:transparent;
      backdrop-filter:blur(2px);
      -webkit-backdrop-filter:blur(2px);
    }

    .contenedor-foto-producto:hover .foto-navegacion,
    .contenedor-foto-producto .foto-navegacion:focus-visible,
    .contenedor-foto-producto .foto-navegacion:active{
      opacity:.95;
      background:rgba(252,251,250,.78);
      border-color:rgba(152,55,30,.72);
    }

    .contenedor-foto-producto .foto-anterior{ left:7px; }
    .contenedor-foto-producto .foto-siguiente{ right:7px; }

    .contenedor-foto-producto .foto-indicadores{
      position:absolute;
      left:50%;
      bottom:5px;
      z-index:8;
      display:flex;
      gap:5px;
      transform:translateX(-50%);
      pointer-events:none;
    }

    .contenedor-foto-producto .foto-indicador{
      display:block;
      width:5px;
      height:5px;
      background:rgba(43,39,36,.24);
      border-radius:50%;
      box-shadow:0 0 0 1px rgba(252,251,250,.72);
    }

    .contenedor-foto-producto .foto-indicador.activo{
      background:var(--color-principal,#98371e);
    }

    /*
      La página ya no agrega 5/7 px de margen alrededor de la foto.
      La imagen sigue usando contain: jamás se deforma.
    */
    html body #productos#productos .tarjeta-producto .contenedor-foto-producto .foto-producto:not(.foto-placeholder),
    html body #productosComparados#productosComparados .tarjeta-producto .contenedor-foto-producto .foto-producto:not(.foto-placeholder){
      top:0 !important;
      right:0 !important;
      bottom:0 !important;
      left:0 !important;
      width:100% !important;
      height:100% !important;
      max-width:none !important;
      max-height:none !important;
      padding:0 !important;
      object-fit:contain !important;
      object-position:center center !important;
      clip-path:none !important;
      transform:none !important;
    }

    /*
      La nueva tanda de productos con varias fotos conserva mucho blanco
      dentro del propio archivo. A esos productos se les aplica un recorte
      VISUAL uniforme a TODAS sus fotos, incluida Foto 1.

      No se cambia la proporción: ancho y alto se escalan exactamente igual.
      El contenedor, que ya tiene overflow:hidden, recorta solo el excedente.
    */
    html body #productos#productos .tarjeta-producto .contenedor-foto-producto .foto-producto.foto-recorte-margen-blanco,
    html body #productosComparados#productosComparados .tarjeta-producto .contenedor-foto-producto .foto-producto.foto-recorte-margen-blanco{
      transform:scale(var(--ceraceci-escala-foto, 1)) !important;
      transform-origin:center center !important;
    }

    /*
      Presentaciones: el borde terracota aparece SOLO al pasar el mouse
      en PC. En reposo conservan exactamente su borde original.
    */
    @media (min-width:651px) and (hover:hover) and (pointer:fine){
      html body #productos#productos .tarjeta-producto .boton-presentacion:not(.seleccionada):hover,
      html body #productosComparados#productosComparados .tarjeta-producto .boton-presentacion:not(.seleccionada):hover,
      html body #productos#productos .tarjeta-producto .selector-presentacion:hover,
      html body #productosComparados#productosComparados .tarjeta-producto .selector-presentacion:hover,
      html body #productos#productos .tarjeta-producto .select-personalizado-presentacion-pc .select-personalizado-boton-pc:hover,
      html body #productosComparados#productosComparados .tarjeta-producto .select-personalizado-presentacion-pc .select-personalizado-boton-pc:hover{
        border-color:var(--color-principal,#98371e) !important;
      }
    }

    /* Navegación del zoom: también vive DENTRO de la propia imagen. */
    .zoom-imagen-overlay .zoom-imagen-marco{
      position:relative !important;
    }

    .zoom-imagen-overlay .zoom-foto-navegacion{
      position:absolute;
      top:50%;
      z-index:10020;
      display:grid;
      place-items:center;
      width:30px;
      height:38px;
      padding:0;
      transform:translateY(-50%);
      color:rgba(152,55,30,.94);
      background:rgba(252,251,250,.42);
      border:1px solid rgba(152,55,30,.34);
      border-radius:999px;
      box-shadow:0 2px 8px rgba(20,16,14,.10);
      font:500 25px/1 Arial,sans-serif;
      cursor:pointer;
      opacity:.62;
      transition:opacity .14s ease, background-color .14s ease;
      -webkit-tap-highlight-color:transparent;
      backdrop-filter:blur(2px);
      -webkit-backdrop-filter:blur(2px);
    }

    .zoom-imagen-overlay .zoom-foto-navegacion:hover,
    .zoom-imagen-overlay .zoom-foto-navegacion:focus-visible,
    .zoom-imagen-overlay .zoom-foto-navegacion:active{
      opacity:.96;
      background:rgba(252,251,250,.76);
    }

    .zoom-imagen-overlay .zoom-foto-anterior{ left:8px; }
    .zoom-imagen-overlay .zoom-foto-siguiente{ right:8px; }

    .zoom-imagen-overlay .zoom-foto-indicadores{
      position:absolute;
      left:50%;
      bottom:8px;
      z-index:10020;
      display:flex;
      gap:6px;
      transform:translateX(-50%);
      pointer-events:none;
    }

    .zoom-imagen-overlay .zoom-foto-indicador{
      width:7px;
      height:7px;
      background:rgba(23,23,23,.28);
      border:1px solid rgba(255,255,255,.85);
      border-radius:50%;
    }

    .zoom-imagen-overlay .zoom-foto-indicador.activo{
      background:var(--color-principal,#98371e);
    }

    .zoom-imagen-overlay .zoom-foto-navegacion[hidden],
    .zoom-imagen-overlay .zoom-foto-indicadores[hidden]{
      display:none !important;
    }

    /*
      Zoom: ocupa el máximo espacio posible sin deformar la imagen.
      En los productos de la nueva tanda con varias fotos se aplica el mismo
      recorte visual fuerte que en la tarjeta. La proporción nunca cambia.
    */
    html body .zoom-imagen-overlay .zoom-imagen-escenario{
      padding:0 !important;
      overflow:hidden !important;
    }

    html body .zoom-imagen-overlay .zoom-imagen-marco{
      max-width:100vw !important;
      max-height:100vh !important;
    }

    html body .zoom-imagen-overlay .zoom-imagen-ampliada{
      max-width:100vw !important;
      max-height:100vh !important;
      border:0 !important;
      border-radius:0 !important;
      box-shadow:none !important;
      object-fit:contain !important;
      transform:none !important;
      clip-path:none !important;
    }

    html body .zoom-imagen-overlay .zoom-imagen-ampliada.zoom-recorte-margen-blanco{
      transform:scale(var(--ceraceci-escala-foto, 1)) !important;
      transform-origin:center center !important;
    }

    @media (max-width:650px){
      /*
        v188: en móvil usamos una escala propia y un ajuste final para que los óxidos tengan un encuadre visual similar al de las acuarelas. La tarjeta es mucho más
        angosta que en PC, por eso algunos productos todavía se percibían
        chicos aun cuando el recorte ya funcionaba en escritorio.
        La escala sigue siendo uniforme en ambos ejes: nunca deforma la foto.
      */
      html body #productos#productos .tarjeta-producto .contenedor-foto-producto .foto-producto.foto-recorte-margen-blanco,
      html body #productosComparados#productosComparados .tarjeta-producto .contenedor-foto-producto .foto-producto.foto-recorte-margen-blanco{
        transform:scale(var(--ceraceci-escala-foto-movil, var(--ceraceci-escala-foto, 1))) !important;
      }

      html body .zoom-imagen-overlay .zoom-imagen-ampliada.zoom-recorte-margen-blanco{
        transform:scale(var(--ceraceci-escala-foto-movil, var(--ceraceci-escala-foto, 1))) !important;
      }

      /*
        En móvil no mostramos flechas: las fotos se recorren deslizando
        horizontalmente. Los puntos quedan como indicación de que hay más.
      */
      .contenedor-foto-producto .foto-navegacion,
      .zoom-imagen-overlay .zoom-foto-navegacion{
        display:none !important;
      }

      .contenedor-foto-producto{
        touch-action:pan-y;
      }

      .zoom-imagen-overlay .zoom-imagen-marco{
        touch-action:none;
      }

      .contenedor-foto-producto .foto-indicadores{ bottom:4px; }
      .zoom-imagen-overlay .zoom-foto-indicadores{ bottom:6px; }
    }
  `;

  (document.body || document.head).appendChild(estilo);
}

function asegurarNavegacionZoomFotos() {
  const overlay = document.getElementById("zoomImagenOverlay");
  const imagenZoom = document.getElementById("zoomImagenAmpliada");
  const marcoZoom = overlay?.querySelector(".zoom-imagen-marco");

  if (!overlay || !imagenZoom || !marcoZoom) {
    return;
  }

  let botonAnteriorZoom =
    overlay.querySelector(".zoom-foto-anterior");
  let botonSiguienteZoom =
    overlay.querySelector(".zoom-foto-siguiente");
  let indicadoresZoom =
    overlay.querySelector(".zoom-foto-indicadores");

  if (!botonAnteriorZoom) {
    botonAnteriorZoom = document.createElement("button");
    botonAnteriorZoom.type = "button";
    botonAnteriorZoom.className =
      "zoom-foto-navegacion zoom-foto-anterior";
    botonAnteriorZoom.setAttribute(
      "aria-label",
      "Foto anterior"
    );
    botonAnteriorZoom.textContent = "‹";
    marcoZoom.appendChild(botonAnteriorZoom);
  }

  if (!botonSiguienteZoom) {
    botonSiguienteZoom = document.createElement("button");
    botonSiguienteZoom.type = "button";
    botonSiguienteZoom.className =
      "zoom-foto-navegacion zoom-foto-siguiente";
    botonSiguienteZoom.setAttribute(
      "aria-label",
      "Foto siguiente"
    );
    botonSiguienteZoom.textContent = "›";
    marcoZoom.appendChild(botonSiguienteZoom);
  }

  if (!indicadoresZoom) {
    indicadoresZoom = document.createElement("div");
    indicadoresZoom.className =
      "zoom-foto-indicadores";
    indicadoresZoom.setAttribute(
      "aria-hidden",
      "true"
    );
    marcoZoom.appendChild(indicadoresZoom);
  }

  let fotosZoom = [];
  let indiceZoom = 0;
  let recortarMargenBlancoZoom = false;
  let escalaRecorteZoom = 1;
  let escalaRecorteZoomMovil = 1;
  let touchInicioZoom = null;
  let bloquearClickZoomHasta = 0;

  const ajustarZoomMaximo = () => {
    if (!overlay.classList.contains("abierto")) {
      return;
    }

    const anchoNatural = imagenZoom.naturalWidth;
    const altoNatural = imagenZoom.naturalHeight;

    if (!anchoNatural || !altoNatural) {
      return;
    }

    /*
      Se calcula una única escala para ambos ejes:
      la proporción original nunca cambia.
    */
    const anchoDisponible =
      Math.max(160, window.innerWidth - 2);
    const altoDisponible =
      Math.max(160, window.innerHeight - 2);

    const escala =
      Math.min(
        anchoDisponible / anchoNatural,
        altoDisponible / altoNatural
      );

    imagenZoom.style.setProperty(
      "width",
      `${Math.floor(anchoNatural * escala)}px`,
      "important"
    );

    imagenZoom.style.setProperty(
      "height",
      `${Math.floor(altoNatural * escala)}px`,
      "important"
    );
  };

  const actualizarControlesZoom = () => {
    const varias = fotosZoom.length > 1;

    botonAnteriorZoom.hidden = !varias;
    botonSiguienteZoom.hidden = !varias;
    indicadoresZoom.hidden = !varias;

    indicadoresZoom.innerHTML =
      varias
        ? fotosZoom
            .map(
              (_, indice) => `
                <span
                  class="zoom-foto-indicador ${
                    indice === indiceZoom
                      ? "activo"
                      : ""
                  }"
                ></span>
              `
            )
            .join("")
        : "";
  };

  const mostrarFotoZoom = (nuevoIndice) => {
    if (fotosZoom.length === 0) {
      return;
    }

    indiceZoom =
      (nuevoIndice + fotosZoom.length) %
      fotosZoom.length;

    imagenZoom.classList.toggle(
      "zoom-recorte-margen-blanco",
      recortarMargenBlancoZoom
    );
    imagenZoom.style.setProperty(
      "--ceraceci-escala-foto",
      String(escalaRecorteZoom || 1)
    );
    imagenZoom.style.setProperty(
      "--ceraceci-escala-foto-movil",
      String(escalaRecorteZoomMovil || escalaRecorteZoom || 1)
    );

    imagenZoom.src = fotosZoom[indiceZoom];

    actualizarControlesZoom();

    if (
      imagenZoom.complete &&
      imagenZoom.naturalWidth
    ) {
      requestAnimationFrame(
        ajustarZoomMaximo
      );
    }
  };

  const prepararZoomDesdeFoto = (fotoOrigen) => {
    let lista = [];

    try {
      lista =
        JSON.parse(
          fotoOrigen.dataset.fotos || "[]"
        );
    } catch (_) {
      lista = [];
    }

    if (!Array.isArray(lista) || lista.length === 0) {
      const src =
        fotoOrigen.currentSrc ||
        fotoOrigen.src ||
        "";

      lista = src ? [src] : [];
    }

    fotosZoom =
      lista
        .map((foto) => normalizarURLImagen(foto) || foto)
        .filter(Boolean)
        .slice(0, 4);

    indiceZoom =
      Math.max(
        0,
        Math.min(
          fotosZoom.length - 1,
          Number(
            fotoOrigen.dataset.indiceFoto || 0
          ) || 0
        )
      );

    recortarMargenBlancoZoom =
      fotoOrigen.dataset.recorteMargenBlancoZoom === "true" ||
      (
        fotoOrigen.dataset.recorteMargenBlancoZoom == null &&
        fotoOrigen.dataset.recorteMargenBlanco === "true"
      );

    escalaRecorteZoom = Math.max(
      1,
      Number(
        fotoOrigen.dataset.escalaRecorteZoom ||
        fotoOrigen.dataset.escalaRecorte ||
        1
      ) || 1
    );

    escalaRecorteZoomMovil = Math.max(
      1,
      Number(
        fotoOrigen.dataset.escalaRecorteZoomMovil ||
        fotoOrigen.dataset.escalaRecorteZoom ||
        fotoOrigen.dataset.escalaRecorteMovil ||
        fotoOrigen.dataset.escalaRecorte ||
        1
      ) || 1
    );

    imagenZoom.classList.toggle(
      "zoom-recorte-margen-blanco",
      recortarMargenBlancoZoom
    );
    imagenZoom.style.setProperty(
      "--ceraceci-escala-foto",
      String(escalaRecorteZoom)
    );
    imagenZoom.style.setProperty(
      "--ceraceci-escala-foto-movil",
      String(escalaRecorteZoomMovil)
    );

    actualizarControlesZoom();

    /*
      El zoom original ya abrió la imagen clickeada.
      Solo recalculamos el tamaño máximo y dejamos lista
      la navegación a las demás fotos.
    */
    requestAnimationFrame(
      ajustarZoomMaximo
    );
  };

  document.addEventListener(
    "click",
    (evento) => {
      const fotoOrigen =
        evento.target.closest?.(
          ".contenedor-foto-producto .foto-producto:not(.foto-placeholder)"
        );

      if (!fotoOrigen) {
        return;
      }

      prepararZoomDesdeFoto(fotoOrigen);
    },
    true
  );

  botonAnteriorZoom.addEventListener(
    "click",
    (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      mostrarFotoZoom(indiceZoom - 1);
    }
  );

  botonSiguienteZoom.addEventListener(
    "click",
    (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      mostrarFotoZoom(indiceZoom + 1);
    }
  );

  /* Deslizamiento horizontal en el zoom móvil. */
  marcoZoom.addEventListener(
    "touchstart",
    (evento) => {
      if (
        window.innerWidth > 650 ||
        fotosZoom.length <= 1 ||
        evento.touches.length !== 1
      ) {
        touchInicioZoom = null;
        return;
      }

      const toque = evento.touches[0];
      touchInicioZoom = {
        x: toque.clientX,
        y: toque.clientY
      };
    },
    { passive:true }
  );

  marcoZoom.addEventListener(
    "touchend",
    (evento) => {
      if (
        !touchInicioZoom ||
        window.innerWidth > 650 ||
        fotosZoom.length <= 1 ||
        evento.changedTouches.length !== 1
      ) {
        touchInicioZoom = null;
        return;
      }

      const toque = evento.changedTouches[0];
      const dx = toque.clientX - touchInicioZoom.x;
      const dy = toque.clientY - touchInicioZoom.y;
      touchInicioZoom = null;

      if (
        Math.abs(dx) < 42 ||
        Math.abs(dx) <= Math.abs(dy) * 1.15
      ) {
        return;
      }

      bloquearClickZoomHasta = Date.now() + 420;
      mostrarFotoZoom(
        indiceZoom + (dx < 0 ? 1 : -1)
      );
    },
    { passive:true }
  );

  /* Evita que el click sintético posterior al swipe cierre el zoom. */
  overlay.addEventListener(
    "click",
    (evento) => {
      if (Date.now() >= bloquearClickZoomHasta) {
        return;
      }

      evento.preventDefault();
      evento.stopImmediatePropagation();
      evento.stopPropagation();
    },
    true
  );

  imagenZoom.addEventListener(
    "load",
    () => {
      requestAnimationFrame(
        ajustarZoomMaximo
      );
    }
  );

  window.addEventListener(
    "resize",
    ajustarZoomMaximo
  );

  document.addEventListener(
    "keydown",
    (evento) => {
      if (
        !overlay.classList.contains("abierto") ||
        fotosZoom.length <= 1
      ) {
        return;
      }

      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        mostrarFotoZoom(indiceZoom - 1);
      }

      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        mostrarFotoZoom(indiceZoom + 1);
      }
    }
  );

  actualizarControlesZoom();
}

asegurarEstilosGaleriaFotos();
asegurarNavegacionZoomFotos();


/* =========================================
   CARGA DE PRODUCTOS

   Estrategia "stale while revalidate":
   1) si existe una copia local, se muestra de inmediato;
   2) luego se consulta /api/catalogo en segundo plano;
   3) si cambió el CSV, se actualiza la pantalla y el caché local.
========================================= */

function leerCatalogoLocal() {
  try {
    const guardado =
      localStorage.getItem(CACHE_CATALOGO_LOCAL);

    if (!guardado) {
      return null;
    }

    const datos = JSON.parse(guardado);

    if (
      !datos ||
      typeof datos.texto !== "string" ||
      !datos.texto.trim()
    ) {
      return null;
    }

    return datos;
  } catch (error) {
    console.warn(
      "No se pudo leer el caché local del catálogo.",
      error
    );

    return null;
  }
}


function guardarCatalogoLocal(texto) {
  try {
    localStorage.setItem(
      CACHE_CATALOGO_LOCAL,
      JSON.stringify({
        texto: texto,
        guardadoEn: Date.now()
      })
    );
  } catch (error) {
    console.warn(
      "No se pudo guardar el catálogo en caché local.",
      error
    );
  }
}


async function descargarCSVAppsScript() {
  const respuesta = await fetch(
    URL_CSV,
    {
      method: "GET"
    }
  );

  if (!respuesta.ok) {
    throw new Error(
      "No se pudo descargar la lista desde el servidor. Error " +
      respuesta.status
    );
  }

  const texto =
    await respuesta.text();

  if (!texto.trim()) {
    throw new Error(
      "El servidor devolvió una lista vacía."
    );
  }

  if (/^\s*ERROR:/i.test(texto)) {
    throw new Error(
      texto.trim()
    );
  }

  return texto;
}


function procesarCSVProductos(textoCSV) {
  const filas =
    convertirCSV(textoCSV);

  if (filas.length < 2) {
    throw new Error(
      "La hoja WEB no contiene productos."
    );
  }

  const encabezados =
    filas[0].map(limpiarTexto);

  const indiceCodigo =
    encabezados.indexOf("Código");

  const indiceProducto =
    encabezados.indexOf("Producto");

  const indicePresentacion =
    encabezados.indexOf("Presentación");

  const indicePrecio =
    encabezados.indexOf("Precio");

  const indiceCategoria =
    encabezados.indexOf("Categoría final");

  const indiceActivo =
    encabezados.indexOf("Activo");

  const buscarIndiceOpcional = (...nombres) => {
    const nombresNormalizados =
      nombres.map(normalizarTexto);

    return encabezados.findIndex((encabezado) =>
      nombresNormalizados.includes(
        normalizarTexto(encabezado)
      )
    );
  };

  const indicesFotos = [
    buscarIndiceOpcional(
      "Foto",
      "Imagen",
      "URL foto",
      "URL imagen",
      "Foto 1",
      "Imagen 1",
      "URL foto 1",
      "URL imagen 1"
    ),
    buscarIndiceOpcional(
      "Foto 2",
      "Imagen 2",
      "URL foto 2",
      "URL imagen 2"
    ),
    buscarIndiceOpcional(
      "Foto 3",
      "Imagen 3",
      "URL foto 3",
      "URL imagen 3"
    ),
    buscarIndiceOpcional(
      "Foto 4",
      "Imagen 4",
      "URL foto 4",
      "URL imagen 4"
    )
  ].filter((indice, posicion, lista) =>
    indice !== -1 &&
    lista.indexOf(indice) === posicion
  );

  const indiceProductoPlural =
    buscarIndiceOpcional(
      "Producto plural",
      "Nombre plural"
    );

  const indiceMasInformacion =
    buscarIndiceOpcional(
      "Más información",
      "Mas información",
      "Más informacion",
      "Mas informacion",
      "Información adicional",
      "Informacion adicional"
    );

  const indiceDescripcion =
    buscarIndiceOpcional(
      "Descripción breve",
      "Descripcion breve",
      "Descripción",
      "Descripcion"
    );

  const indiceIndicaciones =
    buscarIndiceOpcional(
      "Indicaciones de uso",
      "Indicaciones",
      "Modo de uso",
      "Uso"
    );

  if (
    indiceProducto === -1 ||
    indicePresentacion === -1 ||
    indicePrecio === -1 ||
    indiceCategoria === -1
  ) {
    throw new Error(
      "No se encontraron las columnas necesarias en la hoja WEB."
    );
  }

  const filasProductos = filas
    .slice(1)
    .map((fila) => {
      const producto = {
        codigo:
          indiceCodigo !== -1
            ? limpiarTexto(fila[indiceCodigo])
            : "",

        nombre:
          limpiarTexto(fila[indiceProducto]),

        nombrePlural:
          indiceProductoPlural !== -1
            ? limpiarTexto(fila[indiceProductoPlural])
            : "",

        presentacion:
          limpiarTexto(
            fila[indicePresentacion]
          ),

        precio:
          convertirPrecio(
            fila[indicePrecio]
          ),

        categoria:
          limpiarTexto(
            fila[indiceCategoria]
          ),

        activo:
          indiceActivo !== -1
            ? limpiarTexto(fila[indiceActivo])
            : "Sí",

        fotos:
          indicesFotos
            .map((indiceFoto) =>
              limpiarTexto(fila[indiceFoto])
            )
            .filter(Boolean),

        foto:
          indicesFotos.length > 0
            ? limpiarTexto(fila[indicesFotos[0]])
            : "",

        masInformacion:
          indiceMasInformacion !== -1
            ? limpiarTexto(fila[indiceMasInformacion])
            : "",

        descripcion:
          indiceDescripcion !== -1
            ? limpiarTexto(fila[indiceDescripcion])
            : "",

        indicaciones:
          indiceIndicaciones !== -1
            ? limpiarTexto(fila[indiceIndicaciones])
            : ""
      };

      const productoNormalizado =
        normalizarFilaKanthal(producto);

      return {
        ...productoNormalizado,
        nombre: formatearNombreProducto(
          productoNormalizado.nombre
        ),
        nombrePlural:
          productoNormalizado.nombrePlural
            ? formatearNombreProducto(
                productoNormalizado.nombrePlural
              )
            : ""
      };
    })
    .filter((producto) => {
      return (
        producto.nombre !== "" &&
        producto.presentacion !== "" &&
        producto.precio > 0 &&
        normalizarTexto(producto.activo) !== "no"
      );
    });

  const filasProductosConBarbotinas =
    agregarPresentacionesBarbotinas(filasProductos);

  productosAgrupados =
    agruparProductos(filasProductosConBarbotinas);

  carritoCompras.forEach(
    recalcularProductoCarrito
  );
  localStorage.setItem(
    "carritoCeraceci",
    JSON.stringify(carritoCompras)
  );
  mostrarCarrito();

  productosSeleccionadosComparacion =
    productosSeleccionadosComparacion.filter(
      (idProducto) =>
        productosAgrupados.some(
          (producto) =>
            producto.id === idProducto
        )
    );

  cargarCategorias();
  filtrarProductos();

  if (comparacionAbierta) {
    mostrarProductosComparados();
  } else {
    actualizarEstadoComparacion();
  }
}


function mostrarErrorCatalogo(error) {
  console.error(error);

  estado.textContent =
    "No se pudo cargar la lista de productos.";

  contenedorProductos.innerHTML = `
    <div class="mensaje-error">
      <strong>
        Error al cargar el catálogo.
      </strong>

      <p>
        ${escaparHTML(error.message)}
      </p>
    </div>
  `;
}


async function cargarProductos() {
  const guardado =
    leerCatalogoLocal();

  let mostradoDesdeCache = false;

  /*
   * Primero mostramos la última versión conocida.
   * Esto elimina el salto de página vacía -> productos
   * en las recargas y visitas posteriores.
   */
  if (guardado) {
    try {
      procesarCSVProductos(guardado.texto);
      mostradoDesdeCache = true;
    } catch (error) {
      console.warn(
        "La copia local del catálogo no era válida.",
        error
      );
    }
  }

  if (!mostradoDesdeCache) {
    estado.textContent =
      "Cargando productos...";
  }

  try {
    /*
     * Cloudflare devuelve normalmente una copia ya cacheada.
     * Si necesita actualizar Google Sheets, lo hará sin bloquear
     * al usuario cuando exista una versión anterior en el edge.
     */
    const textoCSV =
      await descargarCSVAppsScript();

    const cambio =
      !guardado ||
      guardado.texto !== textoCSV;

    guardarCatalogoLocal(textoCSV);

    /*
     * Si no cambió nada, no reconstruimos las tarjetas.
     * Así evitamos cualquier parpadeo o transición innecesaria.
     */
    if (!mostradoDesdeCache || cambio) {
      procesarCSVProductos(textoCSV);
    }
  } catch (error) {
    /*
     * Si ya mostramos una copia válida, una caída temporal de Google
     * no deja el catálogo vacío: mantenemos lo último conocido.
     */
    if (mostradoDesdeCache) {
      console.warn(
        "No se pudo actualizar el catálogo en segundo plano.",
        error
      );

      return;
    }

    mostrarErrorCatalogo(error);
  }
}


/* =========================================
   AGRUPACIÓN DE PRESENTACIONES
========================================= */

function normalizarFilaKanthal(producto) {
  const coincidencia = producto.nombre.match(
    /^ALAMBRE\s+KANTHAL\s+A1\s+DE\s+(.+?\s*MM)$/i
  );

  if (!coincidencia) {
    return producto;
  }

  const diametro = limpiarTexto(coincidencia[1])
    .replace(/\s+/g, " ")
    .toUpperCase();

  return {
    ...producto,
    nombre: "ALAMBRE KANTHAL A1",
    presentacion: `${diametro} × 1 M`
  };
}



function agregarPresentacionesBarbotinas(filasProductos) {
  const precioBidon = filasProductos
    .filter((fila) => {
      return (
        normalizarTexto(fila.nombre) === "bidon boca ancha" &&
        (/^1\s*u\.?$/.test(normalizarTexto(fila.presentacion))) &&
        Number(fila.precio) > 0
      );
    })
    .map((fila) => Number(fila.precio))[0];

  const salida = [];

  filasProductos.forEach((fila) => {
    const nombre = normalizarTexto(fila.nombre);
    const presentacion = normalizarTexto(fila.presentacion);

    const esBarbotina =
      nombre === "barbotina baja temperatura" ||
      nombre === "barbotina gres";

    if (!esBarbotina || !/^9\s*kg\.?$/.test(presentacion)) {
      salida.push(fila);
      return;
    }

    // La fila 9 KG de WEB representa la barbotina SIN bidón.
    salida.push({
      ...fila,
      presentacion: "9 KG S/ BIDÓN"
    });

    // Igual que el Apps Script del catálogo PDF: CON BIDÓN = barbotina + BIDÓN BOCA ANCHA / 1 U.
    if (Number(precioBidon) > 0) {
      salida.push({
        ...fila,
        presentacion: "9 KG C/ BIDÓN",
        precio: Number(fila.precio) + Number(precioBidon)
      });
    }
  });

  return salida;
}


function agruparProductos(filasProductos) {
  const agrupados = new Map();

  filasProductos.forEach((fila) => {
    const clave = [
      normalizarTexto(fila.nombre),
      normalizarTexto(fila.categoria)
    ].join("|");

    if (!agrupados.has(clave)) {
      agrupados.set(clave, {
        id: crearIdProducto(clave),
        nombre: fila.nombre,
        nombrePlural: fila.nombrePlural,
        categoria: fila.categoria,
        fotos: Array.isArray(fila.fotos)
          ? fila.fotos.slice(0, 4)
          : (fila.foto ? [fila.foto] : []),
        foto: fila.foto,
        masInformacion: fila.masInformacion,
        descripcion: fila.descripcion,
        indicaciones: fila.indicaciones,
        presentaciones: []
      });
    }

    const producto = agrupados.get(clave);

    if (!producto.nombrePlural && fila.nombrePlural) {
      producto.nombrePlural = fila.nombrePlural;
    }

    const fotosFila =
      Array.isArray(fila.fotos) && fila.fotos.length
        ? fila.fotos
        : (fila.foto ? [fila.foto] : []);

    fotosFila.forEach((fotoFila) => {
      const fotoLimpia = limpiarTexto(fotoFila);

      if (
        fotoLimpia &&
        !producto.fotos.includes(fotoLimpia) &&
        producto.fotos.length < 4
      ) {
        producto.fotos.push(fotoLimpia);
      }
    });

    if (!producto.foto && producto.fotos.length) {
      producto.foto = producto.fotos[0];
    }

    if (!producto.masInformacion && fila.masInformacion) {
      producto.masInformacion = fila.masInformacion;
    }

    if (!producto.descripcion && fila.descripcion) {
      producto.descripcion = fila.descripcion;
    }

    if (!producto.indicaciones && fila.indicaciones) {
      producto.indicaciones = fila.indicaciones;
    }

    const presentacionExistente =
      producto.presentaciones.some(
        (presentacion) => {
          return (
            normalizarTexto(
              presentacion.nombre
            ) ===
            normalizarTexto(
              fila.presentacion
            )
          );
        }
      );

    if (!presentacionExistente) {
      producto.presentaciones.push({
        nombre: fila.presentacion,
        precio: fila.precio,
        codigo: fila.codigo
      });
    }
  });

  const lista =
    Array.from(agrupados.values());

  lista.forEach((producto) => {
    producto.presentaciones.sort(
      (a, b) => {
        return compararPresentaciones(
          a.nombre,
          b.nombre
        );
      }
    );
  });

  lista.sort((a, b) => {
    return a.nombre.localeCompare(
      b.nombre,
      "es",
      {
        sensitivity: "base",
        numeric: true
      }
    );
  });

  return lista;
}


function crearIdProducto(texto) {
  let hash = 0;

  for (
    let posicion = 0;
    posicion < texto.length;
    posicion++
  ) {
    hash =
      (hash << 5) -
      hash +
      texto.charCodeAt(posicion);

    hash |= 0;
  }

  return `producto-${Math.abs(hash)}`;
}


function compararPresentaciones(a, b) {
  const cantidadA =
    extraerCantidadPresentacion(a);

  const cantidadB =
    extraerCantidadPresentacion(b);

  if (
    cantidadA !== null &&
    cantidadB !== null &&
    cantidadA !== cantidadB
  ) {
    return cantidadA - cantidadB;
  }

  const textoA = normalizarTexto(a);
  const textoB = normalizarTexto(b);

  const esSinBidonA = textoA.includes("sin bidon") || textoA.includes("s/ bidon");
  const esSinBidonB = textoB.includes("sin bidon") || textoB.includes("s/ bidon");
  const esConBidonA = textoA.includes("con bidon") || textoA.includes("c/ bidon");
  const esConBidonB = textoB.includes("con bidon") || textoB.includes("c/ bidon");

  if (esSinBidonA && esConBidonB) return -1;
  if (esConBidonA && esSinBidonB) return 1;

  return a.localeCompare(
    b,
    "es",
    {
      sensitivity: "base",
      numeric: true
    }
  );
}


function extraerCantidadPresentacion(texto) {
  const valor = normalizarTexto(texto)
    .replace(",", ".");

  const coincidencia = valor.match(
    /(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|g|gr|grs|gramos|l|lt|lts|litro|litros|ml|cc)?/
  );

  if (!coincidencia) {
    return null;
  }

  let cantidad =
    Number(coincidencia[1]);

  const unidad =
    coincidencia[2] || "";

  if (!Number.isFinite(cantidad)) {
    return null;
  }

  if (
    unidad === "kg" ||
    unidad === "kilo" ||
    unidad === "kilos"
  ) {
    cantidad *= 1000;
  }

  if (
    unidad === "l" ||
    unidad === "lt" ||
    unidad === "lts" ||
    unidad === "litro" ||
    unidad === "litros"
  ) {
    cantidad *= 1000;
  }

  return cantidad;
}


function analizarMedidaPresentacion(textoPresentacion) {
  const texto = limpiarTexto(textoPresentacion);
  const expresion = /(\d+(?:[.,]\d+)?)\s*(kg|kilos?|g|grs?|gramos?|ml|cc|l|lts?|litros?|mm|cm|m|metros?|unidad(?:es)?|u)\b/giu;
  const coincidencias = [
    ...texto.matchAll(expresion)
  ];

  if (coincidencias.length === 0) {
    return null;
  }

  /* En medidas compuestas, por ejemplo 0,20 mm × 1 m de Kanthal,
     la cantidad que se multiplica es siempre la última: los metros. */
  const coincidencia =
    coincidencias[coincidencias.length - 1];
  const numeroOriginal = Number(
    coincidencia[1].replace(",", ".")
  );
  const unidadOriginal = coincidencia[2];
  const unidad = normalizarTexto(unidadOriginal);

  if (!Number.isFinite(numeroOriginal)) {
    return null;
  }

  let tipo = "unidades";
  let factorCanonico = 1;

  if (/^(kg|kilo|kilos)$/.test(unidad)) {
    tipo = "peso";
    factorCanonico = 1000;
  } else if (/^(g|gr|grs|gramo|gramos)$/.test(unidad)) {
    tipo = "peso";
  } else if (/^(l|lt|lts|litro|litros)$/.test(unidad)) {
    tipo = "volumen";
    factorCanonico = 1000;
  } else if (/^(ml|cc)$/.test(unidad)) {
    tipo = "volumen";
  } else if (unidad === "mm") {
    tipo = "longitud";
    factorCanonico = .001;
  } else if (unidad === "cm") {
    tipo = "longitud";
    factorCanonico = .01;
  } else if (/^(m|metro|metros)$/.test(unidad)) {
    tipo = "longitud";
  }

  const inicio = coincidencia.index;
  const fin = inicio + coincidencia[0].length;
  const familia = normalizarTexto(
    `${texto.slice(0, inicio)} ${texto.slice(fin)}`
  ).replace(/[^a-z0-9]+/g, " ").trim();

  return {
    texto,
    inicio,
    fin,
    numeroOriginal,
    unidadOriginal,
    tipo,
    factorCanonico,
    cantidadCanonica:
      numeroOriginal * factorCanonico,
    familia
  };
}


function formatearNumeroCantidad(valor) {
  return Number(valor).toLocaleString(
    "es-AR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }
  );
}


function formatearPresentacionTotal(
  presentacionBase,
  cantidadUnidades
) {
  const cantidad = Math.max(
    1,
    Number(cantidadUnidades) || 1
  );
  const medida =
    analizarMedidaPresentacion(
      presentacionBase
    );

  if (!medida) {
    return cantidad === 1
      ? formatearEtiquetaPresentacion(
          presentacionBase
        )
      : `${cantidad} ${formatearEtiquetaPresentacion(
          presentacionBase
        )}`;
  }

  const cantidadMostrada =
    formatearNumeroCantidad(
      medida.numeroOriginal * cantidad
    );
  const unidadNormalizada =
    normalizarTexto(
      medida.unidadOriginal
    );
  let unidadMostrada =
    medida.unidadOriginal;

  if (
    medida.numeroOriginal * cantidad !== 1
  ) {
    if (/^(unidad|u)$/.test(unidadNormalizada)) {
      unidadMostrada = "UNIDADES";
    } else if (unidadNormalizada === "metro") {
      unidadMostrada = "METROS";
    } else if (unidadNormalizada === "litro") {
      unidadMostrada = "LITROS";
    } else if (unidadNormalizada === "kilo") {
      unidadMostrada = "KILOS";
    } else if (unidadNormalizada === "gramo") {
      unidadMostrada = "GRAMOS";
    }
  }
  const presentacionTotal =
    medida.texto.slice(0, medida.inicio) +
    cantidadMostrada +
    " " +
    unidadMostrada +
    medida.texto.slice(medida.fin);

  return formatearEtiquetaPresentacion(
    presentacionTotal
  );
}


function formatearDiametroKanthal(
  presentacionBase
) {
  const presentacion =
    formatearEtiquetaPresentacion(
      presentacionBase
    );
  const coincidencia = presentacion.match(
    /^(.+?\s*mm)\s*[×x]\s*\d+(?:[.,]\d+)?\s*(?:m|metro|metros)\b/i
  );

  return coincidencia
    ? coincidencia[1].trim()
    : presentacion;
}


function formatearMetrosKanthal(
  presentacionBase,
  cantidadUnidades
) {
  const cantidad = Math.max(
    1,
    Number(cantidadUnidades) || 1
  );
  const medida =
    analizarMedidaPresentacion(
      presentacionBase
    );

  if (!medida) {
    return `${cantidad} m`;
  }

  const metros =
    medida.cantidadCanonica * cantidad;

  return `${formatearNumeroCantidad(metros)} m`;
}


function maximoComunDivisor(a, b) {
  let mayor = Math.abs(Math.round(a));
  let menor = Math.abs(Math.round(b));

  while (menor) {
    const resto = mayor % menor;
    mayor = menor;
    menor = resto;
  }

  return mayor || 1;
}


function calcularPrecioCantidadPresentacion(
  producto,
  indicePresentacion,
  cantidadUnidades
) {
  const cantidad = Math.max(
    1,
    Number(cantidadUnidades) || 1
  );
  const presentacionBase =
    producto?.presentaciones?.[
      indicePresentacion
    ];

  if (!presentacionBase) {
    return 0;
  }

  const precioBase =
    Number(presentacionBase.precio) || 0;
  const medidaBase =
    analizarMedidaPresentacion(
      presentacionBase.nombre
    );

  if (!medidaBase) {
    return precioBase * cantidad;
  }

  const opciones = producto.presentaciones
    .map((presentacion) => ({
      presentacion,
      medida:
        analizarMedidaPresentacion(
          presentacion.nombre
        )
    }))
    .filter(({ presentacion, medida }) => {
      return (
        medida &&
        medida.tipo === medidaBase.tipo &&
        medida.familia === medidaBase.familia &&
        Number(presentacion.precio) > 0
      );
    });

  if (opciones.length === 0) {
    return precioBase * cantidad;
  }

  const escala = 1000;
  const objetivoEntero = Math.round(
    medidaBase.cantidadCanonica *
      cantidad *
      escala
  );
  const valoresEnteros = opciones.map(
    ({ medida }) =>
      Math.round(
        medida.cantidadCanonica * escala
      )
  );
  const divisor = valoresEnteros.reduce(
    (acumulado, valor) =>
      maximoComunDivisor(acumulado, valor),
    objetivoEntero
  );
  const objetivo =
    Math.round(objetivoEntero / divisor);

  /* Evita cálculos grandes ante cantidades atípicas. */
  if (objetivo <= 0 || objetivo > 5000) {
    return precioBase * cantidad;
  }

  const opcionesReducidas = opciones.map(
    ({ presentacion }, indice) => ({
      cantidad: Math.round(
        valoresEnteros[indice] / divisor
      ),
      precio:
        Number(presentacion.precio) || 0
    })
  );
  const costos = new Array(
    objetivo + 1
  ).fill(Infinity);
  costos[0] = 0;

  for (
    let cantidadActual = 1;
    cantidadActual <= objetivo;
    cantidadActual++
  ) {
    opcionesReducidas.forEach((opcion) => {
      const anterior =
        cantidadActual - opcion.cantidad;

      if (
        anterior >= 0 &&
        Number.isFinite(costos[anterior])
      ) {
        costos[cantidadActual] = Math.min(
          costos[cantidadActual],
          costos[anterior] + opcion.precio
        );
      }
    });
  }

  return Number.isFinite(costos[objetivo])
    ? costos[objetivo]
    : precioBase * cantidad;
}


/* =========================================
   CATEGORÍAS Y FILTROS
========================================= */

function actualizarEstadoFiltroCategoria() {
  if (!filtroCategoria) {
    return;
  }

  filtroCategoria.classList.toggle(
    "categoria-activa",
    Boolean(filtroCategoria.value)
  );
}


function cerrarSelectoresPersonalizadosPC(excepto = null) {
  selectoresPersonalizadosPC.forEach((control, select) => {
    if (!select.isConnected) {
      selectoresPersonalizadosPC.delete(select);
      return;
    }

    if (control.raiz === excepto) {
      return;
    }

    control.raiz.classList.remove("abierto");
    control.boton.setAttribute("aria-expanded", "false");
    control.lista.hidden = true;
    control.raiz
      .closest(".tarjeta-producto")
      ?.classList.remove("selector-desplegado");
  });
}


function cerrarSelectorPersonalizadoPC(control) {
  if (!control) {
    return;
  }

  control.raiz.classList.remove("abierto");
  control.boton.setAttribute("aria-expanded", "false");
  control.lista.hidden = true;
  control.raiz
    .closest(".tarjeta-producto")
    ?.classList.remove("selector-desplegado");
}


function abrirSelectorPersonalizadoPC(control) {
  if (!control) {
    return;
  }

  cerrarSelectoresPersonalizadosPC(control.raiz);
  control.raiz.classList.add("abierto");
  control.boton.setAttribute("aria-expanded", "true");
  control.lista.hidden = false;
  control.raiz
    .closest(".tarjeta-producto")
    ?.classList.add("selector-desplegado");

  const opcionSeleccionada =
    control.lista.querySelector(".seleccionada");

  if (opcionSeleccionada) {
    requestAnimationFrame(() => {
      opcionSeleccionada.scrollIntoView({
        block: "nearest"
      });
    });
  }
}


function sincronizarSelectorPersonalizadoPC(select) {
  const control =
    selectoresPersonalizadosPC.get(select);

  if (!control) {
    return;
  }

  const opcionActual =
    select.options[select.selectedIndex] ||
    select.options[0];

  control.boton.textContent =
    opcionActual
      ? opcionActual.textContent.trim()
      : "";

  const seleccionActiva =
    select === filtroCategoria ||
    select.classList.contains(
      "selector-presentacion-alambre"
    )
      ? select.value !== ""
      : select.value !== "inicial";

  control.raiz.classList.toggle(
    "seleccion-activa",
    seleccionActiva
  );

  control.lista.replaceChildren();

  Array.from(select.options).forEach((opcion) => {
    const botonOpcion =
      document.createElement("button");

    botonOpcion.type = "button";
    botonOpcion.className =
      "select-personalizado-opcion-pc";
    botonOpcion.textContent =
      opcion.textContent.trim();
    botonOpcion.dataset.value =
      opcion.value;
    botonOpcion.setAttribute("role", "option");

    const seleccionada =
      opcion.value === select.value;

    botonOpcion.classList.toggle(
      "seleccionada",
      seleccionada
    );
    botonOpcion.setAttribute(
      "aria-selected",
      seleccionada ? "true" : "false"
    );

    botonOpcion.addEventListener(
      "click",
      () => {
        select.value = opcion.value;
        select.dispatchEvent(
          new Event("change", {
            bubbles: true
          })
        );
        sincronizarSelectorPersonalizadoPC(
          select
        );
        cerrarSelectorPersonalizadoPC(
          control
        );
        control.boton.focus({
          preventScroll: true
        });
      }
    );

    control.lista.appendChild(
      botonOpcion
    );
  });
}


function crearSelectorPersonalizadoPC(
  select,
  clase,
  referencia
) {
  if (
    !select ||
    !referencia ||
    selectoresPersonalizadosPC.has(select)
  ) {
    return;
  }

  const raiz = document.createElement("div");
  raiz.className =
    `select-personalizado-pc ${clase}`;

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className =
    "select-personalizado-boton-pc";
  boton.setAttribute("aria-haspopup", "listbox");
  boton.setAttribute("aria-expanded", "false");

  const lista = document.createElement("div");
  lista.className =
    "select-personalizado-lista-pc";
  lista.id = `lista-${select.id}-pc`;
  lista.setAttribute("role", "listbox");
  lista.hidden = true;

  boton.setAttribute(
    "aria-controls",
    lista.id
  );
  boton.setAttribute(
    "aria-label",
    select.getAttribute("aria-label") ||
      (select === filtroCategoria
        ? "Categorías"
        : "Filtros")
  );

  raiz.append(boton, lista);
  referencia.insertAdjacentElement(
    "afterend",
    raiz
  );

  const control = {
    raiz,
    boton,
    lista,
    select
  };

  selectoresPersonalizadosPC.set(
    select,
    control
  );

  boton.addEventListener("click", () => {
    if (raiz.classList.contains("abierto")) {
      cerrarSelectorPersonalizadoPC(control);
    } else {
      abrirSelectorPersonalizadoPC(control);
    }
  });

  boton.addEventListener("keydown", (evento) => {
    if (
      evento.key === "ArrowDown" ||
      evento.key === "ArrowUp"
    ) {
      evento.preventDefault();
      abrirSelectorPersonalizadoPC(control);

      const opciones =
        Array.from(
          lista.querySelectorAll(
            ".select-personalizado-opcion-pc"
          )
        );
      const seleccionada =
        lista.querySelector(".seleccionada");
      const indiceSeleccionada =
        Math.max(0, opciones.indexOf(seleccionada));
      const desplazamiento =
        evento.key === "ArrowDown" ? 1 : -1;
      const indice = Math.min(
        opciones.length - 1,
        Math.max(
          0,
          indiceSeleccionada + desplazamiento
        )
      );

      opciones[indice]?.focus();
    }
  });

  lista.addEventListener("keydown", (evento) => {
    const opciones =
      Array.from(
        lista.querySelectorAll(
          ".select-personalizado-opcion-pc"
        )
      );
    const indiceActual =
      opciones.indexOf(document.activeElement);

    if (
      evento.key === "ArrowDown" ||
      evento.key === "ArrowUp"
    ) {
      evento.preventDefault();
      const desplazamiento =
        evento.key === "ArrowDown" ? 1 : -1;
      const indice = Math.min(
        opciones.length - 1,
        Math.max(0, indiceActual + desplazamiento)
      );
      opciones[indice]?.focus();
    }

    if (evento.key === "Escape") {
      evento.preventDefault();
      cerrarSelectorPersonalizadoPC(control);
      boton.focus({ preventScroll: true });
    }
  });

  select.addEventListener("change", () => {
    sincronizarSelectorPersonalizadoPC(
      select
    );
  });

  sincronizarSelectorPersonalizadoPC(select);
}


function inicializarSelectoresPersonalizadosPC() {
  crearSelectorPersonalizadoPC(
    filtroCategoria,
    "select-personalizado-categoria-pc",
    filtroCategoria
  );

  const controlOrdenNativo =
    ordenarProductos
      ? ordenarProductos.closest(".control-orden")
      : null;

  crearSelectorPersonalizadoPC(
    ordenarProductos,
    "select-personalizado-orden-pc",
    controlOrdenNativo
  );

  document.addEventListener("click", (evento) => {
    if (
      !evento.target.closest?.(
        ".select-personalizado-pc"
      )
    ) {
      cerrarSelectoresPersonalizadosPC();
    }
  });

  window
    .matchMedia("(min-width: 651px)")
    .addEventListener?.("change", () => {
      cerrarSelectoresPersonalizadosPC();
    });
}


function cargarCategorias() {
  const categoriaSeleccionada =
    filtroCategoria.value;

  const categorias = [
    ...new Set(
      productosAgrupados
        .map(
          (producto) =>
            producto.categoria
        )
        .filter(Boolean)
    )
  ].sort((a, b) => {
    return a.localeCompare(
      b,
      "es",
      {
        sensitivity: "base"
      }
    );
  });

  filtroCategoria.innerHTML = `
    <option value="">
      Todos los productos
    </option>
  `;

  categorias.forEach((categoria) => {
    const opcion =
      document.createElement("option");

    opcion.value = categoria;
    opcion.textContent = categoria;

    filtroCategoria.appendChild(opcion);
  });

  if (
    categoriaSeleccionada &&
    categorias.includes(categoriaSeleccionada)
  ) {
    filtroCategoria.value =
      categoriaSeleccionada;
  }

  actualizarEstadoFiltroCategoria();
  sincronizarSelectorPersonalizadoPC(
    filtroCategoria
  );
}


function filtrarProductos() {
  if (productoCompartidoPendiente) {
    const productoCompartido =
      productosAgrupados.find(
        (producto) =>
          producto.id ===
          productoCompartidoPendiente
      );

    productosMostrados =
      productoCompartido
        ? [productoCompartido]
        : [];

    mostrarProductos(productosMostrados);
    mostrarModoProductoCompartido(
      Boolean(productoCompartido)
    );

    if (!productoCompartido) {
      estado.textContent =
        "El producto compartido ya no está disponible.";
    }

    return;
  }

  ocultarModoProductoCompartido();

  const palabrasBuscadas =
    normalizarTexto(buscador.value)
      .split(/\s+/)
      .filter(Boolean);

  const categoriaElegida =
    filtroCategoria.value;

  productosMostrados =
    productosAgrupados.filter(
      (producto) => {
        const contenido =
          normalizarTexto(
            [
              producto.nombre,
              producto.categoria,
              producto.descripcion,
              producto.indicaciones,
              ...producto.presentaciones.map(
                (presentacion) => {
                  return [
                    presentacion.nombre,
                    presentacion.codigo
                  ].join(" ");
                }
              )
            ].join(" ")
          );

        const coincideBusqueda =
          palabrasBuscadas.every(
            (palabra) =>
              contenido.includes(palabra)
          );

        const coincideCategoria =
          categoriaElegida === "" ||
          producto.categoria ===
            categoriaElegida;

        return (
          coincideBusqueda &&
          coincideCategoria
        );
      }
    );

  ordenarListaProductos(productosMostrados);
  mostrarProductos(productosMostrados);
}


function obtenerPrecioReferencia(producto) {
  return Math.min(
    ...producto.presentaciones.map(
      (presentacion) =>
        Number(presentacion.precio) || Infinity
    )
  );
}


function ordenarListaProductos(lista) {
  const criterio =
    ordenarProductos
      ? ordenarProductos.value
      : "inicial";

  if (criterio === "inicial") {
    return;
  }

  lista.sort((a, b) => {
    if (criterio === "precio-asc") {
      return (
        obtenerPrecioReferencia(a) -
        obtenerPrecioReferencia(b)
      );
    }

    if (criterio === "precio-desc") {
      return (
        obtenerPrecioReferencia(b) -
        obtenerPrecioReferencia(a)
      );
    }

    return 0;
  });
}


/* =========================================
   TARJETAS DE PRODUCTOS
========================================= */

const consultaMovilTarjetas =
  window.matchMedia("(max-width: 650px)");

let ajusteMovilProgramado = 0;


function limpiarAjustesMovilesTarjetas() {
  document
    .querySelectorAll(".tarjeta-producto.titulo-tres-lineas")
    .forEach((tarjeta) =>
      tarjeta.classList.remove("titulo-tres-lineas")
    );

  document
    .querySelectorAll(".acciones-producto")
    .forEach((acciones) =>
      acciones.style.removeProperty("top")
    );

  document
    .querySelectorAll(".opciones-presentacion")
    .forEach((contenedor) => {
      contenedor.style.removeProperty("flex-wrap");
      contenedor.style.removeProperty("gap");
    });

  document
    .querySelectorAll(".boton-presentacion")
    .forEach((boton) => {
      [
        "height",
        "min-height",
        "max-height",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "font-size",
        "line-height",
        "border-radius",
        "white-space"
      ].forEach((propiedad) =>
        boton.style.removeProperty(propiedad)
      );
    });
}


function aplicarEscalaPresentaciones(
  contenedor,
  botones,
  escala,
  medidasBase
) {
  const alto =
    medidasBase.alto * escala;

  contenedor.style.setProperty(
    "flex-wrap",
    "nowrap",
    "important"
  );
  contenedor.style.setProperty(
    "gap",
    `${medidasBase.separacion * escala}px`,
    "important"
  );

  botones.forEach((boton) => {
    boton.style.setProperty(
      "height",
      `${alto}px`,
      "important"
    );
    boton.style.setProperty(
      "min-height",
      `${alto}px`,
      "important"
    );
    boton.style.setProperty(
      "max-height",
      `${alto}px`,
      "important"
    );
    boton.style.setProperty(
      "padding-top",
      `${medidasBase.paddingVertical * escala}px`,
      "important"
    );
    boton.style.setProperty(
      "padding-right",
      `${medidasBase.paddingHorizontal * escala}px`,
      "important"
    );
    boton.style.setProperty(
      "padding-bottom",
      `${medidasBase.paddingVertical * escala}px`,
      "important"
    );
    boton.style.setProperty(
      "padding-left",
      `${medidasBase.paddingHorizontal * escala}px`,
      "important"
    );
    boton.style.setProperty(
      "font-size",
      `${medidasBase.fuente * escala}px`,
      "important"
    );
    boton.style.setProperty(
      "line-height",
      "1",
      "important"
    );
    boton.style.setProperty(
      "border-radius",
      `${medidasBase.radio * escala}px`,
      "important"
    );
    boton.style.setProperty(
      "white-space",
      "nowrap",
      "important"
    );
  });
}


function ajustarPresentacionesTarjetaMovil(
  tarjeta
) {
  const contenedor =
    tarjeta.querySelector(
      ".opciones-presentacion"
    );

  if (!contenedor) {
    return;
  }

  if (
    contenedor.querySelector(
      ".opcion-presentacion-integrada"
    )
  ) {
    return;
  }

  const botones = [
    ...contenedor.querySelectorAll(
      ".boton-presentacion"
    )
  ];

  if (
    botones.length === 0 ||
    contenedor.clientWidth === 0
  ) {
    return;
  }

  contenedor.style.removeProperty("gap");

  botones.forEach((boton) => {
    [
      "height",
      "min-height",
      "max-height",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "font-size",
      "line-height",
      "border-radius",
      "white-space"
    ].forEach((propiedad) =>
      boton.style.removeProperty(propiedad)
    );
  });

  const estiloBoton =
    getComputedStyle(botones[0]);

  const medidasBase = {
    alto:
      botones[0].getBoundingClientRect().height,
    fuente:
      parseFloat(estiloBoton.fontSize) || 16,
    paddingVertical:
      parseFloat(estiloBoton.paddingTop) || 0,
    paddingHorizontal:
      parseFloat(estiloBoton.paddingLeft) || 0,
    radio:
      parseFloat(estiloBoton.borderRadius) || 7,
    separacion:
      parseFloat(
        getComputedStyle(contenedor).gap
      ) || 5
  };

  let escala = 1;

  while (escala > 0.3) {
    aplicarEscalaPresentaciones(
      contenedor,
      botones,
      escala,
      medidasBase
    );

    const anchoOcupado =
      botones.reduce(
        (total, boton) =>
          total +
          boton.getBoundingClientRect().width,
        0
      ) +
      medidasBase.separacion *
        escala *
        Math.max(0, botones.length - 1);

    if (
      anchoOcupado <=
      contenedor.clientWidth + 1
    ) {
      break;
    }

    escala -= 0.03;
  }
}


function actualizarLineasTituloTarjetaMovil(tarjeta) {
  const titulo = tarjeta.querySelector(".fila-titulo-producto h2");

  tarjeta.classList.remove("titulo-tres-lineas");

  if (!titulo || !consultaMovilTarjetas.matches) {
    return;
  }

  const estilo = getComputedStyle(titulo);
  const altoLinea = parseFloat(estilo.lineHeight);

  if (!altoLinea || !Number.isFinite(altoLinea)) {
    return;
  }

  /* scrollHeight conserva la altura natural del texto aunque esté recortado
     por line-clamp; así sólo marcamos los títulos que realmente requieren
     una tercera línea al ancho actual de la tarjeta. */
  const lineasNaturales = titulo.scrollHeight / altoLinea;

  tarjeta.classList.toggle(
    "titulo-tres-lineas",
    lineasNaturales > 2.35
  );
}


function centrarAccionesFotoTarjetaMovil(tarjeta) {
  const encabezado = tarjeta.querySelector(".encabezado-producto");
  const foto = tarjeta.querySelector(".contenedor-foto-producto");
  const acciones = tarjeta.querySelector(".acciones-producto");
  const compartir = acciones?.querySelector(".compartir-producto");
  const selector = acciones?.querySelector(".selector-comparacion");

  if (!encabezado || !foto || !acciones) {
    return;
  }

  acciones.style.setProperty("display", "flex", "important");
  acciones.style.setProperty("flex-direction", "column", "important");
  acciones.style.setProperty("align-items", "flex-end", "important");
  acciones.style.setProperty("justify-content", "flex-start", "important");
  acciones.style.setProperty("gap", "12px", "important");
  acciones.style.setProperty("right", "6px", "important");

  if (compartir) {
    compartir.style.setProperty("order", "1", "important");
  }

  if (selector) {
    selector.style.setProperty("order", "2", "important");
  }

  const rectEncabezado = encabezado.getBoundingClientRect();
  const rectFoto = foto.getBoundingClientRect();

  if (!rectFoto.height) {
    return;
  }

  const parteSuperiorFoto =
    rectFoto.top - rectEncabezado.top;

  const top = parteSuperiorFoto + 22;

  acciones.style.setProperty(
    "top",
    `${Math.round(top * 10) / 10}px`,
    "important"
  );
}


function ajustarTarjetasMoviles() {
  if (!consultaMovilTarjetas.matches) {
    limpiarAjustesMovilesTarjetas();
    return;
  }

  document
    .querySelectorAll(".tarjeta-producto")
    .forEach((tarjeta) => {
      actualizarLineasTituloTarjetaMovil(
        tarjeta
      );

      ajustarPresentacionesTarjetaMovil(
        tarjeta
      );

      centrarAccionesFotoTarjetaMovil(
        tarjeta
      );
    });
}


function programarAjusteTarjetasMoviles() {
  if (ajusteMovilProgramado) {
    cancelAnimationFrame(
      ajusteMovilProgramado
    );
  }

  ajusteMovilProgramado =
    requestAnimationFrame(() => {
      ajusteMovilProgramado =
        requestAnimationFrame(() => {
          ajusteMovilProgramado = 0;
          ajustarTarjetasMoviles();
        });
    });
}


window.addEventListener(
  "resize",
  programarAjusteTarjetasMoviles
);

function mostrarProductos(lista) {
  contenedorProductos.innerHTML = "";

  if (lista.length === 0) {
    contenedorProductos.innerHTML = `
      <div class="sin-resultados">
        No se encontraron productos.
      </div>
    `;

    estado.textContent =
      "0 productos encontrados";

    return;
  }

  lista.forEach((producto) => {
    contenedorProductos.appendChild(
      crearTarjetaProducto(producto)
    );
  });

  estado.textContent =
    `${lista.length} productos encontrados`;

  sincronizarBotonesComparacion();
  programarAjusteTarjetasMoviles();
}


function obtenerEscalasRecorteProducto(nombreProducto) {
  const nombreNormalizado = normalizarTexto(nombreProducto)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const reglas = [
    [/oxido de cromo verde/, 1.84, 1.95],
    [/bidon(?: de)? boca ancha/, 2.18],
    [/arena de rutilo/, 1.52],
    [/bentonita/, 1.28],
    [/carbonato de bario/, 1.30],
    [/carbonato de calcio/, 1.30],
    [/^cuarzo(?:\b|$)/, 1.30],
    [/harina de rutilo/, 1.46, 1.72],
    [/ox(?:ido)?(?: de)? cobalto/, 1.38, 1.82],
    [/ox(?:ido)?(?: de)? cobre negro/, 1.42, 1.73],
    [/ox(?:ido)?(?: de)? hierro amarillo/, 1.44, 1.74],
    [/ox(?:ido)?(?: de)? hierro rojo/, 1.44, 1.74],
    [/ox(?:ido)?(?: de)? manganeso/, 1.40, 1.82],
    [/ox(?:ido)?(?: de)? niquel/, 1.40, 1.82],
    [/ox(?:ido)?(?: de)? titanio/, 1.40, 1.69],
    [/silicato de (?:circonio|zirconio)/, 1.45, 1.72],
    [/^oxido(?: de)? /, 1.00, 1.72],
    [/talco chino/, 1.30],
    [/feldespato potasico/, 1.28],
    [/feldespato sodico/, 1.28]
  ];

  const regla = reglas.find(([patron]) =>
    patron.test(nombreNormalizado)
  );

  let escritorio = regla ? regla[1] : 1;
  let movil = regla
    ? (regla[2] || regla[1])
    : 1;

  let zoomEscritorio = escritorio;
  let zoomMovil = movil;

  /*
    v195: los esmaltes traen margen blanco incorporado en sus archivos.
    Se usa una ampliacion uniforme y moderada en tarjeta, carrito y zoom.
    El Silicato de sodio conserva su encuadre en la tarjeta, pero recibe el
    mismo recorte visual al abrir el zoom. Nunca se altera la proporcion.
  */
  const esEsmalte = /^esmalte(?:\b|$)/.test(nombreNormalizado);
  const esSilicatoDeSodio = /silicato de sodio/.test(nombreNormalizado);

  if (esEsmalte) {
    escritorio = Math.max(escritorio, 1.28);
    movil = Math.max(movil, 1.28);
    zoomEscritorio = Math.max(zoomEscritorio, 1.28);
    zoomMovil = Math.max(zoomMovil, 1.28);
  }

  if (esSilicatoDeSodio) {
    /*
      La foto del Silicato necesita escalas distintas por la relacion de
      aspecto de cada pantalla: en PC se muestra completa para conservar la
      tapa; en movil se amplia para retirar el margen blanco visible.
    */
    zoomEscritorio = 1;
    zoomMovil = Math.max(zoomMovil, 2.10);
  }

  return {
    escritorio,
    movil,
    zoomEscritorio,
    zoomMovil,
    miniatura: Math.max(escritorio, movil)
  };
}


function crearTarjetaProducto(
  producto,
  opciones = {}
) {
  const esComparacion =
    Boolean(opciones.esComparacion);

  const productoInicialCarrito =
    carritoCompras.find((item) => {
      return (
        normalizarTexto(item.nombre) ===
          normalizarTexto(producto.nombre) &&
        normalizarTexto(item.categoria) ===
          normalizarTexto(producto.categoria) &&
        producto.presentaciones.some(
          (presentacion) =>
            normalizarTexto(
              presentacion.nombre
            ) ===
            normalizarTexto(
              item.presentacionBase ||
                item.presentacion
            )
        )
      );
    });

  const indicePresentacionInicial =
    Math.max(
      0,
      productoInicialCarrito
        ? producto.presentaciones.findIndex(
            (presentacion) =>
              normalizarTexto(
                presentacion.nombre
              ) ===
              normalizarTexto(
                productoInicialCarrito.presentacionBase ||
                  productoInicialCarrito.presentacion
              )
          )
        : 0
    );
  const presentacionInicial =
    producto.presentaciones[
      indicePresentacionInicial
    ] || producto.presentaciones[0];
  const presentacionInicialSeleccionada =
    Boolean(productoInicialCarrito);

  const tarjeta =
    document.createElement("article");

  tarjeta.className =
    esComparacion
      ? "tarjeta-producto tarjeta-en-comparacion"
      : "tarjeta-producto";

  const esAlambreKanthal =
    normalizarTexto(producto.nombre) ===
    "alambre kanthal a1";

  if (esAlambreKanthal) {
    tarjeta.classList.add(
      "tarjeta-alambre-kanthal"
    );
  }

  if (producto.presentaciones.length === 1) {
    tarjeta.classList.add(
      "tarjeta-presentacion-unica"
    );
  }

  tarjeta.dataset.idProducto = producto.id;
  tarjeta.dataset.nombre = producto.nombre;
  tarjeta.dataset.nombrePlural = producto.nombrePlural || "";
  tarjeta.dataset.categoria = producto.categoria;
  tarjeta.dataset.presentacion = presentacionInicial.nombre;
  tarjeta.dataset.precio = String(presentacionInicial.precio);
  tarjeta.dataset.codigo = presentacionInicial.codigo || "";
  tarjeta.dataset.indicePresentacion =
    String(indicePresentacionInicial);
  tarjeta.dataset.presentacionSeleccionada =
    String(presentacionInicialSeleccionada);

  const productoInicialEnCarrito =
    Boolean(productoInicialCarrito);

  const cantidadInicialProducto =
    productoInicialCarrito
      ? Math.max(
          1,
          Number(productoInicialCarrito.cantidad) || 1
        )
      : 1;

  tarjeta.dataset.cantidadUnidades =
    String(cantidadInicialProducto);

  const estaSeleccionado =
    productosSeleccionadosComparacion.includes(
      producto.id
    );

  const botonesPresentaciones =
    producto.presentaciones
      .map((presentacion, indicePresentacion) => `
        <button
          type="button"
          class="boton-presentacion ${
            presentacionInicialSeleccionada &&
            indicePresentacion === indicePresentacionInicial
              ? "seleccionada"
              : ""
          }"
          data-id-producto="${producto.id}"
          data-indice-presentacion="${indicePresentacion}"
          aria-pressed="${
            presentacionInicialSeleccionada &&
            indicePresentacion === indicePresentacionInicial
          }"
        >
          <span
            class="etiqueta-presentacion-integrada"
            data-etiqueta-base="${escaparHTML(
              formatearEtiquetaPresentacion(
                presentacion.nombre
              )
            )}"
          >${escaparHTML(
              formatearEtiquetaPresentacion(
                presentacion.nombre
              )
          )}</span>
        </button>
      `)
      .join("");

  const usarSelectorAlambre =
    esAlambreKanthal;

  const opcionesSelectorAlambre =
    `
      <option value="" ${
        presentacionInicialSeleccionada
          ? ""
          : "selected"
      }>Diámetro</option>
    ` +
    producto.presentaciones
      .map((presentacion, indicePresentacion) => `
        <option
          value="${indicePresentacion}"
          data-etiqueta-base="${escaparHTML(
            formatearDiametroKanthal(
              presentacion.nombre
            )
          )}"
          ${
            presentacionInicialSeleccionada &&
            indicePresentacion === indicePresentacionInicial
              ? "selected"
              : ""
          }
        >
          ${escaparHTML(
            formatearDiametroKanthal(
              presentacion.nombre
            )
          )}
        </option>
      `)
      .join("");

  const controlPresentaciones =
    usarSelectorAlambre
      ? `
        <div class="control-presentacion-alambre-integrado ${
          presentacionInicialSeleccionada
            ? "seleccionada"
            : ""
        }">
          <div class="selector-diametro-alambre">
            <select
              id="selector-alambre-${producto.id}-${
                esComparacion ? "comparacion" : "catalogo"
              }"
              class="selector-presentacion selector-presentacion-alambre ${
                presentacionInicialSeleccionada
                  ? "seleccionada"
                  : ""
              }"
              data-id-producto="${producto.id}"
              aria-label="Elegir diámetro de ${escaparHTML(
                producto.nombre
              )}"
            >
              ${opcionesSelectorAlambre}
            </select>
          </div>
        </div>
        `
      : `
          <div
            class="opciones-presentacion"
            role="group"
            aria-label="Presentaciones de ${escaparHTML(
              producto.nombre
            )}"
          >
            ${botonesPresentaciones}
          </div>
        `;

  /*
    v188: el recorte deja de depender de que el producto tenga varias fotos.
    Ese criterio hacía que algunas bolsas ya bien encuadradas (por ejemplo
    Arcilla APM Rosada y Caolín Sur del Río) quedaran cortadas.

    Ahora solo se amplían los productos cuyo archivo realmente trae mucho
    blanco incorporado, y cada grupo usa una escala moderada propia.
    Ancho y alto siempre se escalan por igual: nunca se deforma la foto.
  */
  const escalasRecorte =
    obtenerEscalasRecorteProducto(
      producto.nombre
    );

  const escalaRecorteMargenBlanco =
    escalasRecorte.escritorio;

  const escalaRecorteMargenBlancoMovil =
    escalasRecorte.movil;

  const escalaRecorteMargenBlancoZoom =
    escalasRecorte.zoomEscritorio;

  const escalaRecorteMargenBlancoZoomMovil =
    escalasRecorte.zoomMovil;

  const productoRequiereRecorteMargenBlanco =
    Math.max(
      escalaRecorteMargenBlanco,
      escalaRecorteMargenBlancoMovil
    ) > 1.001;

  const fotos = [];

  (
    Array.isArray(producto.fotos) && producto.fotos.length
      ? producto.fotos
      : (producto.foto ? [producto.foto] : [])
  ).forEach((valorFoto) => {
    const urlFoto = normalizarURLImagen(valorFoto);

    if (
      urlFoto &&
      !fotos.includes(urlFoto) &&
      fotos.length < 4
    ) {
      fotos.push(urlFoto);
    }
  });

  const foto = fotos[0] || "";

  /*
    No se recortan automáticamente los productos por tener 2, 3 o 4 fotos.
    Solo se aplica la escala definida arriba cuando realmente corresponde.
  */
  const recortarMargenBlanco =
    productoRequiereRecorteMargenBlanco;

  tarjeta.dataset.foto = foto;



  tarjeta.innerHTML = `
    <div class="encabezado-producto">
      <div class="fila-titulo-producto">
        <h2>${escaparHTML(producto.nombre)}</h2>
      </div>

      <p class="codigo-producto">
        ${
          presentacionInicial.codigo
            ? escaparHTML(presentacionInicial.codigo)
          : ""
        }
      </p>

      <div class="acciones-producto">
        <button
          type="button"
          class="compartir-producto"
          data-id-producto="${producto.id}"
          aria-label="Compartir ${escaparHTML(producto.nombre)}"
          title="Compartir producto"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="18" cy="5" r="2.25"></circle>
            <circle cx="6" cy="12" r="2.25"></circle>
            <circle cx="18" cy="19" r="2.25"></circle>
            <path d="m8 10.9 7.8-4.55M8 13.1l7.8 4.55"></path>
          </svg>
        </button>

        ${
          !esComparacion
            ? `
              <button
                type="button"
                class="selector-comparacion ${
                  estaSeleccionado ? "seleccionado" : ""
                }"
                data-id-producto="${producto.id}"
                aria-pressed="${estaSeleccionado}"
                aria-label="${
                  estaSeleccionado ? "Quitar" : "Elegir"
                } ${escaparHTML(producto.nombre)} para comparar"
              >
                <span class="casilla-comparacion" aria-hidden="true">${
                  estaSeleccionado ? "✓" : ""
                }</span>
                <span class="texto-selector-comparacion">${
                  estaSeleccionado ? "Elegido" : "Elegir"
                }</span>
              </button>
            `
            : ""
        }
      </div>
    </div>

    <div class="contenedor-foto-producto ${foto ? "" : "sin-foto"}">

      <img
        src="${foto ? escaparHTML(foto) : "img/logo-minimal.svg"}"
        alt="${foto ? escaparHTML(producto.nombre) : ""}"
        class="foto-producto ${foto ? (recortarMargenBlanco ? "foto-recorte-margen-blanco" : "") : "foto-placeholder"}"
        loading="lazy"
        referrerpolicy="no-referrer"
      >

      ${
        fotos.length > 1
          ? `
            <button
              type="button"
              class="foto-navegacion foto-anterior"
              aria-label="Foto anterior de ${escaparHTML(producto.nombre)}"
            >‹</button>

            <button
              type="button"
              class="foto-navegacion foto-siguiente"
              aria-label="Foto siguiente de ${escaparHTML(producto.nombre)}"
            >›</button>

            <div class="foto-indicadores" aria-hidden="true">
              ${fotos.map((_, indiceFoto) => `
                <span
                  class="foto-indicador ${indiceFoto === 0 ? "activo" : ""}"
                ></span>
              `).join("")}
            </div>
          `
          : ""
      }
    </div>

    <div class="fila-compra">
      <div class="informacion-precio">
        <p
          class="precio"
          data-precio="${presentacionInicial.precio}"
        >
          ${formatearPrecio(presentacionInicial.precio)}
        </p>
      </div>

      <div class="bloque-presentaciones">
        ${controlPresentaciones}
      </div>

      <div class="selector-cantidad">
        <div class="control-cantidad">
          <button
            type="button"
            class="boton-cantidad restar"
            aria-label="Disminuir cantidad"
          >−</button>

          <input
            type="number"
            class="cantidad ${
              productoInicialEnCarrito
                ? "cantidad-agregada"
                : ""
            }"
            value="${cantidadInicialProducto}"
            min="1"
            step="1"
            aria-label="Cantidad"
          >

          <button
            type="button"
            class="boton-cantidad sumar"
            aria-label="Aumentar cantidad"
          >+</button>
        </div>
      </div>

      <button
        type="button"
        class="agregar-carrito ${
          productoInicialEnCarrito ? "agregado" : ""
        }"
        aria-label="${productoInicialEnCarrito ? "Producto agregado" : "Agregar al carrito"}"
        title="${productoInicialEnCarrito ? "Producto agregado" : "Agregar al carrito"}"
      >
        <span class="icono-agregar" aria-hidden="true">
          <svg viewBox="0 0 28 24" focusable="false">
            <path
              class="contorno-agregar-carrito"
              d="M1.8 2.6h3.1l2.5 11.7h15.8l2.1-8.2H6.1"
            ></path>
            <circle class="rueda-agregar-carrito" cx="9.2" cy="19.6" r="1.6"></circle>
            <circle class="rueda-agregar-carrito" cx="21.4" cy="19.6" r="1.6"></circle>
          </svg>
        </span>
        <span class="texto-agregar-carrito">
          ${productoInicialEnCarrito ? "Agregado" : "Agregar"}
        </span>
      </button>
    </div>

    <div class="zona-detalles-producto">
      <button
        type="button"
        class="ver-detalles"
        data-id-producto="${producto.id}"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="modalInformacionProducto"
      >
        Más info
      </button>
    </div>
  `;

  const imagenProducto =
    tarjeta.querySelector(".foto-producto");

  if (imagenProducto && foto) {
    const contenedorFoto =
      tarjeta.querySelector(".contenedor-foto-producto");

    let indiceFotoActual = 0;

    imagenProducto.dataset.fotos =
      JSON.stringify(fotos);
    imagenProducto.dataset.indiceFoto = "0";
    imagenProducto.dataset.recorteMargenBlanco =
      recortarMargenBlanco ? "true" : "false";
    imagenProducto.dataset.escalaRecorte =
      String(escalaRecorteMargenBlanco || 1);
    imagenProducto.dataset.escalaRecorteMovil =
      String(escalaRecorteMargenBlancoMovil || escalaRecorteMargenBlanco || 1);
    imagenProducto.dataset.recorteMargenBlancoZoom =
      Math.max(
        escalaRecorteMargenBlancoZoom,
        escalaRecorteMargenBlancoZoomMovil
      ) > 1.001
        ? "true"
        : "false";
    imagenProducto.dataset.escalaRecorteZoom =
      String(escalaRecorteMargenBlancoZoom || 1);
    imagenProducto.dataset.escalaRecorteZoomMovil =
      String(
        escalaRecorteMargenBlancoZoomMovil ||
        escalaRecorteMargenBlancoZoom ||
        1
      );
    imagenProducto.style.setProperty(
      "--ceraceci-escala-foto",
      String(escalaRecorteMargenBlanco || 1)
    );
    imagenProducto.style.setProperty(
      "--ceraceci-escala-foto-movil",
      String(escalaRecorteMargenBlancoMovil || escalaRecorteMargenBlanco || 1)
    );
    imagenProducto.classList.toggle(
      "foto-recorte-margen-blanco",
      recortarMargenBlanco
    );

    const indicadoresFoto =
      Array.from(
        tarjeta.querySelectorAll(".foto-indicador")
      );

    const actualizarIndicadoresFoto = () => {
      indicadoresFoto.forEach((indicador, indice) => {
        indicador.classList.toggle(
          "activo",
          indice === indiceFotoActual
        );
      });
    };

    const mostrarFoto = (nuevoIndice) => {
      if (fotos.length === 0) {
        return;
      }

      indiceFotoActual =
        (nuevoIndice + fotos.length) % fotos.length;

      imagenProducto.dataset.indiceFoto =
        String(indiceFotoActual);

      imagenProducto.classList.toggle(
        "foto-recorte-margen-blanco",
        imagenProducto.dataset.recorteMargenBlanco === "true"
      );

      imagenProducto.dataset.imagenAlternativa = "false";
      imagenProducto.classList.remove("foto-placeholder");
      contenedorFoto?.classList.remove("sin-foto");
      imagenProducto.alt = producto.nombre;
      imagenProducto.src = fotos[indiceFotoActual];

      actualizarIndicadoresFoto();

      if (typeof imagenProducto.animate === "function") {
        imagenProducto.animate(
          [
            { opacity: 0.35 },
            { opacity: 1 }
          ],
          {
            duration: 160,
            easing: "ease-out"
          }
        );
      }
    };

    const mostrarImagenAlternativa = () => {
      if (
        imagenProducto.dataset.imagenAlternativa ===
        "true"
      ) {
        return;
      }

      imagenProducto.dataset.imagenAlternativa =
        "true";
      imagenProducto.src = "img/logo-minimal.svg";
      imagenProducto.alt = "";
      imagenProducto.classList.add(
        "foto-placeholder"
      );
      imagenProducto.classList.remove(
        "foto-recorte-margen-blanco"
      );
      contenedorFoto?.classList.add("sin-foto");
    };

    imagenProducto.addEventListener(
      "error",
      mostrarImagenAlternativa
    );

    tarjeta
      .querySelector(".foto-anterior")
      ?.addEventListener("click", (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        mostrarFoto(indiceFotoActual - 1);
      });

    tarjeta
      .querySelector(".foto-siguiente")
      ?.addEventListener("click", (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        mostrarFoto(indiceFotoActual + 1);
      });

    /*
      En móvil, Foto 1..4 se recorren deslizando horizontalmente.
      Las flechas están ocultas por CSS, pero los puntos siguen visibles.
    */
    let touchInicioFoto = null;
    let bloquearClickFotoHasta = 0;

    contenedorFoto?.addEventListener(
      "touchstart",
      (evento) => {
        if (
          window.innerWidth > 650 ||
          fotos.length <= 1 ||
          evento.touches.length !== 1
        ) {
          touchInicioFoto = null;
          return;
        }

        const toque = evento.touches[0];
        touchInicioFoto = {
          x: toque.clientX,
          y: toque.clientY
        };
      },
      { passive:true }
    );

    contenedorFoto?.addEventListener(
      "touchend",
      (evento) => {
        if (
          !touchInicioFoto ||
          window.innerWidth > 650 ||
          fotos.length <= 1 ||
          evento.changedTouches.length !== 1
        ) {
          touchInicioFoto = null;
          return;
        }

        const toque = evento.changedTouches[0];
        const dx = toque.clientX - touchInicioFoto.x;
        const dy = toque.clientY - touchInicioFoto.y;
        touchInicioFoto = null;

        if (
          Math.abs(dx) < 38 ||
          Math.abs(dx) <= Math.abs(dy) * 1.15
        ) {
          return;
        }

        bloquearClickFotoHasta = Date.now() + 420;
        mostrarFoto(
          indiceFotoActual + (dx < 0 ? 1 : -1)
        );
      },
      { passive:true }
    );

    imagenProducto.addEventListener(
      "click",
      (evento) => {
        if (Date.now() >= bloquearClickFotoHasta) {
          return;
        }

        evento.preventDefault();
        evento.stopImmediatePropagation();
        evento.stopPropagation();
      },
      true
    );

    if (
      imagenProducto.complete &&
      imagenProducto.naturalWidth === 0
    ) {
      mostrarImagenAlternativa();
    }
  }

  const selectorAlambre =
    tarjeta.querySelector(
      ".selector-presentacion-alambre"
    );

  if (selectorAlambre) {
    crearSelectorPersonalizadoPC(
      selectorAlambre,
      "select-personalizado-presentacion-pc",
      selectorAlambre
    );
  }

  actualizarControlPresentacionIntegrado(
    tarjeta
  );
  actualizarEstadoBotonTarjeta(tarjeta);

  return tarjeta;
}


function obtenerProductoPorId(idProducto) {
  return productosAgrupados.find(
    (producto) => producto.id === idProducto
  ) || null;
}


function obtenerTextoInformacionProducto(producto) {
  if (!producto) {
    return "";
  }

  if (producto.masInformacion) {
    return producto.masInformacion;
  }

  const partes = [];

  if (producto.descripcion) {
    partes.push(
      `DESCRIPCIÓN\n\n${producto.descripcion}`
    );
  }

  if (producto.indicaciones) {
    partes.push(
      `INDICACIONES DE USO\n\n${producto.indicaciones}`
    );
  }

  return partes.join("\n\n");
}


function esEncabezadoFichaTecnica(linea) {
  const texto = limpiarTexto(linea);

  if (
    !texto ||
    texto.length > 90 ||
    texto.includes(":")
  ) {
    return false;
  }

  const letras = texto.match(/\p{L}/gu) || [];

  if (letras.length < 3) {
    return false;
  }

  return texto === texto.toLocaleUpperCase("es-AR");
}


function convertirFichaTecnicaAHTML(texto, nombreProducto = "") {
  let lineas = String(texto || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");

  while (lineas.length && !limpiarTexto(lineas[0])) {
    lineas.shift();
  }

  while (
    lineas.length &&
    nombreProducto &&
    normalizarTexto(lineas[0]) === normalizarTexto(nombreProducto)
  ) {
    lineas.shift();

    while (lineas.length && !limpiarTexto(lineas[0])) {
      lineas.shift();
    }
  }

  /*
    Las fichas estandarizadas pueden comenzar con el nombre completo
    del producto y luego DATOS CLAVE. El título ya se muestra fijo
    en el encabezado del modal, por eso evitamos repetir esa primera línea.
  */
  if (
    lineas.length > 1 &&
    esEncabezadoFichaTecnica(lineas[0]) &&
    normalizarTexto(lineas[0]) !== "datos clave"
  ) {
    const indiceSiguienteContenido = lineas.findIndex(
      (linea, indice) =>
        indice > 0 && limpiarTexto(linea)
    );

    if (
      indiceSiguienteContenido > 0 &&
      normalizarTexto(
        lineas[indiceSiguienteContenido]
      ) === "datos clave"
    ) {
      lineas = lineas.slice(indiceSiguienteContenido);
    }
  }

  const partes = [];
  let listaAbierta = false;

  const cerrarLista = () => {
    if (!listaAbierta) {
      return;
    }

    partes.push("</ul>");
    listaAbierta = false;
  };

  lineas.forEach((lineaOriginal) => {
    const linea = limpiarTexto(lineaOriginal);

    if (!linea) {
      cerrarLista();
      return;
    }

    const coincidenciaVinyeta = linea.match(/^[•·▪◦-]\s*(.+)$/u);

    if (coincidenciaVinyeta) {
      if (!listaAbierta) {
        partes.push('<ul class="ficha-lista">');
        listaAbierta = true;
      }

      partes.push(
        `<li>${escaparHTML(coincidenciaVinyeta[1])}</li>`
      );
      return;
    }

    cerrarLista();

    if (esEncabezadoFichaTecnica(linea)) {
      const claseDatosClave =
        normalizarTexto(linea) === "datos clave"
          ? " ficha-datos-clave"
          : "";

      partes.push(
        `<h3 class="ficha-seccion${claseDatosClave}">${escaparHTML(linea)}</h3>`
      );
      return;
    }

    const indiceDosPuntos = linea.indexOf(":");

    if (
      indiceDosPuntos > 0 &&
      indiceDosPuntos <= 42
    ) {
      const etiqueta = linea.slice(0, indiceDosPuntos + 1);
      const valor = linea.slice(indiceDosPuntos + 1).trim();

      partes.push(
        `<p class="ficha-linea-clave"><strong>${escaparHTML(etiqueta)}</strong>${valor ? ` ${escaparHTML(valor)}` : ""}</p>`
      );
      return;
    }

    partes.push(
      `<p>${escaparHTML(linea)}</p>`
    );
  });

  cerrarLista();

  return partes.join("");
}


function abrirModalInformacionProducto(boton) {
  if (
    !modalInformacionProducto ||
    !modalInfoTitulo ||
    !modalInfoContenido ||
    !cerrarModalInfo
  ) {
    return;
  }

  const idProducto =
    boton?.dataset.idProducto ||
    boton
      ?.closest(".tarjeta-producto")
      ?.dataset.idProducto ||
    "";

  const producto = obtenerProductoPorId(idProducto);

  if (!producto) {
    return;
  }

  const texto =
    obtenerTextoInformacionProducto(producto) ||
    "Información pendiente de cargar.";

  if (botonInformacionAnterior && botonInformacionAnterior !== boton) {
    botonInformacionAnterior.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  botonInformacionAnterior = boton || null;
  botonInformacionAnterior?.setAttribute(
    "aria-expanded",
    "true"
  );

  modalInfoTitulo.textContent = producto.nombre;
  modalInfoContenido.innerHTML =
    convertirFichaTecnicaAHTML(
      texto,
      producto.nombre
    );
  modalInfoContenido.scrollTop = 0;

  modalInformacionProducto.classList.add("abierto");
  modalInformacionProducto.setAttribute(
    "aria-hidden",
    "false"
  );
  document.body.classList.add(
    "modal-info-abierto"
  );

  requestAnimationFrame(() => {
    cerrarModalInfo.focus({ preventScroll: true });
  });
}


function cerrarModalInformacionProducto() {
  if (
    !modalInformacionProducto ||
    !modalInformacionProducto.classList.contains("abierto")
  ) {
    return false;
  }

  modalInformacionProducto.classList.remove("abierto");
  modalInformacionProducto.setAttribute(
    "aria-hidden",
    "true"
  );
  document.body.classList.remove(
    "modal-info-abierto"
  );

  const botonParaRestaurar = botonInformacionAnterior;

  botonInformacionAnterior?.setAttribute(
    "aria-expanded",
    "false"
  );
  botonInformacionAnterior = null;

  if (modalInfoTitulo) {
    modalInfoTitulo.textContent = "";
  }

  if (modalInfoContenido) {
    modalInfoContenido.innerHTML = "";
    modalInfoContenido.scrollTop = 0;
  }

  botonParaRestaurar?.focus?.({
    preventScroll: true
  });

  return true;
}


function alternarProductoComparacion(idProducto) {
  const indice =
    productosSeleccionadosComparacion.indexOf(
      idProducto
    );

  if (indice !== -1) {
    productosSeleccionadosComparacion.splice(
      indice,
      1
    );
  } else {
    if (
      productosSeleccionadosComparacion.length >= 4
    ) {
      mostrarAvisoCopiado(
        "Podés comparar hasta 4 productos."
      );

      return;
    }

    productosSeleccionadosComparacion.push(
      idProducto
    );
  }

  if (
    comparacionAbierta &&
    productosSeleccionadosComparacion.length < 2
  ) {
    cerrarVistaComparacion();
  } else if (comparacionAbierta) {
    mostrarProductosComparados();
  }

  actualizarEstadoComparacion();
  programarAjusteTarjetasMoviles();
}


function sincronizarBotonesComparacion() {
  if (!contenedorProductos) {
    return;
  }

  contenedorProductos
    .querySelectorAll(".tarjeta-producto")
    .forEach((tarjeta) => {
      const seleccionado =
        productosSeleccionadosComparacion.includes(
          tarjeta.dataset.idProducto
        );

      tarjeta.classList.toggle(
        "seleccionado-comparacion",
        seleccionado
      );
      tarjeta.tabIndex =
        modoSeleccionComparacion ? 0 : -1;

      tarjeta
        .querySelectorAll(
          "button, input, select, a"
        )
        .forEach((control) => {
          if (modoSeleccionComparacion) {
            control.tabIndex = -1;
          } else {
            control.removeAttribute("tabindex");
          }
        });

      const selector =
        tarjeta.querySelector(
          ".selector-comparacion"
        );

      if (!selector) {
        return;
      }

      selector.classList.toggle(
        "seleccionado",
        seleccionado
      );
      selector.setAttribute(
        "aria-pressed",
        String(seleccionado)
      );
      selector.tabIndex = -1;
      selector.setAttribute(
        "aria-label",
        `${seleccionado ? "Quitar" : "Elegir"} ${tarjeta.dataset.nombre || "producto"} para comparar`
      );

      const casilla =
        selector.querySelector(
          ".casilla-comparacion"
        );

      if (casilla) {
        casilla.textContent =
          seleccionado ? "✓" : "";
      }

      const texto =
        selector.querySelector(
          ".texto-selector-comparacion"
        );

      if (texto) {
        texto.textContent =
          seleccionado ? "Elegido" : "Elegir";

        if (seleccionado) {
          texto.style.setProperty("color", "#fff", "important");
          texto.style.setProperty("-webkit-text-fill-color", "#fff", "important");
        } else {
          texto.style.removeProperty("color");
          texto.style.removeProperty("-webkit-text-fill-color");
        }
      }
    });
}


function actualizarEstadoComparacion() {
  const cantidad =
    productosSeleccionadosComparacion.length;

  if (barraComparacion) {
    barraComparacion.hidden =
      !modoSeleccionComparacion ||
      comparacionAbierta ||
      Boolean(productoCompartidoPendiente);
  }

  if (resumenComparacion) {
    resumenComparacion.textContent =
      cantidad === 0
        ? "0 elegidos · seleccioná de 2 a 4"
        : cantidad === 1
          ? "1 elegido · falta 1"
          : `${cantidad} productos elegidos`;
  }

  if (abrirComparacion) {
    /* En escritorio se conserva el mínimo anterior de 2 productos. */
    abrirComparacion.disabled = cantidad < 2;
  }

  if (abrirComparacionMovil) {
    abrirComparacionMovil.textContent = `Comparar ${cantidad}/4`;
    abrirComparacionMovil.disabled = cantidad < 1;
  }

  if (accionesComparacionMovil) {
    accionesComparacionMovil.hidden = !modoSeleccionComparacion;
  }

  botonesModoComparacion.forEach((boton) => {
    boton.textContent = "Comparar productos";
    boton.setAttribute(
      "aria-pressed",
      String(modoSeleccionComparacion)
    );
    boton.disabled = modoSeleccionComparacion;

    if (boton.classList.contains("activar-modo-comparacion-movil")) {
      boton.hidden = modoSeleccionComparacion;
    }
  });

  document.body.classList.toggle(
    "modo-comparacion",
    modoSeleccionComparacion
  );


  sincronizarBotonesComparacion();
}


function activarModoComparacion() {
  if (
    comparacionAbierta ||
    productoCompartidoPendiente
  ) {
    return;
  }

  modoSeleccionComparacion = true;
  productosSeleccionadosComparacion = [];
  actualizarEstadoComparacion();
}


function cancelarModoComparacion() {
  modoSeleccionComparacion = false;
  productosSeleccionadosComparacion = [];

  if (productosComparados) {
    productosComparados.innerHTML = "";
    productosComparados.dataset.cantidad = "0";
  }

  actualizarEstadoComparacion();
}


function alternarModoComparacion() {
  if (!modoSeleccionComparacion) {
    activarModoComparacion();
  }
}


function mostrarProductosComparados() {
  if (!productosComparados) {
    return;
  }

  const seleccionados =
    productosSeleccionadosComparacion
      .map((idProducto) =>
        productosAgrupados.find(
          (producto) =>
            producto.id === idProducto
        )
      )
      .filter(Boolean);

  productosSeleccionadosComparacion =
    seleccionados.map(
      (producto) => producto.id
    );

  productosComparados.innerHTML = "";
  productosComparados.dataset.cantidad =
    String(seleccionados.length);

  seleccionados.forEach((producto) => {
    productosComparados.appendChild(
      crearTarjetaProducto(
        producto,
        { esComparacion: true }
      )
    );
  });

  actualizarEstadoComparacion();
}


function abrirVistaComparacion() {
  if (
    productosSeleccionadosComparacion.length < 1 ||
    !seccionComparacion
  ) {
    return;
  }

  comparacionAbierta = true;
  modoSeleccionComparacion = false;
  seccionComparacion.hidden = false;
  contenedorProductos.hidden = true;

  if (seccionBusqueda) {
    seccionBusqueda.hidden = true;
  }

  document.body.classList.add(
    "comparacion-abierta"
  );

  mostrarProductosComparados();
  actualizarEstadoComparacion();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function cerrarVistaComparacion() {
  comparacionAbierta = false;

  if (seccionComparacion) {
    seccionComparacion.hidden = true;
  }

  contenedorProductos.hidden = false;

  if (seccionBusqueda) {
    seccionBusqueda.hidden = false;
  }

  document.body.classList.remove(
    "comparacion-abierta"
  );

  actualizarEstadoComparacion();
  programarAjusteTarjetasMoviles();
}


function vaciarSeleccionComparacion() {
  productosSeleccionadosComparacion = [];
  modoSeleccionComparacion = false;

  if (comparacionAbierta) {
    cerrarVistaComparacion();
  }

  /* Elimina también las tarjetas de la vista oculta para que al volver
     al catálogo no quede ningún estado visual anterior en el DOM. */
  if (productosComparados) {
    productosComparados.innerHTML = "";
    productosComparados.dataset.cantidad = "0";
  }

  actualizarEstadoComparacion();
}


function volverDesdeComparacion() {
  vaciarSeleccionComparacion();
}


function obtenerProductoDeTarjeta(tarjeta) {
  return productosAgrupados.find(
    (producto) =>
      producto.id ===
      tarjeta?.dataset.idProducto
  );
}


function animarPrecioActualizado(elementoPrecio) {
  if (!elementoPrecio) {
    return;
  }

  elementoPrecio.classList.remove(
    "precio-actualizado"
  );
  void elementoPrecio.offsetWidth;
  elementoPrecio.classList.add(
    "precio-actualizado"
  );

  window.clearTimeout(
    elementoPrecio._temporizadorActualizacion
  );
  elementoPrecio._temporizadorActualizacion =
    window.setTimeout(() => {
      elementoPrecio.classList.remove(
        "precio-actualizado"
      );
    }, 320);
}


function actualizarControlPresentacionIntegrado(
  tarjeta,
  animarPrecio = false
) {
  const producto =
    obtenerProductoDeTarjeta(tarjeta);

  if (!producto) {
    return;
  }

  const indicePresentacion = Math.max(
    0,
    Number(
      tarjeta.dataset.indicePresentacion
    ) || 0
  );
  const presentacion =
    producto.presentaciones[
      indicePresentacion
    ] || producto.presentaciones[0];
  const campoCantidad =
    tarjeta.querySelector(".cantidad");
  const cantidad = Math.max(
    1,
    Number(campoCantidad?.value) ||
      Number(tarjeta.dataset.cantidadUnidades) ||
      1
  );
  const seleccionada =
    tarjeta.dataset.presentacionSeleccionada ===
    "true";
  const etiquetaTotal =
    formatearPresentacionTotal(
      presentacion.nombre,
      cantidad
    );

  tarjeta.dataset.indicePresentacion =
    String(indicePresentacion);
  tarjeta.dataset.presentacion =
    presentacion.nombre;
  tarjeta.dataset.precio =
    String(presentacion.precio);
  tarjeta.dataset.codigo =
    presentacion.codigo || "";
  tarjeta.dataset.cantidadUnidades =
    String(cantidad);

  if (campoCantidad) {
    campoCantidad.value = String(cantidad);
  }

  tarjeta
    .querySelectorAll(
      ".boton-presentacion"
    )
    .forEach((botonPresentacion) => {
      const etiqueta =
        botonPresentacion.querySelector(
          ".etiqueta-presentacion-integrada"
        );
      const indiceOpcion = Number(
        botonPresentacion.dataset.indicePresentacion
      );
      const esActual =
        seleccionada &&
        indiceOpcion === indicePresentacion;

      botonPresentacion.classList.toggle(
        "seleccionada",
        esActual
      );
      botonPresentacion.setAttribute(
        "aria-pressed",
        esActual ? "true" : "false"
      );

      if (etiqueta) {
        etiqueta.textContent =
          etiqueta.dataset.etiquetaBase || "";
      }
    });

  const selectorAlambre =
    tarjeta.querySelector(
      ".selector-presentacion-alambre"
    );

  if (selectorAlambre) {
    Array.from(selectorAlambre.options)
      .forEach((opcion) => {
        if (
          opcion.dataset.etiquetaBase
        ) {
          opcion.textContent =
            opcion.dataset.etiquetaBase;
        }
      });

    selectorAlambre.value = seleccionada
      ? String(indicePresentacion)
      : "";
    selectorAlambre.classList.toggle(
      "seleccionada",
      seleccionada
    );
    selectorAlambre
      .closest(
        ".control-presentacion-alambre-integrado"
      )
      ?.classList.toggle(
        "seleccionada",
        seleccionada
      );

    const cantidadMetros =
      tarjeta.querySelector(
        ".cantidad-metros-alambre"
      );

    if (cantidadMetros) {
      cantidadMetros.textContent =
        formatearMetrosKanthal(
          presentacion.nombre,
          cantidad
        );
    }

    sincronizarSelectorPersonalizadoPC(
      selectorAlambre
    );
  }

  const precioTotal =
    calcularPrecioCantidadPresentacion(
      producto,
      indicePresentacion,
      cantidad
    );
  const elementoPrecio =
    tarjeta.querySelector(".precio");

  tarjeta.dataset.precioTotal =
    String(precioTotal);
  tarjeta.dataset.presentacionTotal =
    etiquetaTotal;

  if (elementoPrecio) {
    const precioVisible =
      formatearPrecio(
        Number(presentacion.precio) || 0
      );
    const precioCambio =
      elementoPrecio.textContent !== precioVisible;

    elementoPrecio.dataset.precio =
      String(presentacion.precio);
    elementoPrecio.textContent = precioVisible;

    if (animarPrecio && precioCambio) {
      animarPrecioActualizado(
        elementoPrecio
      );
    }
  }

  const codigo =
    tarjeta.querySelector(
      ".codigo-producto"
    );

  if (codigo) {
    codigo.textContent =
      presentacion.codigo || "";
  }
}


function seleccionarPresentacion(control) {
  const tarjeta =
    control.closest(".tarjeta-producto");
  const producto =
    obtenerProductoDeTarjeta(tarjeta);
  const esSelectorPresentacion =
    control.matches(".selector-presentacion");

  if (!producto) {
    return;
  }

  if (
    esSelectorPresentacion &&
    control.value === ""
  ) {
    tarjeta.dataset.presentacionSeleccionada =
      "false";
    tarjeta.querySelector(".cantidad").value = "1";
    actualizarControlPresentacionIntegrado(
      tarjeta,
      true
    );
    actualizarEstadoBotonTarjeta(tarjeta);
    programarAjusteTarjetasMoviles();
    return;
  }

  const indicePresentacion =
    esSelectorPresentacion
      ? Number(control.value)
      : Number(
          control.dataset.indicePresentacion
        );
  const yaEstabaSeleccionada =
    tarjeta.dataset.presentacionSeleccionada ===
      "true" &&
    Number(
      tarjeta.dataset.indicePresentacion
    ) === indicePresentacion;
  const seDeselecciona =
    !esSelectorPresentacion &&
    yaEstabaSeleccionada;

  tarjeta.dataset.indicePresentacion =
    String(indicePresentacion);
  tarjeta.dataset.presentacionSeleccionada =
    String(!seDeselecciona);
  tarjeta.querySelector(".cantidad").value = "1";

  sincronizarCantidadTarjetaConCarrito(tarjeta);
  actualizarControlPresentacionIntegrado(
    tarjeta,
    true
  );
  actualizarEstadoBotonTarjeta(tarjeta);
  programarAjusteTarjetasMoviles();
}


function establecerSeleccionCantidadTarjeta(
  tarjeta,
  seleccionada
) {
  if (!tarjeta) {
    return;
  }

  const controlCantidad =
    tarjeta.querySelector(".control-cantidad");

  if (!controlCantidad) {
    return;
  }

  controlCantidad.classList.toggle(
    "seleccionado",
    Boolean(seleccionada)
  );

  controlCantidad
    .querySelectorAll(".boton-cantidad.seleccionado")
    .forEach((botonCantidad) => {
      botonCantidad.classList.remove("seleccionado");
    });
}


function cambiarCantidadTarjeta(
  boton,
  variacion
) {
  const tarjeta =
    boton.closest(".tarjeta-producto");

  if (
    tarjeta.querySelector(
      ".selector-presentacion-alambre"
    ) &&
    tarjeta.dataset.presentacionSeleccionada !==
      "true"
  ) {
    mostrarAvisoCopiado(
      "Elegí un diámetro"
    );
    boton.blur?.();
    return;
  }

  const campoCantidad =
    tarjeta.querySelector(".cantidad");

  const cantidadActual =
    Math.max(
      1,
      Number(campoCantidad.value) || 1
    );

  const cantidadNueva = Math.max(
    1,
    cantidadActual + variacion
  );

  if (cantidadNueva === cantidadActual) {
    if (
      tarjeta.classList.contains(
        "tarjeta-presentacion-unica"
      ) &&
      window.matchMedia(
        "(min-width: 651px)"
      ).matches
    ) {
      marcarBotonTarjetaComoPendiente(
        tarjeta
      );
      campoCantidad.classList.add(
        "cantidad-seleccionada"
      );
      actualizarControlPresentacionIntegrado(
        tarjeta
      );
    }

    boton.blur?.();
    return;
  }

  campoCantidad.value =
    cantidadNueva;

  tarjeta.dataset.cantidadUnidades =
    campoCantidad.value;

  /* Se marca únicamente el valor central; los signos permanecen neutros. */
  establecerSeleccionCantidadTarjeta(
    tarjeta,
    false
  );

  /* Evita que el foco conserve estilos de una pulsación anterior. */
  boton.classList.remove("seleccionado");
  if (typeof boton.blur === "function") {
    boton.blur();
  }

  normalizarCantidadTarjeta(tarjeta);
  marcarBotonTarjetaComoPendiente(tarjeta);
  campoCantidad.classList.add(
    "cantidad-seleccionada"
  );

  actualizarControlPresentacionIntegrado(
    tarjeta,
    true
  );
}


function normalizarCantidadTarjeta(tarjeta) {
  const campoCantidad =
    tarjeta.querySelector(".cantidad");

  const cantidad =
    Math.max(
      1,
      Number(campoCantidad.value) || 1
    );

  campoCantidad.value = cantidad;
  tarjeta.dataset.cantidadUnidades =
    String(cantidad);
}


function sincronizarCantidadTarjetaConCarrito(tarjeta) {
  const campoCantidad =
    tarjeta?.querySelector(".cantidad");

  if (!campoCantidad) {
    return;
  }

  const claveTarjeta =
    crearClaveCarrito({
      nombre:
        tarjeta.dataset.nombre || "",

      presentacion:
        tarjeta.dataset.presentacion || "",

      codigo:
        tarjeta.dataset.codigo || ""
    });

  const productoEnCarrito =
    carritoCompras.find((producto) => {
      return (
        crearClaveCarrito(producto) ===
        claveTarjeta
      );
    });

  campoCantidad.value = productoEnCarrito
    ? Math.max(
        1,
        Number(productoEnCarrito.cantidad) || 1
      )
    : 1;

  tarjeta.dataset.cantidadUnidades =
    campoCantidad.value;

  if (productoEnCarrito) {
    tarjeta.dataset.presentacionSeleccionada =
      "true";
  }

  campoCantidad.classList.remove(
    "cantidad-seleccionada"
  );

  actualizarControlPresentacionIntegrado(
    tarjeta
  );
}


function restablecerSeleccionesTarjetasDespuesDeVaciar() {
  [contenedorProductos, productosComparados]
    .filter(Boolean)
    .forEach((contenedor) => {
      contenedor
        .querySelectorAll(".tarjeta-producto")
        .forEach((tarjeta) => {
          const campoCantidad =
            tarjeta.querySelector(".cantidad");

          if (campoCantidad) {
            campoCantidad.value = 1;
            campoCantidad.classList.remove(
              "cantidad-seleccionada",
              "cantidad-agregada"
            );
          }

          tarjeta.dataset.indicePresentacion =
            "0";
          tarjeta.dataset.cantidadUnidades =
            "1";

          tarjeta
            .querySelector(".control-cantidad")
            ?.classList.remove("seleccionado");

          tarjeta
            .querySelectorAll(
              ".boton-cantidad.seleccionado"
            )
            .forEach((boton) => {
              boton.classList.remove("seleccionado");
            });

          tarjeta
            .querySelectorAll(
              ".boton-presentacion.seleccionada"
            )
            .forEach((boton) => {
              boton.classList.remove("seleccionada");
              boton.setAttribute("aria-pressed", "false");
            });

          const selectorPresentacion =
            tarjeta.querySelector(
              ".selector-presentacion"
            );

          if (selectorPresentacion) {
            selectorPresentacion.value = "";
            selectorPresentacion.classList.remove(
              "seleccionada"
            );
            sincronizarSelectorPersonalizadoPC(
              selectorPresentacion
            );
          }

          const producto =
            productosAgrupados.find(
              (item) =>
                item.id === tarjeta.dataset.idProducto
            );

          const presentacionInicial =
            producto?.presentaciones?.[0];

          if (presentacionInicial) {
            tarjeta.dataset.presentacionSeleccionada =
              "false";
            tarjeta.dataset.presentacion =
              presentacionInicial.nombre;
            tarjeta.dataset.precio =
              String(presentacionInicial.precio);
            tarjeta.dataset.codigo =
              presentacionInicial.codigo || "";

            const precio =
              tarjeta.querySelector(".precio");
            if (precio) {
              precio.dataset.precio =
                String(presentacionInicial.precio);
              precio.textContent =
                formatearPrecio(
                  presentacionInicial.precio
                );
              precio.classList.remove(
                "precio-actualizado"
              );
            }

            const codigo =
              tarjeta.querySelector(
                ".codigo-producto"
              );
            if (codigo) {
              codigo.textContent =
                presentacionInicial.codigo || "";
            }

            tarjeta
              .querySelectorAll(
                ".presentacion-agregada"
              )
              .forEach((control) =>
                control.classList.remove(
                  "presentacion-agregada"
                )
              );

            actualizarControlPresentacionIntegrado(
              tarjeta
            );
          }
        });
    });
}




async function compartirProducto(idProducto) {
  const url = new URL(window.location.href);

  url.search = "";
  url.searchParams.set(
    "producto",
    idProducto
  );

  try {
    if (
      navigator.share &&
      window.matchMedia(
        "(max-width: 800px)"
      ).matches
    ) {
      await navigator.share({
        title: "Producto Ceraceci",
        url: url.toString()
      });

      return;
    }

    await navigator.clipboard.writeText(
      url.toString()
    );

    mostrarAvisoCopiado();
  } catch (error) {
    if (
      error &&
      error.name === "AbortError"
    ) {
      return;
    }

    window.prompt(
      "Copiá este enlace:",
      url.toString()
    );
  }
}


function mostrarAvisoCopiado(
  mensaje = "Enlace copiado"
) {
  if (!avisoCopiado) {
    return;
  }

  avisoCopiado.textContent = mensaje;

  avisoCopiado.classList.add("visible");

  window.clearTimeout(
    mostrarAvisoCopiado.temporizador
  );

  mostrarAvisoCopiado.temporizador =
    window.setTimeout(() => {
      avisoCopiado.classList.remove(
        "visible"
      );
    }, 2200);
}


function mostrarModoProductoCompartido(productoDisponible) {
  document.body.classList.add(
    "modo-producto-compartido"
  );

  if (seccionBusqueda) {
    seccionBusqueda.hidden = true;
  }

  if (avisoProductoCompartido) {
    avisoProductoCompartido.hidden = false;
    avisoProductoCompartido.classList.toggle(
      "producto-no-disponible",
      !productoDisponible
    );
  }

  if (productoDisponible) {
    estado.textContent =
      "Producto compartido";

    const tarjeta =
      contenedorProductos.querySelector(
        ".tarjeta-producto"
      );

    if (tarjeta) {
      tarjeta.classList.add(
        "producto-compartido-unico"
      );
    }
  }
}


function ocultarModoProductoCompartido() {
  document.body.classList.remove(
    "modo-producto-compartido"
  );

  if (seccionBusqueda) {
    seccionBusqueda.hidden = false;
  }

  if (avisoProductoCompartido) {
    avisoProductoCompartido.hidden = true;
    avisoProductoCompartido.classList.remove(
      "producto-no-disponible"
    );
  }
}


function mostrarCatalogoCompleto() {
  productoCompartidoPendiente = null;

  const url = new URL(window.location.href);
  url.searchParams.delete("producto");

  window.history.replaceState(
    {},
    "",
    url.toString()
  );

  filtrarProductos();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================
   CARRITO
========================================= */

const CANTIDAD_CARRITO_LLENO = 5;


function obtenerCantidadTotalCarrito() {
  return carritoCompras.reduce(
    (total, producto) => {
      return total +
        Math.max(
          0,
          Number(producto.cantidad) || 0
        );
    },
    0
  );
}


function calcularNivelCargaCarrito(cantidad) {
  if (cantidad <= 0) {
    return 0;
  }

  return Math.min(
    1,
    0.18 +
      cantidad *
        (0.82 / CANTIDAD_CARRITO_LLENO)
  );
}


function actualizarCargaVisualCarrito(cantidad) {
  if (!iconoCarrito) {
    return;
  }

  const cantidadValida =
    Number.isFinite(Number(cantidad))
      ? Math.max(0, Number(cantidad))
      : obtenerCantidadTotalCarrito();

  iconoCarrito.style.setProperty(
    "--nivel-carga-carrito",
    calcularNivelCargaCarrito(
      cantidadValida
    ).toFixed(3)
  );
}


function hacerReaccionarCarrito() {
  if (!iconoCarrito) {
    return;
  }

  iconoCarrito.classList.remove(
    "recibiendo-producto"
  );

  void iconoCarrito.offsetWidth;

  iconoCarrito.classList.add(
    "recibiendo-producto"
  );

  window.setTimeout(() => {
    iconoCarrito.classList.remove(
      "recibiendo-producto"
    );
  }, 700);
}


function animarProductoHaciaCarrito(
  boton,
  cantidadAnterior,
  cantidadNueva
) {
  actualizarCargaVisualCarrito(
    cantidadAnterior
  );

  if (
    !boton ||
    !iconoCarrito ||
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    actualizarCargaVisualCarrito(
      cantidadNueva
    );
    hacerReaccionarCarrito();
    return;
  }

  const origen =
    boton.getBoundingClientRect();

  const destino =
    iconoCarrito.getBoundingClientRect();

  const productoVolador =
    document.createElement("span");

  productoVolador.className =
    "producto-volador-carrito";

  const inicioX =
    origen.left + origen.width / 2 - 10.5;

  const inicioY =
    origen.top + origen.height / 2 - 10.5;

  const desplazamientoX =
    destino.left + destino.width / 2 -
    (inicioX + 10.5);

  const desplazamientoY =
    destino.top + destino.height / 2 -
    (inicioY + 10.5);

  productoVolador.style.left =
    `${inicioX}px`;

  productoVolador.style.top =
    `${inicioY}px`;

  document.body.appendChild(
    productoVolador
  );

  const finalizarAnimacion = () => {
    productoVolador.remove();
    actualizarCargaVisualCarrito(
      cantidadNueva
    );
    hacerReaccionarCarrito();
  };

  if (typeof productoVolador.animate !== "function") {
    window.setTimeout(
      finalizarAnimacion,
      820
    );
    return;
  }

  const animacion =
    productoVolador.animate(
      [
        {
          transform:
            "translate(0, 0) scale(1) rotate(0deg)",
          opacity: 1
        },
        {
          transform:
            `translate(${desplazamientoX * 0.48}px, ${desplazamientoY * 0.48 - 44}px) scale(.94) rotate(150deg)`,
          opacity: 1,
          offset: .52
        },
        {
          transform:
            `translate(${desplazamientoX}px, ${desplazamientoY}px) scale(.28) rotate(320deg)`,
          opacity: .15
        }
      ],
      {
        duration: 820,
        easing: "cubic-bezier(.25,.75,.2,1)",
        fill: "forwards"
      }
    );

  animacion.addEventListener(
    "finish",
    finalizarAnimacion,
    { once: true }
  );

  animacion.addEventListener(
    "cancel",
    finalizarAnimacion,
    { once: true }
  );
}

function agregarProductoAlCarrito(boton) {
  const tarjeta =
    boton.closest(".tarjeta-producto");

  /* Si existe una sola presentacion, Agregar la elige automaticamente. */
  if (
    tarjeta.dataset.presentacionSeleccionada !==
      "true" &&
    tarjeta.classList.contains(
      "tarjeta-presentacion-unica"
    )
  ) {
    tarjeta.dataset.indicePresentacion = "0";
    tarjeta.dataset.presentacionSeleccionada =
      "true";
    actualizarControlPresentacionIntegrado(
      tarjeta,
      true
    );
  }

  if (
    tarjeta.dataset.presentacionSeleccionada !==
    "true"
  ) {
    mostrarAvisoCopiado(
      tarjeta.querySelector(
        ".selector-presentacion-alambre"
      )
        ? "Elegí un diámetro"
        : "Elegí una presentación"
    );
    return;
  }

  if (boton.classList.contains("agregado")) {
    return;
  }

  const cantidadAnterior =
    obtenerCantidadTotalCarrito();

  const campoCantidad =
    tarjeta.querySelector(".cantidad");

  const cantidad =
    Math.max(
      1,
      Number(campoCantidad.value) || 1
    );

  tarjeta.dataset.presentacionSeleccionada =
    "true";
  tarjeta.dataset.cantidadUnidades =
    String(cantidad);
  actualizarControlPresentacionIntegrado(
    tarjeta
  );

  const producto = {
    nombre:
      tarjeta.dataset.nombre,

    nombrePlural: "",

    categoria:
      tarjeta.dataset.categoria,

    presentacion:
      tarjeta.dataset.presentacion,

    presentacionBase:
      tarjeta.dataset.presentacion,

    presentacionTotal:
      formatearEtiquetaPresentacion(
        tarjeta.dataset.presentacion
      ),

    precio:
      Number(
        tarjeta.dataset.precio
      ) || 0,

    precioTotal:
      Number(
        tarjeta.dataset.precioTotal
      ) ||
      (Number(tarjeta.dataset.precio) || 0) *
        cantidad,

    indicePresentacion:
      Number(
        tarjeta.dataset.indicePresentacion
      ) || 0,

    codigo:
      tarjeta.dataset.codigo || "",

    foto:
      tarjeta.dataset.foto || "",

    cantidad
  };

  const clave =
    crearClaveCarrito(producto);

  const productoExistente =
    carritoCompras.find((item) => {
      return (
        crearClaveCarrito(item) ===
        clave
      );
    });

  if (productoExistente) {
    productoExistente.cantidad = cantidad;
    productoExistente.presentacionTotal =
      producto.presentacionTotal;
    productoExistente.precioTotal =
      producto.precioTotal;
    productoExistente.indicePresentacion =
      producto.indicePresentacion;
  } else {
    carritoCompras.push(producto);
  }

  establecerSeleccionCantidadTarjeta(
    tarjeta,
    false
  );

  campoCantidad.classList.add(
    "cantidad-agregada"
  );

  guardarYActualizarCarrito();
  actualizarEstadoBotonTarjeta(tarjeta);

  animarProductoHaciaCarrito(
    boton,
    cantidadAnterior,
    obtenerCantidadTotalCarrito()
  );
}


function crearClaveCarrito(producto) {
  return [
    normalizarTexto(producto.nombre),
    normalizarTexto(
      producto.presentacionBase ||
        producto.presentacion
    ),
    normalizarTexto(producto.codigo)
  ].join("|");
}


function marcarBotonTarjetaComoPendiente(tarjeta) {
  if (!tarjeta) {
    return;
  }

  const boton =
    tarjeta.querySelector(".agregar-carrito");

  if (!boton) {
    return;
  }

  boton.classList.remove("agregado");
  tarjeta
    .querySelector(".cantidad")
    ?.classList.remove("cantidad-agregada");
  tarjeta
    .querySelectorAll(
      ".presentacion-agregada"
    )
    .forEach((control) =>
      control.classList.remove(
        "presentacion-agregada"
      )
    );
  boton.setAttribute(
    "aria-label",
    "Agregar al carrito"
  );
  boton.title = "Agregar al carrito";

  const textoBoton =
    boton.querySelector(".texto-agregar-carrito");

  if (textoBoton) {
    textoBoton.textContent = "Agregar";
  }
}


function actualizarEstadoBotonTarjeta(tarjeta) {
  if (!tarjeta) {
    return;
  }

  const boton =
    tarjeta.querySelector(
      ".agregar-carrito"
    );

  if (!boton) {
    return;
  }

  const claveTarjeta =
    crearClaveCarrito({
      nombre:
        tarjeta.dataset.nombre || "",

      presentacion:
        tarjeta.dataset.presentacion || "",

      codigo:
        tarjeta.dataset.codigo || ""
    });

  const productoEnCarrito =
    carritoCompras.find((producto) => {
      return (
        crearClaveCarrito(producto) ===
        claveTarjeta
      );
    });

  const estaEnCarrito =
    Boolean(productoEnCarrito);

  if (productoEnCarrito) {
    const campoCantidad =
      tarjeta.querySelector(".cantidad");
    const cantidad = Math.max(
      1,
      Number(productoEnCarrito.cantidad) || 1
    );

    if (campoCantidad) {
      campoCantidad.value = String(cantidad);
    }

    tarjeta.dataset.cantidadUnidades =
      String(cantidad);
    tarjeta.dataset.presentacionSeleccionada =
      "true";
  }

  actualizarControlPresentacionIntegrado(
    tarjeta
  );

  boton.classList.toggle(
    "agregado",
    estaEnCarrito
  );

  tarjeta
    .querySelector(".cantidad")
    ?.classList.toggle(
      "cantidad-agregada",
      estaEnCarrito
    );

  tarjeta
    .querySelectorAll(
      ".boton-presentacion, .control-presentacion-alambre-integrado"
    )
    .forEach((control) => {
      control.classList.toggle(
        "presentacion-agregada",
        estaEnCarrito &&
          control.classList.contains(
            "seleccionada"
          )
      );
    });

  const descripcionBoton = estaEnCarrito
    ? "Producto agregado"
    : "Agregar al carrito";

  boton.setAttribute(
    "aria-label",
    descripcionBoton
  );
  boton.title = descripcionBoton;

  const textoBoton =
    boton.querySelector(".texto-agregar-carrito");

  if (textoBoton) {
    textoBoton.textContent = estaEnCarrito
      ? "Agregado"
      : "Agregar";
  }
}


function actualizarEstadoBotonesCarrito() {
  [contenedorProductos, productosComparados]
    .filter(Boolean)
    .forEach((contenedor) => {
      contenedor
        .querySelectorAll(
          ".tarjeta-producto"
        )
        .forEach((tarjeta) => {
          actualizarEstadoBotonTarjeta(
            tarjeta
          );
        });
    });
}


function formatearPrecioCarrito(valor) {
  return formatearPrecio(valor).replace(/^\$/, "$ ");
}


function obtenerPresentacionTotalProducto(producto) {
  return formatearEtiquetaPresentacion(
    producto.presentacionBase ||
      producto.presentacion
  );
}


function obtenerSubtotalProducto(producto) {
  const precioTotal =
    Number(producto.precioTotal);

  return Number.isFinite(precioTotal) &&
    precioTotal >= 0
      ? precioTotal
      : (Number(producto.precio) || 0) *
          Math.max(
            1,
            Number(producto.cantidad) || 1
          );
}


function recalcularProductoCarrito(producto) {
  const productoCatalogo =
    productosAgrupados.find((item) => {
      return (
        normalizarTexto(item.nombre) ===
          normalizarTexto(producto.nombre) &&
        normalizarTexto(item.categoria) ===
          normalizarTexto(producto.categoria)
      );
    });

  if (!productoCatalogo) {
    producto.presentacionBase =
      producto.presentacionBase ||
      producto.presentacion;
    producto.presentacionTotal =
      obtenerPresentacionTotalProducto(
        producto
      );
    return producto;
  }

  const presentacionBase =
    producto.presentacionBase ||
    producto.presentacion;
  let indicePresentacion =
    productoCatalogo.presentaciones.findIndex(
      (presentacion) =>
        normalizarTexto(
          presentacion.nombre
        ) ===
        normalizarTexto(
          presentacionBase
        )
    );

  if (indicePresentacion < 0) {
    indicePresentacion = Math.max(
      0,
      Number(producto.indicePresentacion) || 0
    );
  }

  const presentacion =
    productoCatalogo.presentaciones[
      indicePresentacion
    ] || productoCatalogo.presentaciones[0];
  const cantidad = Math.max(
    1,
    Number(producto.cantidad) || 1
  );

  producto.presentacion =
    presentacion.nombre;
  producto.presentacionBase =
    presentacion.nombre;
  producto.presentacionTotal =
    formatearEtiquetaPresentacion(
      presentacion.nombre
    );
  producto.indicePresentacion =
    indicePresentacion;
  producto.precio =
    Number(presentacion.precio) || 0;
  producto.precioTotal =
    calcularPrecioCantidadPresentacion(
      productoCatalogo,
      indicePresentacion,
      cantidad
    );
  producto.codigo =
    presentacion.codigo ||
    producto.codigo || "";

  return producto;
}


function mostrarCarrito() {
  carritoCompras.forEach(
    recalcularProductoCarrito
  );
  productosCarrito.innerHTML = "";

  if (cantidadItemsCarrito) {
    cantidadItemsCarrito.textContent =
      `(${carritoCompras.length})`;
  }

  actualizarCargaVisualCarrito(
    obtenerCantidadTotalCarrito()
  );

  if (carritoCompras.length === 0) {
    productosCarrito.innerHTML = `
      <div class="carrito-vacio">
        <span class="icono-carrito-vacio" aria-hidden="true">
          <svg viewBox="0 0 28 24" focusable="false">
            <path d="M1.8 2.6h3.1l2.5 11.7h15.8l2.1-8.2H6.1"></path>
            <circle cx="9.2" cy="19.6" r="1.6"></circle>
            <circle cx="21.4" cy="19.6" r="1.6"></circle>
          </svg>
        </span>

        <p>
          El carrito está vacío.
        </p>
      </div>
    `;

    if (valorCarrito) {
      valorCarrito.textContent =
        formatearPrecioCarrito(0);
    } else if (cantidadCarrito) {
      cantidadCarrito.textContent =
        `🛒 | ${formatearPrecioCarrito(0)}`;
    }

    totalCarrito.textContent =
      formatearPrecioCarrito(0);

    finalizarPedido.disabled = true;
    vaciarCarrito.disabled = true;

    if (compartirCarrito) {
      compartirCarrito.disabled = true;
    }

    return;
  }

  carritoCompras.forEach(
    (producto, indice) => {
      const subtotal =
        obtenerSubtotalProducto(
          producto
        );
      const presentacionTotal =
        obtenerPresentacionTotalProducto(
          producto
        );
      const cantidadProducto = Math.max(
        1,
        Number(producto.cantidad) || 1
      );

      const productoCatalogo =
        productosAgrupados.find((item) => {
          return (
            normalizarTexto(item.nombre) ===
              normalizarTexto(producto.nombre) &&
            normalizarTexto(item.categoria) ===
              normalizarTexto(producto.categoria)
          );
        });

      const fotoCarrito =
        normalizarURLImagen(
          productoCatalogo?.foto || producto.foto || ""
        ) || "img/logo-minimal.svg";

      const escalaMiniaturaCarrito =
        obtenerEscalasRecorteProducto(
          productoCatalogo?.nombre || producto.nombre
        ).miniatura;

      const recortarMiniaturaCarrito =
        escalaMiniaturaCarrito > 1.001;

      const elemento =
        document.createElement(
          "article"
        );

      elemento.className =
        "producto-carrito";

      elemento.innerHTML = `
        <div class="miniatura-producto-carrito">
          <img
            src="${escaparHTML(fotoCarrito)}"
            alt=""
            class="${recortarMiniaturaCarrito ? "miniatura-recorte-margen-blanco" : ""}"
            loading="lazy"
            draggable="false"
            referrerpolicy="no-referrer"
          >
        </div>

        <div class="datos-producto-carrito">
          <div class="linea-principal-producto-carrito">
            <h3>
              ${escaparHTML(producto.nombre)}
            </h3>

            <strong
              class="subtotal-carrito"
              aria-label="Subtotal ${escaparHTML(formatearPrecio(subtotal))}"
            >
              ${formatearPrecio(subtotal)}
            </strong>
          </div>

          <p class="meta-producto-carrito">
            ${escaparHTML(presentacionTotal)}${
              producto.codigo
                ? ` · ${escaparHTML(producto.codigo)}`
                : ""
            }
          </p>

          <div class="acciones-producto-carrito">
            <div class="control-cantidad-carrito">
              <button
                type="button"
                data-accion="restar"
                data-indice="${indice}"
                aria-label="Restar una unidad de ${escaparHTML(
                  producto.nombre
                )}"
              >−</button>

              <span>${cantidadProducto}</span>

              <button
                type="button"
                data-accion="sumar"
                data-indice="${indice}"
                aria-label="Sumar una unidad de ${escaparHTML(
                  producto.nombre
                )}"
              >+</button>
            </div>

            <button
              type="button"
              class="eliminar-producto"
              data-accion="eliminar"
              data-indice="${indice}"
              aria-label="Eliminar ${escaparHTML(producto.nombre)} del carrito"
              title="Eliminar producto"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      const imagenMiniatura =
        elemento.querySelector(
          ".miniatura-producto-carrito img"
        );

      if (
        imagenMiniatura &&
        recortarMiniaturaCarrito
      ) {
        imagenMiniatura.style.setProperty(
          "--ceraceci-escala-miniatura",
          String(escalaMiniaturaCarrito)
        );
      }

      imagenMiniatura?.addEventListener(
        "error",
        () => {
          imagenMiniatura.classList.remove(
            "miniatura-recorte-margen-blanco"
          );
          imagenMiniatura.style.removeProperty(
            "--ceraceci-escala-miniatura"
          );
          imagenMiniatura.src =
            "img/logo-minimal.svg";
        },
        { once: true }
      );

      productosCarrito.appendChild(
        elemento
      );
    }
  );

  const cantidadTotal =
    carritoCompras.reduce(
      (total, producto) => {
        return (
          total + producto.cantidad
        );
      },
      0
    );

  const precioTotal =
    carritoCompras.reduce(
      (total, producto) => {
        return (
          total +
          obtenerSubtotalProducto(
            producto
          )
        );
      },
      0
    );

  if (valorCarrito) {
    valorCarrito.textContent =
      formatearPrecioCarrito(precioTotal);
  } else if (cantidadCarrito) {
    cantidadCarrito.textContent =
      `🛒 | ${formatearPrecioCarrito(precioTotal)}`;
  }

  totalCarrito.textContent =
    formatearPrecioCarrito(precioTotal);

  finalizarPedido.disabled = false;
  vaciarCarrito.disabled = false;

  if (compartirCarrito) {
    compartirCarrito.disabled = false;
  }
}


function guardarYActualizarCarrito() {
  carritoCompras.forEach(
    recalcularProductoCarrito
  );

  localStorage.setItem(
    "carritoCeraceci",
    JSON.stringify(carritoCompras)
  );

  mostrarCarrito();
  actualizarEstadoBotonesCarrito();
}


function cargarCarritoGuardado() {
  try {
    const carritoGuardado =
      localStorage.getItem(
        "carritoCeraceci"
      );

    if (!carritoGuardado) {
      return [];
    }

    const datos =
      JSON.parse(carritoGuardado);

    if (!Array.isArray(datos)) {
      return [];
    }

    return datos
      .filter((producto) => {
        return (
          producto &&
          producto.nombre &&
          producto.presentacion &&
          Number(producto.precio) > 0 &&
          Number(producto.cantidad) > 0
        );
      })
      .map((producto) => ({
        ...producto,
        nombre: formatearNombreProducto(
          producto.nombre
        ),
        nombrePlural: "",
        presentacionBase:
          producto.presentacionBase ||
          producto.presentacion,
        presentacionTotal:
          formatearEtiquetaPresentacion(
            producto.presentacionBase ||
              producto.presentacion
          )
      }));
  } catch (error) {
    console.error(
      "No se pudo recuperar el carrito.",
      error
    );

    return [];
  }
}


function abrirPanelCarrito() {
  mostrarCarrito();

  carritoElemento.classList.add(
    "visible"
  );

  fondoCarrito.classList.add(
    "visible"
  );

  document.body.classList.add(
    "carrito-abierto"
  );
}


function cerrarPanelCarrito() {
  carritoElemento.classList.remove(
    "visible"
  );

  fondoCarrito.classList.remove(
    "visible"
  );

  document.body.classList.remove(
    "carrito-abierto"
  );
}


function finalizarPedidoWhatsApp() {
  if (carritoCompras.length === 0) {
    return;
  }

  if (
    NUMERO_WHATSAPP ===
    "5492210000000"
  ) {
    alert(
      "Primero reemplazá el número de WhatsApp de ejemplo por el número real de Ceraceci en script.js."
    );

    return;
  }

  const lineasProductos =
    carritoCompras.map(
      (producto) =>
        construirLineaProductoMensaje(producto)
    );

  const detalleProductos =
    lineasProductos.join("\n\n");

  const precioTotal =
    carritoCompras.reduce(
      (total, producto) => {
        return (
          total +
          obtenerSubtotalProducto(
            producto
          )
        );
      },
      0
    );

  const mensaje = [
    "¡Hola!",
    "Me gustaría consultar por este pedido:",
    "",
    detalleProductos,
    "",
    `Total - ${formatearPrecio(precioTotal)}`,
    "",
    "¿Está todo disponible? ¿Qué formas de pago tienen y cómo coordinamos la entrega?",
    "¡Muchas gracias!"
  ].join("\n");

  const enlace =
    `https://wa.me/${NUMERO_WHATSAPP}` +
    `?text=${encodeURIComponent(
      mensaje
    )}`;

  window.open(
    enlace,
    "_blank",
    "noopener,noreferrer"
  );
}


function obtenerNombreProductoParaCantidad(producto) {
  const cantidad = Math.max(
    1,
    Number(producto.cantidad) || 1
  );

  if (
    normalizarTexto(producto.nombre) ===
    "apm 112"
  ) {
    return cantidad === 1
      ? "1 - Arcilla Apm 112"
      : `${cantidad} - Arcillas Apm 112`;
  }

  return `${cantidad} - ${producto.nombre}`;
}


function construirLineaProductoMensaje(producto) {
  return [
    obtenerNombreProductoParaCantidad(producto),
    obtenerPresentacionTotalProducto(producto),
    formatearPrecio(
      obtenerSubtotalProducto(producto)
    )
  ].join(" - ");
}


function pluralizarSustantivoProducto(palabra) {
  const singular = limpiarTexto(palabra)
    .toLocaleLowerCase("es-AR");

  if (!singular) {
    return "productos";
  }

  const pluralesEspeciales = {
    set: "sets",
    spray: "sprays"
  };

  if (pluralesEspeciales[singular]) {
    return pluralesEspeciales[singular];
  }

  if (/z$/u.test(singular)) {
    return singular.replace(/z$/u, "ces");
  }

  if (/[aeiouáéíóú]$/u.test(singular)) {
    return `${singular}s`;
  }

  if (/[sx]$/u.test(singular)) {
    return singular;
  }

  return `${singular}es`;
}


function obtenerEtiquetaCantidadProducto(producto) {
  const cantidad = Math.max(
    1,
    Number(producto.cantidad) || 1
  );

  if (
    normalizarTexto(producto.nombre) ===
    "apm 112"
  ) {
    return cantidad === 1
      ? "1 Arcilla Apm 112"
      : `${cantidad} Arcillas Apm 112`;
  }

  const sustantivo = limpiarTexto(
    producto.nombre
  ).split(/\s+/u)[0] || "producto";
  const nombreCantidad = cantidad === 1
    ? sustantivo.toLocaleLowerCase("es-AR")
    : pluralizarSustantivoProducto(
        sustantivo
      );

  return `${cantidad} ${nombreCantidad}`;
}


function construirDetalleCarritoCompartido() {
  const detalleProductos =
    carritoCompras
      .map(
        (producto) =>
          construirLineaProductoMensaje(producto)
      )
      .join("\n\n");

  const precioTotal =
    carritoCompras.reduce(
      (total, producto) =>
        total + obtenerSubtotalProducto(producto),
      0
    );

  return [
    detalleProductos,
    "",
    `Total - ${formatearPrecio(precioTotal)}`
  ].join("\n");
}


async function compartirCarritoActual() {
  if (carritoCompras.length === 0) {
    return;
  }

  const mensaje =
    construirDetalleCarritoCompartido();

  if (navigator.share) {
    try {
      await navigator.share({
        text: mensaje
      });

      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(
      mensaje
    );

    mostrarAvisoCopiado(
      "Detalle del carrito copiado"
    );
  } catch (error) {
    window.prompt(
      "Copiá el detalle del carrito:",
      mensaje
    );
  }
}


/* =========================================
   LECTURA DEL CSV
========================================= */

function convertirCSV(texto) {
  const filas = [];

  let fila = [];
  let campo = "";
  let dentroDeComillas = false;

  for (
    let posicion = 0;
    posicion < texto.length;
    posicion++
  ) {
    const caracter =
      texto[posicion];

    const siguiente =
      texto[posicion + 1];

    if (caracter === '"') {
      if (
        dentroDeComillas &&
        siguiente === '"'
      ) {
        campo += '"';
        posicion++;
      } else {
        dentroDeComillas =
          !dentroDeComillas;
      }

      continue;
    }

    if (
      caracter === "," &&
      !dentroDeComillas
    ) {
      fila.push(campo);
      campo = "";
      continue;
    }

    if (
      (
        caracter === "\n" ||
        caracter === "\r"
      ) &&
      !dentroDeComillas
    ) {
      if (
        caracter === "\r" &&
        siguiente === "\n"
      ) {
        posicion++;
      }

      fila.push(campo);

      if (
        fila.some(
          (valor) =>
            limpiarTexto(valor) !== ""
        )
      ) {
        filas.push(fila);
      }

      fila = [];
      campo = "";

      continue;
    }

    campo += caracter;
  }

  fila.push(campo);

  if (
    fila.some(
      (valor) =>
        limpiarTexto(valor) !== ""
    )
  ) {
    filas.push(fila);
  }

  return filas;
}


/* =========================================
   FUNCIONES AUXILIARES
========================================= */

function convertirPrecio(valor) {
  const texto =
    limpiarTexto(valor)
      .replace(/\$/g, "")
      .replace(/\s/g, "");

  if (texto === "") {
    return 0;
  }

  let numeroNormalizado = texto;

  const tieneComa =
    numeroNormalizado.includes(",");

  const tienePunto =
    numeroNormalizado.includes(".");

  if (tieneComa && tienePunto) {
    const ultimaComa =
      numeroNormalizado.lastIndexOf(",");

    const ultimoPunto =
      numeroNormalizado.lastIndexOf(".");

    if (ultimaComa > ultimoPunto) {
      numeroNormalizado =
        numeroNormalizado
          .replace(/\./g, "")
          .replace(",", ".");
    } else {
      numeroNormalizado =
        numeroNormalizado.replace(
          /,/g,
          ""
        );
    }
  } else if (tieneComa) {
    const partes =
      numeroNormalizado.split(",");

    if (
      partes.length === 2 &&
      partes[1].length <= 2
    ) {
      numeroNormalizado =
        numeroNormalizado.replace(
          ",",
          "."
        );
    } else {
      numeroNormalizado =
        numeroNormalizado.replace(
          /,/g,
          ""
        );
    }
  } else if (tienePunto) {
    const partes =
      numeroNormalizado.split(".");

    if (
      partes.length > 2 ||
      (
        partes.length === 2 &&
        partes[1].length === 3
      )
    ) {
      numeroNormalizado =
        numeroNormalizado.replace(
          /\./g,
          ""
        );
    }
  }

  const numero =
    Number(numeroNormalizado);

  return Number.isFinite(numero)
    ? numero
    : 0;
}


function formatearPrecio(precio) {
  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }
  )
    .format(precio)
    .replace(/\$\s+/u, "$");
}


function limpiarTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor).trim();
}


function formatearNombreProducto(valor) {
  const nombre = limpiarTexto(valor)
    .toLocaleLowerCase("es-AR");

  if (!nombre) {
    return "";
  }

  return nombre
    .split(/\s+/)
    .map((palabra) => {
      if (palabra === "de") {
        return "de";
      }

      return palabra.replace(
        /\p{L}/u,
        (letra) =>
          letra.toLocaleUpperCase("es-AR")
      );
    })
    .join(" ");
}


function formatearEtiquetaPresentacion(valor) {
  const presentacion = limpiarTexto(valor)
    .toLocaleLowerCase("es-AR");

  if (!presentacion) {
    return "";
  }

  const conInicialMayuscula =
    presentacion.replace(
      /^(\s*)(\p{L})/u,
      (_, espacios, letra) =>
        espacios +
        letra.toLocaleUpperCase("es-AR")
    );

  return conInicialMayuscula
    .replace(/\bml\b/giu, "mL")
    .replace(/\bl\b/giu, "L")
    .replace(/°c\b/giu, "°C")
    .replace(
      /\b(?:kg|g|cc|mm|cm|m)\b/giu,
      (unidad) => unidad.toLowerCase()
    );
}


function normalizarTexto(valor) {
  return limpiarTexto(valor)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}


function normalizarURLImagen(valor) {
  let texto = limpiarTexto(valor);

  if (!texto) {
    return "";
  }

  const formulaImagen = texto.match(
    /^=IMAGE\(\s*["']([^"']+)["']/i
  );

  if (formulaImagen) {
    texto = formulaImagen[1];
  }

  try {
    const url = new URL(
      texto,
      window.location.href
    );

    if (
      url.hostname === "drive.google.com"
    ) {
      const coincidenciaRuta =
        url.pathname.match(
          /\/file\/d\/([^/]+)/
        );

      const id =
        coincidenciaRuta?.[1] ||
        url.searchParams.get("id");

      if (id) {
        return (
          "https://drive.google.com/thumbnail?id=" +
          encodeURIComponent(id) +
          "&sz=w1200"
        );
      }
    }

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return "";
    }

    return url.toString();
  } catch (error) {
    return "";
  }
}


function escaparHTML(valor) {
  return limpiarTexto(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================
   EVENTOS
========================================= */

function manejarClickTarjetaProducto(evento) {
    const tarjetaComparacion =
      evento.target.closest(
        "#productos .tarjeta-producto"
      );

    if (
      modoSeleccionComparacion &&
      tarjetaComparacion
    ) {
      evento.preventDefault();
      alternarProductoComparacion(
        tarjetaComparacion.dataset.idProducto
      );
      return;
    }

    const botonDetalles =
      evento.target.closest(
        ".ver-detalles"
      );

    if (botonDetalles) {
      abrirModalInformacionProducto(
        botonDetalles
      );

      return;
    }

    const botonCompartir =
      evento.target.closest(
        ".compartir-producto"
      );

    if (botonCompartir) {
      compartirProducto(
        botonCompartir.dataset.idProducto
      );

      botonCompartir.blur();

      return;
    }

    const botonAgregar =
      evento.target.closest(
        ".agregar-carrito"
      );

    if (botonAgregar) {
      agregarProductoAlCarrito(
        botonAgregar
      );

      return;
    }

    const botonSumarPresentacion =
      evento.target.closest(
        ".sumar-presentacion"
      );

    if (botonSumarPresentacion) {
      cambiarCantidadTarjeta(
        botonSumarPresentacion,
        1
      );

      return;
    }

    const botonRestarPresentacion =
      evento.target.closest(
        ".restar-presentacion"
      );

    if (botonRestarPresentacion) {
      cambiarCantidadTarjeta(
        botonRestarPresentacion,
        -1
      );

      return;
    }

    const botonPresentacion =
      evento.target.closest(
        ".boton-presentacion"
      );

    if (botonPresentacion) {
      seleccionarPresentacion(
        botonPresentacion
      );

      return;
    }

    const botonSumar =
      evento.target.closest(".sumar");

    if (botonSumar) {
      cambiarCantidadTarjeta(
        botonSumar,
        1
      );

      return;
    }

    const botonRestar =
      evento.target.closest(".restar");

    if (botonRestar) {
      cambiarCantidadTarjeta(
        botonRestar,
        -1
      );
    }
}


contenedorProductos.addEventListener(
  "click",
  manejarClickTarjetaProducto
);

contenedorProductos.addEventListener(
  "keydown",
  (evento) => {
    if (
      !modoSeleccionComparacion ||
      (evento.key !== "Enter" && evento.key !== " ")
    ) {
      return;
    }

    const tarjeta =
      evento.target.closest(
        "#productos .tarjeta-producto"
      );

    if (!tarjeta) {
      return;
    }

    evento.preventDefault();
    alternarProductoComparacion(
      tarjeta.dataset.idProducto
    );
  }
);


if (productosComparados) {
  productosComparados.addEventListener(
    "click",
    manejarClickTarjetaProducto
  );
}


function manejarCambioTarjetaProducto(evento) {
    if (
      !evento.target.classList.contains(
        "selector-presentacion"
      )
    ) {
      return;
    }

    seleccionarPresentacion(
      evento.target
    );
}


contenedorProductos.addEventListener(
  "change",
  manejarCambioTarjetaProducto
);


if (productosComparados) {
  productosComparados.addEventListener(
    "change",
    manejarCambioTarjetaProducto
  );
}


function manejarEntradaTarjetaProducto(evento) {
    if (
      !evento.target.classList.contains(
        "cantidad"
      )
    ) {
      return;
    }

    const tarjeta =
      evento.target.closest(
        ".tarjeta-producto"
      );

    normalizarCantidadTarjeta(tarjeta);
    marcarBotonTarjetaComoPendiente(tarjeta);

    establecerSeleccionCantidadTarjeta(
      tarjeta,
      false
    );
}


contenedorProductos.addEventListener(
  "input",
  manejarEntradaTarjetaProducto
);


if (productosComparados) {
  productosComparados.addEventListener(
    "input",
    manejarEntradaTarjetaProducto
  );
}


/* Compartir refleja el contacto real en PC y móvil. Cantidad necesita
   esta ayuda únicamente en pantallas táctiles. */
function activarPulsacionMovil(evento) {
  const botonCompartir =
    evento.target.closest?.(".compartir-producto");

  if (botonCompartir) {
    botonCompartir.classList.add(
      "compartir-presionado"
    );
  }

  if (
    !window.matchMedia("(max-width: 650px)").matches
  ) {
    return;
  }

  const botonCantidad =
    evento.target.closest?.(
      ".boton-cantidad, .boton-ajuste-presentacion"
    );

  if (botonCantidad) {
    botonCantidad.classList.add("presionado");
  }
}


function limpiarPulsacionesMoviles() {
  document
    .querySelectorAll(".boton-cantidad.presionado")
    .forEach((boton) => {
      boton.classList.remove("presionado");
    });

  document
    .querySelectorAll(
      ".boton-ajuste-presentacion.presionado"
    )
    .forEach((boton) => {
      boton.classList.remove("presionado");
    });

  document
    .querySelectorAll(
      ".compartir-producto.compartir-presionado"
    )
    .forEach((boton) => {
      boton.classList.remove(
        "compartir-presionado"
      );
    });
}


document.addEventListener(
  "pointerdown",
  activarPulsacionMovil,
  true
);

document.addEventListener(
  "pointerup",
  limpiarPulsacionesMoviles,
  true
);

document.addEventListener(
  "pointercancel",
  limpiarPulsacionesMoviles,
  true
);

window.addEventListener(
  "blur",
  limpiarPulsacionesMoviles
);


productosCarrito.addEventListener(
  "click",
  (evento) => {
    const boton =
      evento.target.closest(
        "[data-accion]"
      );

    if (!boton) {
      return;
    }

    const indice =
      Number(boton.dataset.indice);

    const accion =
      boton.dataset.accion;

    const producto =
      carritoCompras[indice];

    if (!producto) {
      return;
    }

    if (accion === "sumar") {
      producto.cantidad++;
    }

    if (accion === "restar") {
      producto.cantidad--;

      if (producto.cantidad < 1) {
        carritoCompras.splice(
          indice,
          1
        );
      }
    }

    if (accion === "eliminar") {
      carritoCompras.splice(
        indice,
        1
      );
    }

    guardarYActualizarCarrito();
  }
);


buscador.addEventListener(
  "input",
  filtrarProductos
);


if (formBusqueda) {
  formBusqueda.addEventListener(
    "submit",
    (evento) => {
      evento.preventDefault();
      buscador?.blur();
    }
  );
}


filtroCategoria.addEventListener(
  "change",
  () => {
    actualizarEstadoFiltroCategoria();
    filtrarProductos();
    filtroCategoria.blur();
  }
);


if (ordenarProductos) {
  ordenarProductos.addEventListener(
    "change",
    () => {
      const controlOrden = ordenarProductos.closest(".control-orden");

      if (controlOrden) {
        controlOrden.classList.toggle(
          "orden-activo",
          ordenarProductos.value !== "inicial"
        );
      }

      filtrarProductos();

      // V108: evita que el select quede con un estado visual de foco
      // después de elegir cualquiera de las dos opciones.
      ordenarProductos.blur();
    }
  );
}


if (verCatalogoCompleto) {
  verCatalogoCompleto.addEventListener(
    "click",
    mostrarCatalogoCompleto
  );
}


if (abrirComparacion) {
  abrirComparacion.addEventListener(
    "click",
    abrirVistaComparacion
  );
}


if (abrirComparacionMovil) {
  abrirComparacionMovil.addEventListener(
    "click",
    abrirVistaComparacion
  );
}


if (cancelarComparacionMovil) {
  cancelarComparacionMovil.addEventListener(
    "click",
    cancelarModoComparacion
  );
}


botonesModoComparacion.forEach((boton) => {
  boton.addEventListener(
    "click",
    alternarModoComparacion
  );
});


if (limpiarComparacion) {
  limpiarComparacion.addEventListener(
    "click",
    cancelarModoComparacion
  );
}


if (volverCatalogo) {
  volverCatalogo.addEventListener(
    "click",
    volverDesdeComparacion
  );
}


if (limpiarComparacionVista) {
  limpiarComparacionVista.addEventListener(
    "click",
    vaciarSeleccionComparacion
  );
}


if (cerrarModalInfo) {
  cerrarModalInfo.addEventListener(
    "click",
    cerrarModalInformacionProducto
  );
}


if (modalInformacionProducto) {
  modalInformacionProducto.addEventListener(
    "click",
    (evento) => {
      if (evento.target === modalInformacionProducto) {
        cerrarModalInformacionProducto();
      }
    }
  );
}


if (abrirCarrito) {
  abrirCarrito.addEventListener(
    "click",
    abrirPanelCarrito
  );
}


if (cerrarCarrito) {
  cerrarCarrito.addEventListener(
    "click",
    cerrarPanelCarrito
  );
}


if (fondoCarrito) {
  fondoCarrito.addEventListener(
    "click",
    cerrarPanelCarrito
  );
}


if (vaciarCarrito) {
vaciarCarrito.addEventListener(
  "click",
  () => {
    if (carritoCompras.length === 0) {
      return;
    }

    carritoCompras = [];

    restablecerSeleccionesTarjetasDespuesDeVaciar();

    guardarYActualizarCarrito();
    cerrarPanelCarrito();
  }
);
}

if (finalizarPedido) {
  finalizarPedido.addEventListener(
    "click",
    finalizarPedidoWhatsApp
  );
}


if (compartirCarrito) {
  compartirCarrito.addEventListener(
    "click",
    compartirCarritoActual
  );
}


document.addEventListener(
  "keydown",
  (evento) => {
    if (evento.key === "Escape") {
      if (cerrarModalInformacionProducto()) {
        evento.preventDefault();
        return;
      }

      cerrarPanelCarrito();

      if (comparacionAbierta) {
        cerrarVistaComparacion();
      }
    }

    if (
      evento.key === "Tab" &&
      modalInformacionProducto?.classList.contains("abierto")
    ) {
      const elementosFoco = [
        cerrarModalInfo,
        modalInfoContenido
      ].filter(Boolean);

      if (!elementosFoco.length) {
        return;
      }

      const primero = elementosFoco[0];
      const ultimo = elementosFoco[elementosFoco.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }
  }
);


function inicializarSeparacionBarraSuperior() {
  if (!seccionBusqueda) {
    return;
  }

  const marcador =
    document.createElement("span");
  marcador.className =
    "marcador-barra-superior";
  marcador.setAttribute("aria-hidden", "true");
  seccionBusqueda.insertAdjacentElement(
    "beforebegin",
    marcador
  );

  let actualizacionPendiente = false;

  const actualizar = () => {
    actualizacionPendiente = false;
    seccionBusqueda.classList.toggle(
      "busqueda-en-scroll",
      marcador.getBoundingClientRect().top <= 10
    );
  };

  const programarActualizacion = () => {
    if (actualizacionPendiente) {
      return;
    }

    actualizacionPendiente = true;
    requestAnimationFrame(actualizar);
  };

  window.addEventListener(
    "scroll",
    programarActualizacion,
    { passive: true }
  );
  window.addEventListener(
    "resize",
    programarActualizacion
  );
  actualizar();
}


/* =========================================
   INICIO
========================================= */

try {
  inicializarSeparacionBarraSuperior();
  mostrarCarrito();
  actualizarEstadoComparacion();
  inicializarSelectoresPersonalizadosPC();
  cargarProductos();
} catch (error) {
  console.error(
    "Error al iniciar el catálogo:",
    error
  );

  if (estado) {
    estado.textContent =
      "No se pudo iniciar el catálogo. Recargá la página.";
  }
}
