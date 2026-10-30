const cron = require('node-cron');
const { exec } = require('child_process');
const schedules = require('./config/schedule.js');

console.log("Iniciando Scheduler de Métricas Web UAM...");
console.log("Este proceso debe permanecer activo (ver README para alternativas: pm2, servicio en segundo plano, o GitHub Actions).");

// Ejecuta Cypress solo para las páginas/dispositivos de ESE job (jobId),
// filtrados dentro de cypress/e2e/metricas.cy.js a partir de config/schedule.js.
// La sincronización con Google Sheets, si está configurada, ocurre dentro de
// cypress.config.js en cada registro (ver config/googleSheets.js).
function runJob(job) {
  console.log(`\n--- Ejecutando ${job.jobId} a las ${new Date().toLocaleString()} ---`);

  const cypressProcess = exec(`npx cypress run --browser chrome --expose jobId=${job.jobId}`);

  cypressProcess.stdout.on('data', (data) => console.log(data.toString()));
  cypressProcess.stderr.on('data', (data) => console.error(data.toString()));

  cypressProcess.on('close', (code) => {
    console.log(`Job [${job.jobId}] finalizado con código ${code}`);
  });
}

schedules.forEach(job => {
  if (!job.enabled) return;

  // Convierte la hora "HH:MM" a formato cron
  const [hour, minute] = job.time.split(':');
  const startDate = new Date(`${job.startDate}T${job.time}:00`);

  // La fecha de inicio (startDate) se respeta comprobándola en cada disparo:
  // si todavía no se alcanza, el job se omite silenciosamente (se loguea).
  const runIfStarted = () => {
    if (new Date() < startDate) {
      console.log(`Job [${job.jobId}] aún no alcanza su fecha de inicio (${job.startDate}); se omite esta ejecución.`);
      return;
    }
    runJob(job);
  };

  if (job.frequency === 'única') {
    // node-cron no tiene un modo "una sola vez" nativo: programamos la
    // expresión exacta del día/mes/hora y detenemos la tarea apenas se
    // ejecuta una vez, para que no se repita el próximo año.
    const day = startDate.getDate();
    const month = startDate.getMonth() + 1; // getMonth() es 0-indexado
    const cronExpression = `${minute} ${hour} ${day} ${month} *`;

    console.log(`Job [${job.jobId}] programado una única vez para ${job.startDate} ${job.time} (${job.timezone})`);

    const task = cron.schedule(cronExpression, () => {
      runJob(job);
      task.stop();
      console.log(`Job [${job.jobId}] (única) ejecutado y desactivado.`);
    }, {
      scheduled: true,
      timezone: job.timezone,
    });

    if (new Date() > startDate) {
      console.log(`Job [${job.jobId}]: la fecha/hora programada ya pasó; se ejecuta inmediatamente.`);
      runJob(job);
      task.stop();
    }
    return;
  }

  let cronExpression = `${minute} ${hour} * * *`; // Frecuencia diaria por defecto
  if (job.frequency === 'semanal') {
    cronExpression = `${minute} ${hour} * * 1`; // Lunes
  }

  console.log(`Job [${job.jobId}] programado a las ${job.time} (${job.timezone}), frecuencia: ${job.frequency}`);

  cron.schedule(cronExpression, runIfStarted, {
    scheduled: true,
    timezone: job.timezone // America/Bogota
  });
});
