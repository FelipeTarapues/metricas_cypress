const pages = require('../../config/pages.json');
const devices = require('../../config/devices.json');
const schedules = require('../../config/schedule.js');

// Si el scheduler nos pasa un jobId (--expose jobId=...; en Cypress 16+
// Cypress.env() ya no está disponible a nivel de módulo, se usa
// Cypress.expose() para leer valores síncronamente fuera de un it()), solo
// evaluamos las páginas/dispositivos que ese job tiene configurados. Esto
// evita duplicar la lógica principal: la lista de qué correr vive
// únicamente en config/schedule.js, nunca hardcodeada aquí.
const jobId = Cypress.expose('jobId');
const job = jobId ? schedules.find((j) => j.jobId === jobId) : null;

if (jobId && !job) {
  throw new Error(`No existe ningún job con jobId="${jobId}" en config/schedule.js`);
}

const pagesToRun = job ? pages.filter((p) => job.pages.includes(p.id)) : pages;
const devicesToRun = job ? devices.filter((d) => job.devices.includes(d.name)) : devices;

describe('Automatización de Métricas Web UAM', () => {
  pagesToRun.forEach((page) => {
    devicesToRun.forEach((device) => {
      it(`Evaluar ${page.url} en perfil ${device.name}`, () => {

        cy.viewport(device.viewport.width, device.viewport.height);

        // Tipo (Desktop/Mobile) y nombre del dispositivo sin paréntesis:
        // se separan en dos campos del registro (deviceType y device) en
        // vez del antiguo campo único "screenEmulation".
        const deviceType = device.name.toLowerCase().includes('desktop') ? 'Desktop' : 'Mobile';
        const deviceLabel = device.name.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();

        // Comprobación previa de disponibilidad: si la página no responde,
        // registramos el error (campo status/error) y no intentamos la
        // auditoría de Lighthouse sobre una página caída.
        cy.request({ url: page.url, failOnStatusCode: false, timeout: 15000 }).then((response) => {
          if (response.status >= 400) {
            cy.task('recordError', {
              url: page.url,
              deviceType,
              device: deviceLabel,
              message: `HTTP ${response.status} al intentar acceder a la página`,
            });
            return;
          }

          cy.visit(page.url, {
            headers: { 'user-agent': device.userAgent }
          });

          // Evidencia visual automatizada de cada prueba (pedida por la
          // profesora): una captura de pantalla por cada combinación
          // página x dispositivo, cuya ruta se guarda en el registro.
          const screenshotName = `${page.id}_${deviceType}_${Date.now()}`;
          cy.screenshot(screenshotName, { capture: 'fullPage', overwrite: true });

          // Le enviamos el dispositivo y la captura a la tarea de Node configurada arriba
          cy.task('setDeviceName', {
            type: deviceType,
            name: deviceLabel,
            screenshot: `cypress/screenshots/metricas.cy.js/${screenshotName}.png`,
          });

          const thresholds = {
            performance: 0,
            accessibility: 0,
            'best-practices': 0,
            seo: 0,
          };

          const lighthouseConfig = {
            formFactor: deviceType === 'Desktop' ? 'desktop' : 'mobile',
            screenEmulation: { disabled: true }
          };

          // Dispara la auditoría; la extracción y guardado se hacen de fondo en cypress.config.js
          cy.lighthouse(thresholds, lighthouseConfig);

          // cy.lighthouse no espera la sincronización con Google Sheets (ver
          // cypress.config.js), así que la esperamos aquí explícitamente
          // antes de pasar a la siguiente prueba.
          cy.task('flushSheetSync');
        });
      });
    });
  });
});