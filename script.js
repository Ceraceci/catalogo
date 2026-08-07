const URL_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNAyxed_DNsPeWRmmObCIUFKVwrEIDN4f-lwLc6ms0fYYeFT1NVyz_ets4UJeYzVrzDbXnXKzXxXVt/pub?gid=314385761&single=true&output=csv";

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

const totalCarrito =
  document.getElementById("totalCarrito");

const vaciarCarrito =
  document.getElementById("vaciarCarrito");

const finalizarPedido =
  document.getElementById("finalizarPedido");

let productosAgrupados = [];
let productosMostrados = [];
let carritoCompras = cargarCarritoGuardado();
let productoCompartidoPendiente =
  new URLSearchParams(window.location.search).get("producto");


/* =========================================
   CARGA DE PRODUCTOS
========================================= */

async function cargarProductos() {
  try {
    estado.textContent = "Cargando productos...";

    const respuesta = await fetch(URL_CSV);

    if (!respuesta.ok) {
      throw new Error(
        `No se pudo descargar la lista. Error ${respuesta.status}`
      );
    }

    const textoCSV = await respuesta.text();
    const filas = convertirCSV(textoCSV);

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
              : "Sí"
        };

        return normalizarFilaKanthal(producto);
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

    cargarCategorias();
    filtrarProductos();
  } catch (error) {
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
        categoria: fila.categoria,
        presentaciones: []
      });
    }

    const producto = agrupados.get(clave);

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

function cargarCategorias() {
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
      Todas las categorías
    </option>
  `;

  categorias.forEach((categoria) => {
    const opcion =
      document.createElement("option");

    opcion.value = categoria;
    opcion.textContent = categoria;

    filtroCategoria.appendChild(opcion);
  });
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
    const presentacionInicial =
      producto.presentaciones[0];

    const tarjeta =
      document.createElement("article");

    tarjeta.className =
      "tarjeta-producto";

    tarjeta.dataset.idProducto =
      producto.id;

    tarjeta.dataset.nombre =
      producto.nombre;

    tarjeta.dataset.categoria =
      producto.categoria;

    tarjeta.dataset.presentacion =
      presentacionInicial.nombre;

    tarjeta.dataset.precio =
      String(presentacionInicial.precio);

    tarjeta.dataset.codigo =
      presentacionInicial.codigo || "";

    const productoInicialEnCarrito =
      carritoCompras.some((item) => {
        return (
          crearClaveCarrito(item) ===
          crearClaveCarrito({
            nombre: producto.nombre,
            presentacion:
              presentacionInicial.nombre,
            codigo:
              presentacionInicial.codigo || ""
          })
        );
      });

    const usarSelectorDesplegable =
      producto.presentaciones.length >= 7;

    const opcionesSelector =
      producto.presentaciones
        .map(
          (
            presentacion,
            indicePresentacion
          ) => {
            return `
              <option
                value="${indicePresentacion}"
              >
                ${escaparHTML(
                  presentacion.nombre
                )}
              </option>
            `;
          }
        )
        .join("");

    const botonesPresentaciones =
      producto.presentaciones
        .map(
          (
            presentacion,
            indicePresentacion
          ) => {
            return `
              <button
                type="button"
                class="boton-presentacion ${
                  indicePresentacion === 0
                    ? "seleccionada"
                    : ""
                }"
                data-id-producto="${
                  producto.id
                }"
                data-indice-presentacion="${
                  indicePresentacion
                }"
              >
                <span>
                  ${escaparHTML(
                    presentacion.nombre
                  )}
                </span>
              </button>
            `;
          }
        )
        .join("");

    const controlPresentaciones =
      usarSelectorDesplegable
        ? `
            <select
              class="selector-presentacion"
              data-id-producto="${producto.id}"
              aria-label="Elegir presentación de ${escaparHTML(
                producto.nombre
              )}"
            >
              ${opcionesSelector}
            </select>
          `
        : `
            <div class="opciones-presentacion">
              ${botonesPresentaciones}
            </div>
          `;

    tarjeta.innerHTML = `
      <div class="encabezado-producto">
        <div class="fila-categoria-producto">
          <span class="categoria">
            <img
              src="img/logo.png"
              alt=""
              class="logo-categoria"
              aria-hidden="true"
            >

            <span>${escaparHTML(producto.categoria)}</span>
          </span>

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
        </div>

        <div class="fila-titulo-producto">
          <h2>
            ${escaparHTML(producto.nombre)}
          </h2>
        </div>

        <p class="codigo-producto">
          ${
            presentacionInicial.codigo
              ? `<span class="codigo-etiqueta">Código:</span> <span class="codigo-valor">${escaparHTML(
                  presentacionInicial.codigo
                )}</span>`
              : ""
          }
        </p>
      </div>

      <div class="bloque-presentaciones">
  <p class="titulo-opciones">
    Presentación
  </p>

  ${controlPresentaciones}
</div>

      <div class="informacion-precio">
        <p class="etiqueta-precio">
          <span class="precio-palabra">Precio</span>
          <span class="unitario-palabra">unitario</span>
        </p>

        <p
          class="precio"
          data-precio="${
            presentacionInicial.precio
          }"
        >
          ${formatearPrecio(
            presentacionInicial.precio
          )}
        </p>

      </div>

      <div class="selector-cantidad">
        <span>Cantidad</span>

        <div class="control-cantidad">
          <button
            type="button"
            class="boton-cantidad restar"
            aria-label="Disminuir cantidad"
          >
            −
          </button>

          <input
            type="number"
            class="cantidad"
            value="1"
            min="1"
            step="1"
            readonly
            inputmode="none"
            tabindex="-1"
            aria-readonly="true"
          >

          <button
            type="button"
            class="boton-cantidad sumar"
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>
      </div>

      <div class="total-producto">
        <span class="etiqueta-total">Total</span>

        <strong class="precio-total">
          ${formatearPrecio(
            presentacionInicial.precio
          )}
        </strong>
      </div>

      <button
        type="button"
        class="agregar-carrito ${
          productoInicialEnCarrito
            ? "agregado"
            : ""
        }"
      >
        <span class="icono-agregar" aria-hidden="true">🛒</span>
        <span class="texto-agregar">
          ${
            productoInicialEnCarrito
              ? "Agregado"
              : "Agregar"
          }
        </span>
      </button>
    `;

    contenedorProductos.appendChild(
      tarjeta
    );
  });

  estado.textContent =
    `${lista.length} productos encontrados`;
}


function seleccionarPresentacion(control) {
  const tarjeta =
    control.closest(".tarjeta-producto");

  const idProducto =
    control.dataset.idProducto;

  const indicePresentacion =
    control.matches(".selector-presentacion")
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
    tarjeta
      .querySelectorAll(
        ".boton-presentacion"
      )
      .forEach((opcion) => {
        opcion.classList.remove(
          "seleccionada"
        );
      });

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

  const codigoProducto =
    tarjeta.querySelector(
      ".codigo-producto"
    );

  codigoProducto.innerHTML =
    presentacion.codigo
      ? `<span class="codigo-etiqueta">Código:</span> <span class="codigo-valor">${escaparHTML(
          presentacion.codigo
        )}</span>`
      : "";

  actualizarTotalTarjeta(tarjeta);
  actualizarEstadoBotonTarjeta(tarjeta);
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

  actualizarTotalTarjeta(tarjeta);
  marcarBotonTarjetaComoPendiente(tarjeta);
}


function actualizarTotalTarjeta(tarjeta) {
  const precio =
    Number(tarjeta.dataset.precio) || 0;

  const campoCantidad =
    tarjeta.querySelector(".cantidad");

  const cantidad =
    Math.max(
      1,
      Number(campoCantidad.value) || 1
    );

  campoCantidad.value = cantidad;

  tarjeta.querySelector(
    ".precio-total"
  ).textContent =
    formatearPrecio(
      precio * cantidad
    );
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


function mostrarAvisoCopiado() {
  if (!avisoCopiado) {
    return;
  }

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

function agregarProductoAlCarrito(boton) {
  const tarjeta =
    boton.closest(".tarjeta-producto");

  if (boton.classList.contains("agregado")) {
    return;
  }

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

  guardarYActualizarCarrito();
  actualizarEstadoBotonTarjeta(tarjeta);
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

  const textoBoton =
    boton.querySelector(".texto-agregar");

  if (textoBoton) {
    textoBoton.textContent = "Agregar";
  }

  boton.classList.remove("agregado");
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

  const estaEnCarrito =
    carritoCompras.some((producto) => {
      return (
        crearClaveCarrito(producto) ===
        claveTarjeta
      );
    });

  const textoBoton =
    boton.querySelector(".texto-agregar");

  if (textoBoton) {
    textoBoton.textContent =
      estaEnCarrito
        ? "Agregado"
        : "Agregar";
  }

  boton.classList.toggle(
    "agregado",
    estaEnCarrito
  );
}


function actualizarEstadoBotonesCarrito() {
  if (!contenedorProductos) {
    return;
  }

  contenedorProductos
    .querySelectorAll(
      ".tarjeta-producto"
    )
    .forEach((tarjeta) => {
      actualizarEstadoBotonTarjeta(
        tarjeta
      );
    });
}


function mostrarCarrito() {
  productosCarrito.innerHTML = "";

  if (carritoCompras.length === 0) {
    productosCarrito.innerHTML = `
      <div class="carrito-vacio">
        <span>🛒</span>

        <p>
          El carrito está vacío.
        </p>
      </div>
    `;

    if (valorCarrito) {
      valorCarrito.textContent =
        formatearPrecio(0);
    } else if (cantidadCarrito) {
      cantidadCarrito.textContent =
        `🛒 | ${formatearPrecio(0)}`;
    }

    totalCarrito.textContent =
      formatearPrecio(0);

    finalizarPedido.disabled = true;
    vaciarCarrito.disabled = true;

    return;
  }

  carritoCompras.forEach(
    (producto, indice) => {
      const subtotal =
        producto.precio *
        producto.cantidad;

      const elemento =
        document.createElement(
          "article"
        );

      elemento.className =
        "producto-carrito";

      elemento.innerHTML = `
        <div class="datos-producto-carrito">
          <h3>
            ${escaparHTML(
              producto.nombre
            )}
          </h3>

          <p>
            ${escaparHTML(
              producto.presentacion
            )}
          </p>

          ${
            producto.codigo
              ? `
                <small>
                  Código:
                  ${escaparHTML(
                    producto.codigo
                  )}
                </small>
              `
              : ""
          }

          <strong>
            ${formatearPrecio(
              producto.precio
            )} c/u
          </strong>
        </div>

        <div class="acciones-producto-carrito">
          <div class="control-cantidad-carrito">
            <button
              type="button"
              data-accion="restar"
              data-indice="${indice}"
              aria-label="Restar una unidad"
            >
              −
            </button>

            <span>
              ${producto.cantidad}
            </span>

            <button
              type="button"
              data-accion="sumar"
              data-indice="${indice}"
              aria-label="Sumar una unidad"
            >
              +
            </button>
          </div>

          <strong class="subtotal-carrito">
            ${formatearPrecio(subtotal)}
          </strong>

          <button
            type="button"
            class="eliminar-producto"
            data-accion="eliminar"
            data-indice="${indice}"
          >
            Eliminar
          </button>
        </div>
      `;

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
      formatearPrecio(precioTotal);
  } else if (cantidadCarrito) {
    cantidadCarrito.textContent =
      `🛒 | ${formatearPrecio(precioTotal)}`;
  }

  totalCarrito.textContent =
    formatearPrecio(precioTotal);

  finalizarPedido.disabled = false;
  vaciarCarrito.disabled = false;
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

    return datos.filter((producto) => {
      return (
        producto &&
        producto.nombre &&
        producto.presentacion &&
        Number(producto.precio) > 0 &&
        Number(producto.cantidad) > 0
      );
    });
  } catch (error) {
    console.error(
      "No se pudo recuperar el carrito.",
      error
    );

    return [];
  }
}


function abrirPanelCarrito() {
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
        `${producto.cantidad} × ${producto.nombre} (${producto.presentacion})`
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

  const mensaje = [
    "¡Hola! 😊",
    "",
    "Me gustaría consultar por este pedido:",
    "",
    ...lineasProductos,
    "",
    `💰 Total: ${formatearPrecio(precioTotal)}`,
    "",
    "¿Podrían confirmarme disponibilidad y coordinar la entrega?",
    "",
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
  ).format(precio);
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


function normalizarTexto(valor) {
  return limpiarTexto(valor)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
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

contenedorProductos.addEventListener(
  "click",
  (evento) => {
    const botonCompartir =
      evento.target.closest(
        ".compartir-producto"
      );

    if (botonCompartir) {
      compartirProducto(
        botonCompartir.dataset.idProducto
      );

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
);


contenedorProductos.addEventListener(
  "change",
  (evento) => {
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
);


contenedorProductos.addEventListener(
  "input",
  (evento) => {
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

    actualizarTotalTarjeta(tarjeta);
    marcarBotonTarjetaComoPendiente(tarjeta);
  }
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


/* =========================================
   CERRAR TECLADO MÓVIL AL CONFIRMAR BÚSQUEDA
========================================= */

if (formBusqueda) {
  formBusqueda.addEventListener(
    "submit",
    (evento) => {
      evento.preventDefault();

      /*
       * La búsqueda ya se actualiza mientras se escribe.
       * Al confirmar, únicamente quitamos el foco para
       * cerrar el teclado sin borrar el texto.
       */
      if (
        window.matchMedia(
          "(max-width: 650px)"
        ).matches
      ) {
        buscador.blur();
      }
    }
  );
}


filtroCategoria.addEventListener(
  "change",
  filtrarProductos
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
    }
  );
}


if (verCatalogoCompleto) {
  verCatalogoCompleto.addEventListener(
    "click",
    mostrarCatalogoCompleto
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

    const confirmar = window.confirm(
      "¿Querés vaciar todo el carrito?"
    );

    if (!confirmar) {
      return;
    }

    carritoCompras = [];
    guardarYActualizarCarrito();
  }
);
}

if (finalizarPedido) {
  finalizarPedido.addEventListener(
    "click",
    finalizarPedidoWhatsApp
  );
}


document.addEventListener(
  "keydown",
  (evento) => {
    if (evento.key === "Escape") {
      cerrarPanelCarrito();
    }
  }
);


/* =========================================
   INICIO
========================================= */

try {
  mostrarCarrito();
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
