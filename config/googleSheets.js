
async function syncRecordToSheet(record) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN;

  if (!url || !token) {
    return; // Integración no configurada todavía: no-op intencional.
  }

  // La hoja no entiende el timestamp ISO (ej. "2026-10-30T05:54:37.160Z")
  // como fecha, lo muestra como texto crudo. Se envía reformateado a
  // "AAAA-MM-DD HH:mm:ss" en hora de Bogotá, que Sheets sí reconoce como
  // fecha/hora real (y se puede formatear después desde Formato > Número).
  // El JSON local y el informe web siguen usando el timestamp ISO original.
  const recordParaSheet = {
    ...record,
    timestamp: new Date(record.timestamp).toLocaleString("sv-SE", { timeZone: "America/Bogota" }),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, record: recordParaSheet }),
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
