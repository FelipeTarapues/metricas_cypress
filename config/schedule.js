// frequency admite: "única" (se ejecuta una sola vez en startDate+time y se
// desactiva), "diaria" o "semanal" (todos los lunes). devices/pages deben
// usar los mismos identificadores de config/devices.json (campo "name") y
// config/pages.json (campo "id").

module.exports = [
  {
    jobId: "job-escritorio",
    enabled: true, // estado habilitado/deshabilitado
    startDate: "2026-10-30", // fecha de inicio
    time: "08:00", // hora
    timezone: "America/Bogota", // zona horaria
    frequency: "diaria", // frecuencia
    cronOverride: "*/2 * * * *", // TEMPORAL: cada 2 min, minutos pares (0,2,4...)
    devices: ["Desktop (1920x1080)"], // dispositivos
    pages: ["orquideas", "movilidad-local"] // páginas que se evaluarán
  },
  {
    jobId: "job-movil",
    enabled: true,
    startDate: "2026-10-30",
    time: "14:00",
    timezone: "America/Bogota",
    frequency: "diaria",
    cronOverride: "1-59/2 * * * *", // TEMPORAL: cada 2 min, minutos impares (1,3,5...)
    devices: ["Moto G (412x823)"],
    pages: ["orquideas", "movilidad-local"]
  }
];