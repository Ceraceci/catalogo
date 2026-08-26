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
const CACHE_CATALOGO_LOCAL = "ceraceci_catalogo_csv_v3";

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
let productoCompartidoPendiente =
  new URLSearchParams(window.location.search).get("producto");
const selectoresPersonalizadosPC = new Map();


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

  const indiceFoto =
    buscarIndiceOpcional(
      "Foto",
      "Imagen",
      "URL foto",
      "URL imagen"
    );

  const indiceProductoPlural =
    buscarIndiceOpcional(
      "Producto plural",
      "Nombre plural"
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

        foto:
          indiceFoto !== -1
            ? limpiarTexto(fila[indiceFoto])
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

  productosAgrupados =
    agruparProductos(filasProductos);

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
        foto: fila.foto,
        descripcion: fila.descripcion,
        indicaciones: fila.indicaciones,
        presentaciones: []
      });
    }

    const producto = agrupados.get(clave);

    if (!producto.nombrePlural && fila.nombrePlural) {
      producto.nombrePlural = fila.nombrePlural;
    }

    if (!producto.foto && fila.foto) {
      producto.foto = fila.foto;
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

  if (!encabezado || !foto || !acciones) {
    return;
  }

  const rectEncabezado = encabezado.getBoundingClientRect();
  const rectFoto = foto.getBoundingClientRect();
  const rectAcciones = acciones.getBoundingClientRect();

  if (!rectFoto.height || !rectAcciones.height) {
    return;
  }

  const centroFoto =
    rectFoto.top - rectEncabezado.top + rectFoto.height / 2;

  const top = centroFoto - rectAcciones.height / 2;

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


function crearTarjetaProducto(
  producto,
  opciones = {}
) {
  const esComparacion =
    Boolean(opciones.esComparacion);

  const presentacionInicial =
    producto.presentaciones[0];

  const tarjeta =
    document.createElement("article");

  tarjeta.className =
    esComparacion
      ? "tarjeta-producto tarjeta-en-comparacion"
      : "tarjeta-producto";

  tarjeta.dataset.idProducto = producto.id;
  tarjeta.dataset.nombre = producto.nombre;
  tarjeta.dataset.nombrePlural = producto.nombrePlural || "";
  tarjeta.dataset.categoria = producto.categoria;
  tarjeta.dataset.presentacion = presentacionInicial.nombre;
  tarjeta.dataset.precio = String(presentacionInicial.precio);
  tarjeta.dataset.codigo = presentacionInicial.codigo || "";

  const productoInicialCarrito =
    carritoCompras.find((item) => {
      return (
        crearClaveCarrito(item) ===
        crearClaveCarrito({
          nombre: producto.nombre,
          presentacion: presentacionInicial.nombre,
          codigo: presentacionInicial.codigo || ""
        })
      );
    });

  const productoInicialEnCarrito =
    Boolean(productoInicialCarrito);

  const cantidadInicialProducto =
    productoInicialCarrito
      ? Math.max(
          1,
          Number(productoInicialCarrito.cantidad) || 1
        )
      : 1;

  const estaSeleccionado =
    productosSeleccionadosComparacion.includes(
      producto.id
    );

  const botonesPresentaciones =
    producto.presentaciones
      .map((presentacion, indicePresentacion) => `
        <button
          type="button"
          class="boton-presentacion"
          data-id-producto="${producto.id}"
          data-indice-presentacion="${indicePresentacion}"
          aria-pressed="false"
        >
          <span>${escaparHTML(
            formatearEtiquetaPresentacion(
              presentacion.nombre
            )
          )}</span>
        </button>
      `)
      .join("");

  const usarSelectorAlambre =
    normalizarTexto(producto.nombre) ===
    "alambre kanthal a1";

  const opcionesSelectorAlambre =
    `
      <option value="">Diámetro</option>
    ` +
    producto.presentaciones
      .map((presentacion, indicePresentacion) => `
        <option value="${indicePresentacion}">
          ${escaparHTML(
            formatearEtiquetaPresentacion(
              presentacion.nombre
            )
          )}
        </option>
      `)
      .join("");

  const controlPresentaciones =
    usarSelectorAlambre
      ? `
          <select
            id="selector-alambre-${producto.id}-${
              esComparacion ? "comparacion" : "catalogo"
            }"
            class="selector-presentacion selector-presentacion-alambre"
            data-id-producto="${producto.id}"
            aria-label="Elegir diámetro de ${escaparHTML(
              producto.nombre
            )}"
          >
            ${opcionesSelectorAlambre}
          </select>
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

  const foto =
    normalizarURLImagen(producto.foto);

  tarjeta.dataset.foto = foto;

  const idDetalles =
    `detalles-${producto.id}-${
      esComparacion ? "comparacion" : "catalogo"
    }`;

  const contenidoDetalles = [
    producto.descripcion
      ? `
          <div class="grupo-detalle-producto">
            <strong>Descripción</strong>
            <p>${escaparHTML(producto.descripcion)}</p>
          </div>
        `
      : "",
    producto.indicaciones
      ? `
          <div class="grupo-detalle-producto">
            <strong>Indicaciones de uso</strong>
            <p>${escaparHTML(producto.indicaciones)}</p>
          </div>
        `
      : ""
  ].join("") || `
    <p class="detalle-pendiente">
      Información pendiente de cargar.
    </p>
  `;

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
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.2 3.2 0 0 0 0-1.39l7.05-4.11A3 3 0 1 0 15 5c0 .23.03.45.08.66L8.03 9.77a3 3 0 1 0 0 4.46l7.12 4.16c-.04.2-.07.4-.07.61a3 3 0 1 0 2.92-2.92Z"/>
          </svg>
        </button>

        <button
          type="button"
          class="boton-comparar ${
            estaSeleccionado ? "seleccionado" : ""
          }"
          data-id-producto="${producto.id}"
          aria-pressed="${estaSeleccionado}"
          aria-label="${
            esComparacion ? "Quitar de la comparación" : "Comparar"
          } ${escaparHTML(producto.nombre)}"
          title="${
            esComparacion ? "Quitar de la comparación" : "Comparar producto"
          }"
        >
          <svg
            class="icono-comparar icono-comparar-svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M2.5 7.5h18m0 0-4-4m4 4-4 4M21.5 16.5h-18m0 0 4-4m-4 4 4 4"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="contenedor-foto-producto ${foto ? "" : "sin-foto"}">
      <img
        src="${foto ? escaparHTML(foto) : "img/logo-minimal.svg"}"
        alt="${foto ? escaparHTML(producto.nombre) : ""}"
        class="foto-producto ${foto ? "" : "foto-placeholder"}"
        loading="lazy"
        referrerpolicy="no-referrer"
      >
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
        aria-expanded="false"
        aria-controls="${idDetalles}"
      >
        Más info.
      </button>

      <div
        id="${idDetalles}"
        class="detalles-producto"
        hidden
      >
        ${contenidoDetalles}
      </div>
    </div>
  `;

  const imagenProducto =
    tarjeta.querySelector(".foto-producto");

  if (imagenProducto && foto) {
    imagenProducto.addEventListener(
      "error",
      () => {
        imagenProducto.src = "img/logo-minimal.svg";
        imagenProducto.alt = "";
        imagenProducto.classList.add(
          "foto-placeholder"
        );
        imagenProducto
          .closest(".contenedor-foto-producto")
          ?.classList.add("sin-foto");
      },
      { once: true }
    );
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

  return tarjeta;
}


function alternarDetallesProducto(boton) {
  const tarjeta =
    boton.closest(".tarjeta-producto");

  const detalles =
    tarjeta?.querySelector(
      ".detalles-producto"
    );

  if (!detalles) {
    return;
  }

  const seAbrira = detalles.hidden;

  detalles.hidden = !seAbrira;
  boton.setAttribute(
    "aria-expanded",
    String(seAbrira)
  );
  boton.textContent =
    seAbrira
      ? "Ocultar info."
      : "Más info.";
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
  [contenedorProductos, productosComparados]
    .filter(Boolean)
    .forEach((contenedor) => {
      contenedor
        .querySelectorAll(".boton-comparar")
        .forEach((boton) => {
          const seleccionado =
            productosSeleccionadosComparacion.includes(
              boton.dataset.idProducto
            );

          const esTarjetaComparacion =
            Boolean(
              boton.closest(
                ".tarjeta-en-comparacion"
              )
            );

          boton.classList.toggle(
            "seleccionado",
            seleccionado
          );
          boton.setAttribute(
            "aria-pressed",
            String(seleccionado)
          );

          const texto =
            boton.querySelector(
              ".texto-comparar"
            );

          if (texto) {
            texto.textContent =
              esTarjetaComparacion
                ? "Quitar"
                : seleccionado
                  ? "Elegido"
                  : "Comparar";
          }
        });
    });
}


function actualizarEstadoComparacion() {
  const cantidad =
    productosSeleccionadosComparacion.length;

  if (barraComparacion) {
    barraComparacion.hidden =
      cantidad === 0 ||
      comparacionAbierta ||
      Boolean(productoCompartidoPendiente);
  }

  if (resumenComparacion) {
    resumenComparacion.textContent =
      `${cantidad} de 4 productos seleccionados`;
  }

  if (abrirComparacion) {
    abrirComparacion.disabled = cantidad < 2;
  }


  sincronizarBotonesComparacion();
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
    productosSeleccionadosComparacion.length < 2 ||
    !seccionComparacion
  ) {
    return;
  }

  comparacionAbierta = true;
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


function seleccionarPresentacion(control) {
  const tarjeta =
    control.closest(".tarjeta-producto");

  const idProducto =
    control.dataset.idProducto;

  const esSelectorPresentacion =
    control.matches(".selector-presentacion");

  /* Alambre: "Diámetro" funciona como estado neutro.
     Al volver a elegirlo se quita la selección visual,
     igual que al deseleccionar un botón de presentación. */
  if (
    esSelectorPresentacion &&
    control.value === ""
  ) {
    control.classList.remove("seleccionada");
    programarAjusteTarjetasMoviles();
    return;
  }

  const indicePresentacion =
    esSelectorPresentacion
      ? Number(control.value)
      : Number(
          control.dataset.indicePresentacion
        );

  const producto =
    productosAgrupados.find(
      (item) =>
        item.id === idProducto
    );

  if (!producto) {
    return;
  }

  const presentacion =
    producto.presentaciones[
      indicePresentacion
    ];

  if (!presentacion) {
    return;
  }

  if (control.matches(".boton-presentacion")) {
    const yaEstabaSeleccionada =
      control.classList.contains("seleccionada");

    tarjeta
      .querySelectorAll(
        ".boton-presentacion"
      )
      .forEach((opcion) => {
        opcion.classList.remove(
          "seleccionada"
        );
        opcion.setAttribute(
          "aria-pressed",
          "false"
        );
      });

    /* Un segundo toque sobre la misma presentación la deselecciona
       visualmente. Esto funciona también cuando existe una sola opción. */
    if (!yaEstabaSeleccionada) {
      control.classList.add("seleccionada");
      control.setAttribute(
        "aria-pressed",
        "true"
      );
    }
  }

  if (control.matches(".selector-presentacion")) {
    control.classList.add("seleccionada");
  }

  tarjeta.dataset.presentacion =
    presentacion.nombre;

  tarjeta.dataset.precio =
    String(presentacion.precio);

  tarjeta.dataset.codigo =
    presentacion.codigo || "";

  const elementoPrecio =
    tarjeta.querySelector(".precio");

  elementoPrecio.dataset.precio =
    String(presentacion.precio);

  elementoPrecio.textContent =
    formatearPrecio(
      presentacion.precio
    );

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

  tarjeta.querySelector(
    ".codigo-producto"
  ).textContent =
    presentacion.codigo
      ? presentacion.codigo
      : "";

  sincronizarCantidadTarjetaConCarrito(tarjeta);
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

  const campoCantidad =
    tarjeta.querySelector(".cantidad");

  const cantidadActual =
    Math.max(
      1,
      Number(campoCantidad.value) || 1
    );

  campoCantidad.value =
    Math.max(
      1,
      cantidadActual + variacion
    );

  /* El contenedor permanece neutro: se marca únicamente el valor central. */
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

  campoCantidad.classList.remove(
    "cantidad-seleccionada"
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

  const producto = {
    nombre:
      tarjeta.dataset.nombre,

    nombrePlural: "",

    categoria:
      tarjeta.dataset.categoria,

    presentacion:
      tarjeta.dataset.presentacion,

    precio:
      Number(
        tarjeta.dataset.precio
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


function mostrarCarrito() {
  productosCarrito.innerHTML = "";

  if (cantidadItemsCarrito) {
    cantidadItemsCarrito.textContent =
      `(${obtenerCantidadTotalCarrito()})`;
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
        producto.precio *
        producto.cantidad;

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
            ${escaparHTML(formatearEtiquetaPresentacion(producto.presentacion))}${
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
                aria-label="Restar una unidad"
              >−</button>

              <span>${producto.cantidad}</span>

              <button
                type="button"
                data-accion="sumar"
                data-indice="${indice}"
                aria-label="Sumar una unidad"
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

      imagenMiniatura?.addEventListener(
        "error",
        () => {
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
          producto.precio *
            producto.cantidad
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
        nombrePlural: ""
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
        `${producto.cantidad} ${obtenerNombreProductoParaCantidad(producto)} × ${formatearEtiquetaPresentacion(producto.presentacion)} : ` +
        formatearPrecio(producto.precio * producto.cantidad)
    );

  const detalleProductos =
    lineasProductos.join("\n\n");

  const precioTotal =
    carritoCompras.reduce(
      (total, producto) => {
        return (
          total +
          producto.precio *
            producto.cantidad
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
    `Total: ${formatearPrecio(precioTotal)}`,
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
  return producto.nombre;
}


function construirDetalleCarritoCompartido() {
  const detalleProductos =
    carritoCompras
      .map(
        (producto) =>
          `${producto.cantidad} ${obtenerNombreProductoParaCantidad(producto)} × ${formatearEtiquetaPresentacion(producto.presentacion)} : ` +
          formatearPrecio(producto.precio * producto.cantidad)
      )
      .join("\n\n");

  const precioTotal =
    carritoCompras.reduce(
      (total, producto) =>
        total + producto.precio * producto.cantidad,
      0
    );

  return [
    detalleProductos,
    "",
    `Total: ${formatearPrecio(precioTotal)}`
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
    const botonComparar =
      evento.target.closest(
        ".boton-comparar"
      );

    if (botonComparar) {
      alternarProductoComparacion(
        botonComparar.dataset.idProducto
      );

      botonComparar.blur();

      return;
    }

    const botonDetalles =
      evento.target.closest(
        ".ver-detalles"
      );

    if (botonDetalles) {
      alternarDetallesProducto(
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
    evento.target.closest?.(".boton-cantidad");

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


if (limpiarComparacion) {
  limpiarComparacion.addEventListener(
    "click",
    vaciarSeleccionComparacion
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
      cerrarPanelCarrito();

      if (comparacionAbierta) {
        cerrarVistaComparacion();
      }
    }
  }
);


/* =========================================
   INICIO
========================================= */

try {
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
