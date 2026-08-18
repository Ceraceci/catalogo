/*
 * CERACECI - /api/catalogo
 * Cloudflare Pages Function con caché stale-while-revalidate.
 *
 * Comportamiento:
 * - hasta 60 s: devuelve el catálogo cacheado inmediatamente;
 * - después de 60 s: devuelve la copia anterior inmediatamente y
 *   actualiza Google Apps Script en segundo plano;
 * - conserva una copia de respaldo en el edge hasta 24 h.
 *
 * La URL de Apps Script se puede definir como variable de entorno
 * CERACECI_APPS_SCRIPT_URL. Si no existe, usa la URL actual conocida.
 */

const URL_APPS_SCRIPT_POR_DEFECTO =
  "https://script.google.com/macros/s/AKfycbw41VkFr-ElTG1gXqh-CZzEv0VTFP3qjVwWX0MSmwyXDbDBp79wdQJx_10yf6vj5FYW9w/exec";

const FRESCO_DURANTE_MS = 60 * 1000;
const RESPALDO_MAXIMO_MS = 24 * 60 * 60 * 1000;
const VERSION_CACHE = "ceraceci-catalogo-v3";


function obtenerURLAppsScript(env) {
  const configurada =
    env && env.CERACECI_APPS_SCRIPT_URL
      ? String(env.CERACECI_APPS_SCRIPT_URL).trim()
      : "";

  return configurada || URL_APPS_SCRIPT_POR_DEFECTO;
}


function crearClaveCache(request) {
  const url = new URL(request.url);

  url.pathname =
    "/__cache_interno__/" + VERSION_CACHE;

  url.search = "";

  return new Request(
    url.toString(),
    {
      method: "GET"
    }
  );
}


function edadCacheMs(response) {
  const guardadoEn = Number(
    response.headers.get("X-Ceraceci-Cached-At") || 0
  );

  if (!Number.isFinite(guardadoEn) || guardadoEn <= 0) {
    return Infinity;
  }

  return Math.max(0, Date.now() - guardadoEn);
}


function respuestaParaCliente(response, estadoCache) {
  const headers = new Headers(response.headers);

  /*
   * El caché largo es interno de Cloudflare.
   * Al navegador no le damos 24 h de caché HTTP: el navegador ya tiene
   * su propia copia inmediata en localStorage y consulta /api/catalogo
   * para verificar novedades.
   */
  headers.set(
    "Cache-Control",
    "no-cache, max-age=0, must-revalidate"
  );

  headers.set(
    "X-Ceraceci-Cache",
    estadoCache
  );

  return new Response(
    response.body,
    {
      status: response.status,
      statusText: response.statusText,
      headers
    }
  );
}


async function descargarOrigen(urlAppsScript) {
  const separador =
    urlAppsScript.includes("?") ? "&" : "?";

  const respuesta = await fetch(
    urlAppsScript +
      separador +
      "origen=cloudflare&_=" +
      Date.now(),
    {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/csv,text/plain;q=0.9,*/*;q=0.1"
      }
    }
  );

  if (!respuesta.ok) {
    throw new Error(
      "Apps Script respondió HTTP " + respuesta.status
    );
  }

  const texto = await respuesta.text();

  if (!texto.trim()) {
    throw new Error(
      "Apps Script devolvió un catálogo vacío."
    );
  }

  if (/^\s*ERROR:/i.test(texto)) {
    throw new Error(texto.trim());
  }

  return texto;
}


async function actualizarCache(
  cache,
  claveCache,
  urlAppsScript
) {
  const texto =
    await descargarOrigen(urlAppsScript);

  const ahora = Date.now();

  const respuestaCache = new Response(
    texto,
    {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",

        /*
         * Mantiene la entrada disponible en Cache API por 24 h.
         * La frescura real la controlamos con X-Ceraceci-Cached-At.
         */
        "Cache-Control":
          "public, max-age=86400",

        "X-Ceraceci-Cached-At":
          String(ahora)
      }
    }
  );

  await cache.put(
    claveCache,
    respuestaCache.clone()
  );

  return respuestaCache;
}


export async function onRequestGet(context) {
  const {
    request,
    env
  } = context;

  const cache = caches.default;
  const claveCache =
    crearClaveCache(request);

  const urlAppsScript =
    obtenerURLAppsScript(env);

  const guardada =
    await cache.match(claveCache);

  if (guardada) {
    const edad =
      edadCacheMs(guardada);

    /* Copia fresca: respuesta inmediata. */
    if (edad <= FRESCO_DURANTE_MS) {
      return respuestaParaCliente(
        guardada,
        "HIT"
      );
    }

    /*
     * Copia vencida pero todavía utilizable:
     * la servimos YA y refrescamos en segundo plano.
     */
    if (edad <= RESPALDO_MAXIMO_MS) {
      context.waitUntil(
        actualizarCache(
          cache,
          claveCache,
          urlAppsScript
        ).catch((error) => {
          console.error(
            "No se pudo refrescar el catálogo en segundo plano:",
            error
          );
        })
      );

      return respuestaParaCliente(
        guardada,
        "STALE"
      );
    }
  }

  /*
   * Primer acceso real al edge, o una copia de más de 24 h.
   * Intentamos traer una versión nueva. Si falla y había una copia vieja,
   * la usamos igualmente como último recurso.
   */
  try {
    const nueva =
      await actualizarCache(
        cache,
        claveCache,
        urlAppsScript
      );

    return respuestaParaCliente(
      nueva,
      guardada ? "REFRESH" : "MISS"
    );
  } catch (error) {
    console.error(
      "No se pudo obtener el catálogo desde Apps Script:",
      error
    );

    if (guardada) {
      return respuestaParaCliente(
        guardada,
        "STALE-ERROR"
      );
    }

    return new Response(
      "ERROR: no se pudo obtener el catálogo en este momento.",
      {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
