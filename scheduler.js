const cron = require('node-cron');
const { exec } = require('child_process');
const schedules = require('./config/schedule.js');

console.log("Iniciando Scheduler de Métricas Web UAM...");

schedules.forEach(job => {
  if (!job.enabled) return;

  // Convierte la hora "HH:MM" a formato cron
  const [hour, minute] = job.time.split(':');
  let cronExpression = `${minute} ${hour} * * *`; // Frecuencia diaria por defecto

  if (job.frequency === 'semanal') {
    cronExpression = `${minute} ${hour} * * 1`; // Lunes
  }

  console.log(`Job [${job.jobId}] programado a las ${job.time} (${job.timezone})`);

  cron.schedule(cronExpression, () => {
    console.log(`\n--- Ejecutando ${job.jobId} a las ${new Date().toLocaleString()} ---`);
    
    // Dispara el proceso de Cypress forzando el navegador Chrome
    const cypressProcess = exec('npx cypress run --browser chrome');

    cypressProcess.stdout.on('data', (data) => console.log(data));
    cypressProcess.stderr.on('data', (data) => console.error(data));
    
    cypressProcess.on('close', (code) => {
      console.log(`Pruebas finalizadas con código ${code}`);
      // Aquí más adelante llamaremos a la API de Google Sheets
    });

  }, {
    scheduled: true,
    timezone: job.timezone // America/Bogota
  });
});