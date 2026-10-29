const { defineConfig } = require("cypress");
const { lighthouse, prepareAudit } = require("@cypress-audit/lighthouse");
const fs = require("fs");
const path = require("path");
const { syncRecordToSheet } = require("./config/googleSheets");

let currentDeviceName = "Desconocido"; // Variable para rastrear el dispositivo actual

const dirPath = path.resolve(__dirname, 'cypress/fixtures');
const filePath = path.join(dirPath, 'lighthouse-metrics.json');

// La librería @cypress-audit/lighthouse llama a nuestro callback de forma
// síncrona y descarta lo que devuelva: no hay manera de que Cypress espere
// ahí una promesa. Por eso la sincronización con Sheets se encola aquí y se
// espera explícitamente con la tarea flushSheetSync (ver metricas.cy.js),
// para que el proceso de Node no termine con una petición a medias.
let pendingSheetSyncs = [];

// Único punto de escritura del JSON: guarda el registro, conserva el historial
// y encola (si está configurada) la sincronización con la hoja de cálculo.
function appendRecord(record) {
  let data = [];

  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    if (fileContent) data = JSON.parse(fileContent);
  }

  data.push(record);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  pendingSheetSyncs.push(
    syncRecordToSheet(record).catch((err) => {
      console.error(`No se pudo sincronizar el registro con Google Sheets: ${err.message}`);
    })
  );

  return null;
}

function flushSheetSyncs() {
  const pending = pendingSheetSyncs;
  pendingSheetSyncs = [];
  return Promise.all(pending).then(() => null);
}

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser = {}, launchOptions) => {
        prepareAudit(launchOptions);
      });

      on("task", {
        // Tarea para recibir el nombre del dispositivo desde la prueba Cypress
        setDeviceName(deviceName) {
          currentDeviceName = deviceName;
          return null;
        },

        // Tarea para registrar una evaluación que no pudo completarse
        // (página inaccesible, timeout, etc.), según el flujo de trabajo del enunciado.
        recordError({ url, screenEmulation, message }) {
          appendRecord({
            url,
            screenEmulation,
            timestamp: new Date().toISOString(),
            firstContentfulPaint: null,
            largestContentfulPaint: null,
            speedIndex: null,
            performance: null,
            status: `Error: ${message}`,
          });
          return flushSheetSyncs();
        },

        // Cypress SÍ espera una promesa devuelta por una tarea propia (a
        // diferencia del callback de cy.lighthouse); se llama después de
        // cy.lighthouse() para garantizar que la sincronización con Sheets
        // termine antes de pasar a la siguiente prueba o cerrar el proceso.
        flushSheetSync() {
          return flushSheetSyncs();
        },

        // Ejecución de Lighthouse con callback para interceptar y extraer las métricas obligatorias
        lighthouse: lighthouse((lighthouseReport) => {
          const audits = lighthouseReport.lhr.audits;
          const categories = lighthouseReport.lhr.categories;

          return appendRecord({
            url: lighthouseReport.lhr.requestedUrl, // Página evaluada
            screenEmulation: currentDeviceName, // Dispositivo y resolución
            timestamp: new Date().toISOString(), // Fecha y hora ISO 8601
            firstContentfulPaint: audits['first-contentful-paint'].numericValue, // Número en milisegundos
            largestContentfulPaint: audits['largest-contentful-paint'].numericValue, // Número en milisegundos
            speedIndex: audits['speed-index'].numericValue, // Número en milisegundos
            performance: Math.round(categories.performance.score * 100), // Puntuación 0 a 100
            status: "Éxito" // Estado estructurado
          });
        })
      });
    },
  },
});