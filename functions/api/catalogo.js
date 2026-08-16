/*
  CERACECI - Cloudflare Pages Function
  Ruta pública: /api/catalogo

  El navegador del cliente ya NO consulta Google Apps Script.
  Cloudflare hace la consulta desde su servidor y devuelve el CSV.
*/

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw41VkFr-ElTG1gXqh-CZzEv0VTFP3qjVwWX0MSmwyXDbDBp79wdQJx_10yf6vj5FYW9w/exec";

export async function onRequestGet() {
  try {
    const separador =
      APPS_SCRIPT_URL.includes("?")
        ? "&"
        : "?";

    const respuesta = await fetch(
      APPS_SCRIPT_URL +
      separador +
      "_=" +
      Date.now(),
      {
        redirect: "follow",
        headers: {
          "Accept": "text/plain,*/*"
        }
      }
    );

    if (!respuesta.ok) {
      return new Response(
        "ERROR: Google Apps Script respondió HTTP " +
        respuesta.status,
        {
          status: 502,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate"
          }
        }
      );
    }

    const texto = await respuesta.text();

    return new Response(
      texto,
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Content-Type-Options": "nosniff"
        }
      }
    );

  } catch (error) {
    return new Response(
      "ERROR: " +
      (
        error && error.message
          ? error.message
          : String(error)
      ),
      {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      }
    );
  }
}
