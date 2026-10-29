// Sincroniza cada registro con una hoja de cálculo de Google Sheets
// (requisito del enunciado: "Evidencia actualización del informe visual en
// spreadsheet cada que el job se ejecute").
//
// Implementado vía Google Apps Script (no vía Google Cloud / service
// account): cuentas de Google Workspace institucionales suelen restringir
// la creación de proyectos de Google Cloud y service accounts para
// estudiantes, pero Apps Script vinculado a la propia hoja sí funciona sin
// ese permiso. El script vive en la hoja misma y se publica como una URL
// web que recibe un POST por cada registro.
//
// Activación (ver README.md, sección 7, para el detalle paso a paso):
//   1. En la hoja: Extensiones > Apps Script, pegar el código de doPost()
//      documentado en el README, y en "Nueva implementación" elegir
//      "Aplicación web" con acceso "Cualquier usuario" (protegido por un
//      token compartido que el propio script valida).
//   2. Definir las variables de entorno:
//        GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXX/exec
//        GOOGLE_APPS_SCRIPT_TOKEN=<el mismo token que pusiste en el script>
//
// Mientras esas variables no estén definidas, esta función no hace nada
// (no-op seguro): el resto del flujo (JSON local + informe web) sigue
// funcionando igual sin Google Sheets configurado.
async function syncRecordToSheet(record) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;

  if (!url || !token) {
    return; // Integración no configurada todavía: no-op intencional.
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, record }),
    redirect: "follow",
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no-JSON de Apps Script (status ${response.status}): ${text.slice(0, 200)}`);
  }

  if (!parsed.ok) {
    throw new Error(`Apps Script devolvió error: ${parsed.error}`);
  }
}

module.exports = { syncRecordToSheet };
