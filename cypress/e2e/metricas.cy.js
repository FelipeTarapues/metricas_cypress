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

        // Comprobación previa de disponibilidad: si la página no responde,
        // registramos el error (campo status/error) y no intentamos la
        // auditoría de Lighthouse sobre una página caída.
        cy.request({ url: page.url, failOnStatusCode: false, timeout: 15000 }).then((response) => {
          if (response.status >= 400) {
            cy.task('recordError', {
              url: page.url,
              screenEmulation: device.name,
              message: `HTTP ${response.status} al intentar acceder a la página`,
            });
            return;
          }

          cy.visit(page.url, {
            headers: { 'user-agent': device.userAgent }
          });

          // Le enviamos el nombre del dispositivo a la tarea de Node configurada arriba
          cy.task('setDeviceName', device.name);

          const thresholds = {
            performance: 0,
            accessibility: 0,
            'best-practices': 0,
            seo: 0,
          };

          const lighthouseConfig = {
            formFactor: device.name.toLowerCase().includes('desktop') ? 'desktop' : 'mobile',
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