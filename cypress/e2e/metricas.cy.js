const pages = require('../../config/pages.json');
const devices = require('../../config/devices.json');

describe('Automatización de Métricas Web UAM', () => {
  pages.forEach((page) => {
    devices.forEach((device) => {
      it(`Evaluar ${page.url} en perfil ${device.name}`, () => {
        
        cy.viewport(device.viewport.width, device.viewport.height);
        
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
      });
    });
  });
});