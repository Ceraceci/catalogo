/*
  CERACECI - v9 LISTA PDF + FUENTE WEB DIRECTA

  IMPORTANTE:
  Esta versión NO actualiza automáticamente LISTA PDF.
  Tampoco tiene onEdit.
  El PDF NO se genera automáticamente.

  Menú CERACECI:
  1) "Previsualizar sincronización"
     NO modifica LISTA PDF.
  2) "Aplicar precios de WEB"
     Solo puede escribir en las 370 celdas de precio
     previamente validadas.

  La antigua función de reparación permanece en el archivo
  únicamente como respaldo, pero ya no aparece en el menú.
*/

const CERACECI_CONFIG = {
  HOJA_WEB: "WEB",
  HOJA_LISTA: "LISTA PDF",
  HOJA_PREVIEW: "PREVISUALIZACION PDF"
};


/* =========================================================
   FUENTE DIRECTA PARA LA PÁGINA WEB

   Objetivo:
   dejar de depender del CSV de "Publicar en la Web",
   que puede entregar temporalmente una copia vieja.

   La aplicación web devuelve SOLAMENTE la hoja WEB.
   COSTOS y LISTA PDF no se exponen.
========================================================= */

const CERACECI_WEB = {
  PROPIEDAD_ID: "CERACECI_SPREADSHEET_ID"
};


/*
  Ejecutar una sola vez desde el menú:
  CERACECI -> 3. Configurar fuente para la página web

  Guarda el ID de ESTA planilla en las propiedades privadas
  del proyecto de Apps Script para que doGet pueda abrirla
  cuando la página web haga una solicitud.
*/
function configurarFuenteWeb() {

  const libro =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!libro) {
    throw new Error(
      "No pude identificar la planilla activa."
    );
  }

  const web =
    libro.getSheetByName(
      CERACECI_CONFIG.HOJA_WEB
    );

  if (!web) {
    throw new Error(
      "No encuentro la hoja WEB."
    );
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      CERACECI_WEB.PROPIEDAD_ID,
      libro.getId()
    );

  SpreadsheetApp.getUi().alert(
    "CERACECI",
    "Fuente web configurada correctamente.\\n\\n" +
    "El siguiente paso es implementar este Apps Script como Aplicación web.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


/*
  Esta función se ejecuta cada vez que la página web consulta
  la URL /exec de la aplicación web.

  Devuelve CSV generado directamente desde los valores actuales
  de la hoja WEB.
*/
function doGet(e) {

  const id =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        CERACECI_WEB.PROPIEDAD_ID
      );

  if (!id) {
    return ContentService
      .createTextOutput(
        "ERROR: primero ejecutá configurarFuenteWeb()."
      )
      .setMimeType(
        ContentService.MimeType.TEXT
      );
  }

  const libro =
    SpreadsheetApp.openById(id);

  const web =
    libro.getSheetByName(
      CERACECI_CONFIG.HOJA_WEB
    );

  if (!web) {
    return ContentService
      .createTextOutput(
        "ERROR: no encuentro la hoja WEB."
      )
      .setMimeType(
        ContentService.MimeType.TEXT
      );
  }

  /*
    getDisplayValues() obtiene lo que actualmente muestra WEB.
    El sitio ya sabe interpretar precios con $ y separadores.
  */
  const datos =
    web.getDataRange()
      .getDisplayValues();

  const csv =
    datos
      .map(
        fila =>
          fila
            .map(escaparCSV_)
            .join(",")
      )
      .join("\r\n");

  return ContentService
    .createTextOutput(csv)
    .setMimeType(
      ContentService.MimeType.CSV
    );
}


/*
  Escapado CSV estándar:
  - duplica comillas;
  - encierra entre comillas cuando hay coma,
    comillas o salto de línea.
*/
function escaparCSV_(valor) {

  const texto =
    String(
      valor === null ||
      valor === undefined
        ? ""
        : valor
    );

  if (
    texto.includes(",") ||
    texto.includes('"') ||
    texto.includes("\n") ||
    texto.includes("\r")
  ) {
    return (
      '"' +
      texto.replace(/"/g, '""') +
      '"'
    );
  }

  return texto;
}



/* =========================================================
   MENÚ
========================================================= */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CERACECI")
    .addItem("1. Previsualizar sincronización", "previsualizarListaPDF")
    .addItem("2. Aplicar precios de WEB", "aplicarPreciosWEB")
    .addSeparator()
    .addItem("3. Configurar fuente para la página web", "configurarFuenteWeb")
    .addToUi();
}


/* =========================================================
   1. REPARAR LOS ERRORES QUE YA QUEDARON EN LISTA PDF

   Esta reparación fue construida comparando:
   - la copia limpia anterior;
   - la copia actual que subiste después del error.

   Se detectaron:
   - 27 precios agregados en celdas que originalmente estaban vacías;
   - 5 encabezados de presentación reemplazados por precios.

   NO se revierten los 7 cambios de precios correctos que sí coinciden
   con WEB.
========================================================= */

function repararErroresListaPDF() {

  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const lista = libro.getSheetByName(CERACECI_CONFIG.HOJA_LISTA);

  if (!lista) {
    throw new Error("No encuentro la hoja LISTA PDF.");
  }

  validarEstructura_(lista);

  /*
    Celdas que en la versión limpia estaban VACÍAS y luego
    recibieron precios incorrectamente.
  */
  const celdasQueDebenQuedarVacias = [
    "D25",
    "D41",
    "D45", "F45",
    "D55", "F55",
    "D59", "F59",
    "D64", "F64",
    "E85", "F85", "G85",
    "D95",
    "E124", "F124", "G124",
    "E133", "F133", "G133",
    "E150",
    "E190", "F190", "G190",
    "G192",
    "D232",
    "D241"
  ];

  celdasQueDebenQuedarVacias.forEach(celda => {
    lista.getRange(celda).clearContent();
  });

  /*
    Encabezados que fueron reemplazados por precios.
    Restauramos solamente su TEXTO.
  */
  lista.getRange("D43").setValue("1 KG.");
  lista.getRange("F43").setValue("25 KG.");

  lista.getRange("E90").setValue("10 G.");
  lista.getRange("F90").setValue("25 G.");
  lista.getRange("G90").setValue("50 G.");

  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    "CERACECI",
    "Se repararon exactamente las 32 celdas dañadas. " +
    "Los precios correctos que ya coincidían con WEB no fueron revertidos.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


/* =========================================================
   2. PREVISUALIZACIÓN

   ESTA FUNCIÓN NO MODIFICA LISTA PDF.
========================================================= */


/* =========================================================
   2. APLICAR PRECIOS DE WEB

   Esta función usa EXACTAMENTE el mismo mapa de 370 celdas
   que ya fue validado en la previsualización.

   Seguridad:
   - si no hay exactamente 370 objetivos, se detiene;
   - si falta un precio en WEB, se detiene antes de escribir;
   - si una celda objetivo contiene una fórmula, se detiene;
   - si una celda objetivo contiene texto no numérico, se detiene;
   - nunca busca posiciones nuevas ni "adivina" celdas;
   - nunca toca imágenes, títulos, ¡NUEVO!, ¡PROMO! ni HERRAMIENTAS.
========================================================= */

function aplicarPreciosWEB() {

  const libro = SpreadsheetApp.getActiveSpreadsheet();

  const web = libro.getSheetByName(CERACECI_CONFIG.HOJA_WEB);
  const lista = libro.getSheetByName(CERACECI_CONFIG.HOJA_LISTA);

  if (!web || !lista) {
    throw new Error("No encuentro las hojas WEB o LISTA PDF.");
  }

  validarEstructura_(lista);

  const indices = construirIndicesWEB_(web);
  const objetivos = construirObjetivos_(lista);

  if (objetivos.length !== 370) {
    throw new Error(
      "Por seguridad se detuvo la actualización. " +
      "El mapa debería contener exactamente 370 celdas de precio, " +
      "pero contiene " + objetivos.length + "."
    );
  }

  const cambios = [];
  const problemas = [];

  objetivos.forEach(obj => {

    const resultado = resolverPrecio_(obj, indices);

    if (resultado.precio === null) {
      problemas.push(
        obj.celda + " - " + obj.nombreMostrar +
        ": no encontré precio en WEB."
      );
      return;
    }

    const rango = lista.getRange(obj.celda);

    const formula = rango.getFormula();

    if (formula) {
      problemas.push(
        obj.celda + " - " + obj.nombreMostrar +
        ": contiene una fórmula y no será reemplazada."
      );
      return;
    }

    const valorActual = rango.getValue();
    const actual = leerPrecio_(valorActual);

    /*
      Permitimos una celda vacía solamente porque ya está dentro
      del mapa exacto de 370 celdas aprobado.
      Si tiene texto que no es precio, se detiene.
    */
    if (
      valorActual !== "" &&
      valorActual !== null &&
      actual === null
    ) {
      problemas.push(
        obj.celda + " - " + obj.nombreMostrar +
        ": contiene texto inesperado \"" +
        rango.getDisplayValue() + "\"."
      );
      return;
    }

    if (
      actual === null ||
      Math.abs(actual - resultado.precio) >= 0.001
    ) {
      cambios.push({
        celda: obj.celda,
        producto: obj.nombreMostrar,
        presentacion: obj.presentacion,
        actual: actual,
        nuevo: resultado.precio
      });
    }
  });


  /*
    Regla transaccional:
    si existe UN SOLO problema, no se escribe NADA.
  */
  if (problemas.length > 0) {
    throw new Error(
      "No se modificó LISTA PDF porque encontré " +
      problemas.length +
      " problema(s):\n\n" +
      problemas.slice(0, 15).join("\n")
    );
  }


  if (cambios.length === 0) {
    SpreadsheetApp.getUi().alert(
      "CERACECI",
      "No hay precios para cambiar. Las 370 celdas ya coinciden con WEB.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }


  const muestra = cambios
    .slice(0, 10)
    .map(c =>
      c.celda + " - " +
      c.producto + " (" +
      c.presentacion + "): " +
      (c.actual === null ? "vacío" : "$" + c.actual) +
      " → $" + c.nuevo
    )
    .join("\n");

  const extra =
    cambios.length > 10
      ? "\n\n...y " + (cambios.length - 10) + " cambio(s) más."
      : "";

  const respuesta =
    SpreadsheetApp.getUi().alert(
      "Confirmar actualización",
      "Se modificarán únicamente " +
      cambios.length +
      " de las 370 celdas de precio validadas.\n\n" +
      muestra +
      extra +
      "\n\n¿Querés aplicar estos cambios?",
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );

  if (respuesta !== SpreadsheetApp.getUi().Button.YES) {
    return;
  }


  /*
    Recién después de todas las validaciones y de tu confirmación
    se escriben los precios.
  */
  cambios.forEach(cambio => {
    lista.getRange(cambio.celda).setValue(cambio.nuevo);
  });

  actualizarMesListaPDF_();

  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    "CERACECI",
    "Actualización terminada.\n\n" +
    cambios.length +
    " precio(s) fueron modificados.\n" +
    "No se tocó ninguna otra celda de LISTA PDF.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


/* =========================================================
   MES DEL ENCABEZADO

   Se actualiza solamente cuando aplicás precios.
   El PDF sigue sin generarse automáticamente.
========================================================= */

function actualizarMesListaPDF_() {

  const libro = SpreadsheetApp.getActiveSpreadsheet();

  const lista = libro.getSheetByName(
    CERACECI_CONFIG.HOJA_LISTA
  );

  if (!lista) return;

  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL",
    "MAYO", "JUNIO", "JULIO", "AGOSTO",
    "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  const hoy = new Date();

  lista.getRange("B1").setValue(
    meses[hoy.getMonth()] +
    " - PERGAMINO, BS. AS."
  );
}


function previsualizarListaPDF() {

  const libro = SpreadsheetApp.getActiveSpreadsheet();

  const web = libro.getSheetByName(CERACECI_CONFIG.HOJA_WEB);
  const lista = libro.getSheetByName(CERACECI_CONFIG.HOJA_LISTA);

  if (!web || !lista) {
    throw new Error("No encuentro las hojas WEB o LISTA PDF.");
  }

  validarEstructura_(lista);

  const indices = construirIndicesWEB_(web);
  const objetivos = construirObjetivos_(lista);

  const salida = [
    [
      "Estado",
      "Celda",
      "Producto en LISTA PDF",
      "Código",
      "Presentación",
      "Precio actual",
      "Precio WEB",
      "Origen"
    ]
  ];

  let cambiar = 0;
  let iguales = 0;
  let faltantes = 0;

  objetivos.forEach(obj => {

    const actual = leerPrecio_(lista.getRange(obj.celda).getValue());

    const resultado = resolverPrecio_(obj, indices);

    let estado = "";
    let precioWEB = "";

    if (resultado.precio === null) {
      estado = "SIN COINCIDENCIA";
      faltantes++;

    } else {

      precioWEB = resultado.precio;

      if (
        actual !== null &&
        Math.abs(actual - resultado.precio) < 0.001
      ) {
        estado = "IGUAL";
        iguales++;
      } else {
        estado = "CAMBIAR";
        cambiar++;
      }
    }

    salida.push([
      estado,
      obj.celda,
      obj.nombreMostrar,
      obj.codigoMostrar,
      obj.presentacion,
      actual === null ? "" : actual,
      precioWEB,
      resultado.origen
    ]);
  });


  let preview =
    libro.getSheetByName(CERACECI_CONFIG.HOJA_PREVIEW);

  if (!preview) {
    preview = libro.insertSheet(CERACECI_CONFIG.HOJA_PREVIEW);
  } else {
    preview.clear();
  }

  preview
    .getRange(1, 1, salida.length, salida[0].length)
    .setValues(salida);

  preview.setFrozenRows(1);

  preview.getRange("A1:H1")
    .setFontWeight("bold");

  preview.autoResizeColumns(1, 8);

  /*
    Formato monetario únicamente para las dos columnas de precios.
  */
  if (salida.length > 1) {
    preview
      .getRange(2, 6, salida.length - 1, 2)
      .setNumberFormat('$#,##0');
  }

  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    "Previsualización terminada",
    "Se revisaron " + objetivos.length + " celdas de precio.\n\n" +
    "IGUAL: " + iguales + "\n" +
    "CAMBIAR: " + cambiar + "\n" +
    "SIN COINCIDENCIA: " + faltantes + "\n\n" +
    "LISTA PDF NO fue modificada. Revisá la hoja PREVISUALIZACION PDF.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


/* =========================================================
   VALIDACIÓN DE LA PLANTILLA

   Si alguna de estas referencias no coincide, el script se detiene.
   Así no intenta trabajar sobre una estructura distinta.
========================================================= */

function validarEstructura_(lista) {

  const controles = [
    ["C5",   "PASTAS CHILAVERT"],
    ["C15",  "BARBOTINAS CHILAVERT"],
    ["C26",  "MATERIALES SECOS"],
    ["C42",  "YESO PESCIO"],
    ["C46",  "ESMALTES DP"],
    ["C96",  "ENGOBES DP (PREPARADOS Y LISTOS PARA USAR)"],
    ["C151", "PIGMENTOS PUROS DP"],
    ["C195", "ACUARELAS DP"],
    ["C233", "ALAMBRES"],
    ["C242", "HERRAMIENTAS"]
  ];

  const errores = [];

  controles.forEach(([celda, esperado]) => {

    const real =
      normalizarTexto_(lista.getRange(celda).getDisplayValue());

    if (real !== normalizarTexto_(esperado)) {
      errores.push(
        celda + ": esperaba \"" + esperado +
        "\" y encontré \"" +
        lista.getRange(celda).getDisplayValue() + "\""
      );
    }
  });

  if (errores.length > 0) {
    throw new Error(
      "La estructura de LISTA PDF cambió. " +
      "Por seguridad no se hará nada.\n\n" +
      errores.join("\n")
    );
  }
}


/* =========================================================
   ÍNDICES DE WEB
========================================================= */

function construirIndicesWEB_(web) {

  const datos = web.getDataRange().getValues();

  if (datos.length < 2) {
    throw new Error("WEB no contiene datos.");
  }

  const headers = datos[0].map(normalizarTexto_);

  const iCodigo = headers.indexOf("CODIGO");
  const iProducto = headers.indexOf("PRODUCTO");
  const iPresentacion = headers.indexOf("PRESENTACION");
  const iPrecio = headers.indexOf("PRECIO");
  const iActivo = headers.indexOf("ACTIVO");

  if (
    iProducto === -1 ||
    iPresentacion === -1 ||
    iPrecio === -1
  ) {
    throw new Error(
      "WEB debe tener las columnas Producto, Presentación y Precio."
    );
  }

  const porCodigo = new Map();
  const porNombre = new Map();

  for (let i = 1; i < datos.length; i++) {

    const fila = datos[i];

    const activo =
      iActivo === -1
        ? "SI"
        : normalizarTexto_(fila[iActivo]);

    if (activo === "NO") {
      continue;
    }

    const codigo =
      iCodigo === -1
        ? ""
        : normalizarCodigo_(fila[iCodigo]);

    const nombre =
      normalizarTexto_(fila[iProducto]);

    const presentacion =
      normalizarPresentacion_(fila[iPresentacion]);

    const precio =
      leerPrecio_(fila[iPrecio]);

    if (!nombre || !presentacion || precio === null) {
      continue;
    }

    porNombre.set(
      nombre + "|||" + presentacion,
      precio
    );

    if (codigo) {
      porCodigo.set(
        codigo + "|||" + presentacion,
        precio
      );
    }
  }

  return {
    porCodigo,
    porNombre
  };
}


/* =========================================================
   MAPA EXACTO DE CELDAS DE PRECIO DE LA PLANTILLA ACTUAL

   No se buscan "lugares posibles".
   Solo se revisan las celdas que, en la plantilla que analizamos,
   son verdaderas celdas de precio.
========================================================= */

function construirObjetivos_(lista) {

  const o = [];

  function agregar(celda, presentacion, opciones) {

    opciones = opciones || {};

    const fila =
      Number(celda.match(/\d+/)[0]);

    const codigoLista =
      lista.getRange("B" + fila).getDisplayValue();

    const nombreLista =
      lista.getRange("C" + fila).getDisplayValue();

    o.push({
      celda: celda,
      fila: fila,
      presentacion: normalizarPresentacion_(presentacion),

      codigoMostrar:
        opciones.codigoMostrar !== undefined
          ? opciones.codigoMostrar
          : codigoLista,

      nombreMostrar:
        opciones.nombreMostrar !== undefined
          ? opciones.nombreMostrar
          : nombreLista,

      codigoFuente:
        opciones.codigoFuente || "",

      nombreFuente:
        opciones.nombreFuente || "",

      tipoEspecial:
        opciones.tipoEspecial || ""
    });
  }


  /* ---------------- PASTAS ---------------- */

  agregar("F6",  "10 KG", { nombreFuente: "PASTA LISA BLANCA PARA BAJA" });

  agregar("D7",  "5 KG", { nombreFuente: "PASTA BLANCA CON CHAMOTE" });
  agregar("D8",  "5 KG", { nombreFuente: "PASTA GRES CLARO" });
  agregar("D9",  "5 KG", { nombreFuente: "PASTA GRES OSCURO" });
  agregar("D10", "5 KG", { nombreFuente: "PASTA ROJA" });
  agregar("D11", "5 KG", { nombreFuente: "PASTA ROJA CON CHAMOTE" });
  agregar("D12", "5 KG", { nombreFuente: "PASTA ROJA FUEGO DIRECTO" });
  agregar("D13", "5 KG", { nombreFuente: "PASTA RAKU" });


  /* ---------------- BARBOTINAS / ENVASE ---------------- */

  agregar("D17", "9 KG", {
    nombreFuente: "BARBOTINA BAJA TEMPERATURA"
  });

  agregar("D18", "9 KG", {
    tipoEspecial: "BARBOTINA_BAJA_MAS_BIDON"
  });

  agregar("D20", "9 KG", {
    nombreFuente: "BARBOTINA GRES"
  });

  agregar("D21", "9 KG", {
    tipoEspecial: "BARBOTINA_GRES_MAS_BIDON"
  });

  agregar("D23", "1 U", {
    nombreFuente: "BIDON BOCA ANCHA"
  });


  /* ---------------- MATERIALES SECOS ---------------- */

  const materiales = {
    27: "APM 112",
    28: "BENTONITA",
    29: "CAOLIN SUR DEL RIO",
    30: "CARBONATO DE CALCIO",
    31: "CHAMOTE MOLIDO M18",
    32: "CHAMOTE FINO M200",
    33: "CHAMOTE IMPALPABLE M325",
    34: "CUARZO M200",
    35: "FELDESPATO POTASICO M200",
    36: "FELDESPATO SODICO M200",
    37: "NEFELINA SIENITA",
    38: "TINCAR MOLIDA Z",
    39: "TALCO CHINO",
    40: "TALCO INDUSTRIAL"
  };

  Object.keys(materiales).forEach(fila => {
    agregar("D" + fila, "1 KG", {
      nombreFuente: materiales[fila]
    });
  });


  /* ---------------- YESO ---------------- */

  agregar("D44", "1 KG", {
    nombreFuente: "YESO BETALFA"
  });

  agregar("F44", "25 KG", {
    nombreFuente: "YESO BETALFA"
  });


  /* ---------------- ESMALTES ---------------- */

  [48, 49, 51, 53, 54].forEach(fila => {

    const codigo =
      lista.getRange("B" + fila).getDisplayValue();

    agregar("D" + fila, "500 G", {
      codigoFuente: codigo
    });

    agregar("F" + fila, "1 KG", {
      codigoFuente: codigo
    });
  });

  /*
    DP-BL-46 se mantiene visible en la lista,
    pero toma el precio de DP-BL-48.
  */
  agregar("D50", "500 G", {
    codigoFuente: "DP-BL-48"
  });

  agregar("F50", "1 KG", {
    codigoFuente: "DP-BL-48"
  });


  /* ---------------- ESMALTE DE COLOR ---------------- */

  agregar("D58", "250 G", {
    codigoFuente: lista.getRange("B58").getDisplayValue()
  });

  agregar("F58", "500 G", {
    codigoFuente: lista.getRange("B58").getDisplayValue()
  });


  /* ---------------- FUNDENTES ---------------- */

  [62, 63].forEach(fila => {

    const codigo =
      lista.getRange("B" + fila).getDisplayValue();

    agregar("D" + fila, "500 G", {
      codigoFuente: codigo
    });

    agregar("F" + fila, "1 KG", {
      codigoFuente: codigo
    });
  });


  /* ---------------- ÓXIDOS Y CARBONATOS ---------------- */

  const oxidos = {
    67: { F: "25 G", G: "50 G" },
    68: { E: "10 G", F: "25 G", G: "50 G" },
    69: { D: "5 G", E: "10 G", F: "25 G" },
    70: { D: "5 G", E: "10 G", F: "25 G", G: "50 G" },
    71: { E: "10 G", F: "25 G", G: "50 G" },
    72: { D: "5 G", E: "10 G", F: "25 G" },
    73: { E: "10 G", F: "25 G", G: "50 G" },
    74: { E: "10 G", F: "25 G", G: "50 G" },
    75: { E: "10 G", F: "25 G", G: "50 G" },
    76: { E: "10 G", F: "25 G", G: "50 G" },
    77: { D: "5 G", E: "10 G", F: "25 G" },
    78: { E: "10 G", F: "25 G", G: "50 G" },
    79: { E: "10 G", F: "25 G", G: "50 G" },
    80: { F: "25 G", G: "50 G" }
  };

  const nombresOxidos = {
    67: "ALUMINA CALCINADA / ÓXIDO DE ALUMINIO",
    68: "OXIDO DE CIRCONIO",
    69: "OXIDO DE COBALTO",
    70: "OXIDO DE COBRE NEGRO",
    71: "OXIDO DE CROMO VERDE",
    72: "OXIDO DE ESTAÑO",
    73: "OXIDO DE HIERRO ROJO",
    74: "OXIDO DE HIERRO AMARILLO",
    75: "OXIDO DE MANGANESO",
    76: "OXIDO DE MINIO",
    77: "OXIDO DE NIQUEL",
    78: "OXIDO DE TITANIO (CALIDAD RUTILO)",
    79: "OXIDO DE ZINC",
    80: "CARBONATO DE BARIO"
  };

  Object.keys(oxidos).forEach(fila => {

    Object.keys(oxidos[fila]).forEach(col => {

      agregar(col + fila, oxidos[fila][col], {
        nombreFuente: nombresOxidos[fila]
      });
    });
  });


  /* ---------------- JASPEADORES / OPACIFICANTES ---------------- */

  const jaspeadores = {
    82: "ARENA DE RUTILO",
    83: "HARINA DE RUTILO",
    84: "SILICATO DE CIRCONIO"
  };

  Object.keys(jaspeadores).forEach(fila => {

    agregar("E" + fila, "10 G", {
      nombreFuente: jaspeadores[fila]
    });

    agregar("F" + fila, "25 G", {
      nombreFuente: jaspeadores[fila]
    });

    agregar("G" + fila, "50 G", {
      nombreFuente: jaspeadores[fila]
    });
  });


  /* ---------------- AUXILIARES ---------------- */

  agregar("D87", "50 CC", {
    nombreFuente: "ACEITE DE LINO"
  });

  ["E", "F", "G"].forEach((col, i) => {
    agregar(col + "91", ["10 G", "25 G", "50 G"][i], {
      nombreFuente: "CMC (CARBOXIMETIL CELULOSA)"
    });
  });

  agregar("D94", "370 G", {
    nombreFuente: "SILICATO DE SODIO"
  });


  /* ---------------- ENGOBES ---------------- */

  for (let fila = 98; fila <= 123; fila++) {

    const codigo =
      lista.getRange("B" + fila).getDisplayValue();

    agregar("E" + fila, "60 CC",  { codigoFuente: codigo });
    agregar("F" + fila, "100 CC", { codigoFuente: codigo });
    agregar("G" + fila, "200 CC", { codigoFuente: codigo });
  }

  for (let fila = 126; fila <= 132; fila++) {

    const codigo =
      lista.getRange("B" + fila).getDisplayValue();

    agregar("E" + fila, "60 CC",  { codigoFuente: codigo });
    agregar("F" + fila, "100 CC", { codigoFuente: codigo });
    agregar("G" + fila, "200 CC", { codigoFuente: codigo });
  }

  for (let fila = 135; fila <= 149; fila++) {

    const codigo =
      lista.getRange("B" + fila).getDisplayValue();

    agregar("E" + fila, "100 CC", {
      codigoFuente: codigo
    });
  }


  /* ---------------- PIGMENTOS ---------------- */

  for (let fila = 153; fila <= 189; fila++) {

    const codigo =
      lista.getRange("B" + fila).getDisplayValue();

    agregar("E" + fila, "10 G", {
      codigoFuente: codigo
    });

    agregar("F" + fila, "25 G", {
      codigoFuente: codigo
    });

    agregar("G" + fila, "50 G", {
      codigoFuente: codigo
    });
  }


  /* ---------------- KITS DE ACUARELAS ---------------- */

  agregar("D191", "18 U", {
    codigoFuente: "DP-AC-COMPLETO",
    nombreMostrar:
      lista.getRange("B191").getDisplayValue()
  });

  agregar("D193", "12 U", {
    codigoFuente: "DP-AC-PASTEL-12",
    nombreMostrar:
      lista.getRange("B193").getDisplayValue()
  });


  /* ---------------- ACUARELAS INDIVIDUALES ----------------

     NUEVA ESTRUCTURA:
     - D queda libre/reservada para imagen.
     - El precio está en E:G combinado.
     - En Google Sheets, una celda combinada E:G se escribe
       siempre desde su celda superior izquierda: E.
  ------------------------------------------------------------ */

  for (let fila = 197; fila <= 216; fila++) {

    agregar("E" + fila, "10 G", {
      codigoFuente: "DP-AC-CO-18-SUELTAS"
    });
  }

  for (let fila = 218; fila <= 231; fila++) {

    agregar("E" + fila, "10 G", {
      codigoFuente: "DP-AC-PA-12-SUELTAS"
    });
  }


  /* ---------------- ALAMBRES ---------------- */

  for (let fila = 234; fila <= 240; fila++) {

    agregar("D" + fila, "1 M", {
      nombreFuente:
        lista.getRange("C" + fila).getDisplayValue()
    });
  }


  return o;
}


/* =========================================================
   RESOLVER PRECIO DE UN OBJETIVO
========================================================= */

function resolverPrecio_(obj, indices) {

  if (obj.tipoEspecial === "BARBOTINA_BAJA_MAS_BIDON") {

    const a =
      indices.porNombre.get(
        normalizarTexto_("BARBOTINA BAJA TEMPERATURA") +
        "|||9 KG"
      );

    const b =
      indices.porNombre.get(
        normalizarTexto_("BIDON BOCA ANCHA") +
        "|||1 U"
      );

    if (a === undefined || b === undefined) {
      return {
        precio: null,
        origen: "BARBOTINA BAJA + BIDÓN"
      };
    }

    return {
      precio: a + b,
      origen: "BARBOTINA BAJA + BIDÓN"
    };
  }


  if (obj.tipoEspecial === "BARBOTINA_GRES_MAS_BIDON") {

    const a =
      indices.porNombre.get(
        normalizarTexto_("BARBOTINA GRES") +
        "|||9 KG"
      );

    const b =
      indices.porNombre.get(
        normalizarTexto_("BIDON BOCA ANCHA") +
        "|||1 U"
      );

    if (a === undefined || b === undefined) {
      return {
        precio: null,
        origen: "BARBOTINA GRES + BIDÓN"
      };
    }

    return {
      precio: a + b,
      origen: "BARBOTINA GRES + BIDÓN"
    };
  }


  if (obj.codigoFuente) {

    const codigo =
      normalizarCodigo_(obj.codigoFuente);

    const clave =
      codigo + "|||" + obj.presentacion;

    const precio =
      indices.porCodigo.get(clave);

    return {
      precio:
        precio === undefined
          ? null
          : precio,
      origen:
        "Código " +
        obj.codigoFuente
    };
  }


  if (obj.nombreFuente) {

    const nombre =
      normalizarTexto_(obj.nombreFuente);

    const clave =
      nombre + "|||" + obj.presentacion;

    const precio =
      indices.porNombre.get(clave);

    return {
      precio:
        precio === undefined
          ? null
          : precio,
      origen:
        "Nombre exacto: " +
        obj.nombreFuente
    };
  }


  return {
    precio: null,
    origen: ""
  };
}


/* =========================================================
   UTILIDADES
========================================================= */

function normalizarTexto_(valor) {

  return String(
    valor === null || valor === undefined
      ? ""
      : valor
  )
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizarCodigo_(valor) {

  return normalizarTexto_(valor)
    .replace(/[^A-Z0-9]/g, "");
}


function normalizarPresentacion_(valor) {

  const texto =
    normalizarTexto_(valor);

  const m =
    texto.match(
      /(\d+(?:[.,]\d+)?)\s*(KG|G|CC|ML|L|M|U|UNIDAD|UNIDADES)\b/
    );

  if (!m) {
    return "";
  }

  let numero =
    m[1].replace(",", ".");

  if (numero.endsWith(".0")) {
    numero =
      numero.slice(0, -2);
  }

  let unidad = m[2];

  if (
    unidad === "UNIDAD" ||
    unidad === "UNIDADES"
  ) {
    unidad = "U";
  }

  return numero + " " + unidad;
}


function leerPrecio_(valor) {

  if (
    typeof valor === "number" &&
    Number.isFinite(valor)
  ) {
    return valor;
  }

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  let texto =
    String(valor)
      .trim()
      .replace(/\$/g, "")
      .replace(/\s/g, "");

  if (!texto) {
    return null;
  }

  if (
    /[A-Za-z]/.test(texto) ||
    texto.includes("/") ||
    texto.toLowerCase().includes("x")
  ) {
    return null;
  }

  /*
    En Google Sheets los precios normalmente llegan como números.
    Esto cubre además textos del tipo $3.400 o $3.400,50.
  */
  if (
    texto.includes(".") &&
    !texto.includes(",")
  ) {

    const partes =
      texto.split(".");

    if (
      partes.length > 1 &&
      partes.slice(1).every(
        parte => parte.length === 3
      )
    ) {
      texto =
        partes.join("");
    }
  }

  texto =
    texto
      .replace(/\./g, "")
      .replace(",", ".");

  const numero =
    Number(texto);

  return Number.isFinite(numero)
    ? numero
    : null;
}
