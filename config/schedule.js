module.exports = [
  {
    jobId: "job-escritorio",
    enabled: true, // estado habilitado/deshabilitado
    startDate: "2026-10-30", // fecha de inicio
    time: "08:00", // hora
    timezone: "America/Bogota", // zona horaria
    frequency: "diaria", // frecuencia
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
    devices: ["Moto G (412x823)"],
    pages: ["orquideas", "movilidad-local"]
  }
];