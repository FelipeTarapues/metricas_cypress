const { defineConfig } = require("cypress");
const { lighthouse, prepareAudit } = require("@cypress-audit/lighthouse");
const fs = require("fs");
const path = require("path");

let currentDeviceName = "Desconocido"; // Variable para rastrear el dispositivo actual

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
        
        // Ejecución de Lighthouse con callback para interceptar y extraer las métricas obligatorias
        lighthouse: lighthouse((lighthouseReport) => {
          const audits = lighthouseReport.lhr.audits;
          const categories = lighthouseReport.lhr.categories;

          const record = {
            url: lighthouseReport.lhr.requestedUrl, // Página evaluada
            screenEmulation: currentDeviceName, // Dispositivo y resolución
            timestamp: new Date().toISOString(), // Fecha y hora ISO 8601
            firstContentfulPaint: audits['first-contentful-paint'].numericValue, // Número en milisegundos
            largestContentfulPaint: audits['largest-contentful-paint'].numericValue, // Número en milisegundos
            speedIndex: audits['speed-index'].numericValue, // Número en milisegundos
            performance: Math.round(categories.performance.score * 100), // Puntuación 0 a 100
            status: "Éxito" // Estado estructurado
          };

          const dirPath = path.resolve(__dirname, 'cypress/fixtures');
          const filePath = path.join(dirPath, 'lighthouse-metrics.json');
          let data = [];
          
          if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
          if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (fileContent) data = JSON.parse(fileContent);
          }
          
          // Actualizar el JSON automáticamente y conservar el historial
          data.push(record);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        })
      });
    },
  },
});