# Métricas Web UAM — Automatización con Cypress + Lighthouse

Proyecto de énfasis profesional: evalúa automáticamente el rendimiento de páginas
institucionales de la Universidad Autónoma de Manizales con Lighthouse,
organizado con Cypress, y presenta los resultados clasificados en un informe web.

## Integrantes y páginas asignadas

| Integrante | Página evaluada | id en `config/pages.json` |
|---|---|---|
| Andres Montoya Ocampo | https://www.autonoma.edu.co/conoce-la-uam/orquideas | `orquideas` |
| Felipe Alejandro Tarapues | https://www.autonoma.edu.co/internacionalizacion/movilidad-local-y-nacional-e-internacional#movilidad-local | `movilidad-local` |

> **Nota sobre el alcance**: el enunciado pide grupos de **tres** estudiantes
> y **mínimo tres** URL distintas; este equipo es de dos personas con dos
> URL. Confirmen con el profesor que ese ajuste de alcance está aceptado
> antes de la entrega — el criterio de aceptación del enunciado dice
> explícitamente "al menos tres páginas".

## 1. Instalación

```bash
npm install
```

Requiere Node.js y Google Chrome instalado (el scheduler fuerza `--browser chrome`).

## 2. Ejecución manual

Abrir el runner interactivo de Cypress:

```bash
npx cypress open
```

O correr todas las páginas × todos los dispositivos en modo headless:

```bash
npx cypress run --browser chrome
```

Para correr solo las páginas/dispositivos de un job específico (igual que lo haría
el scheduler), usa su `jobId` (ver `config/schedule.js`):

```bash
npx cypress run --browser chrome --expose jobId=job-escritorio
npx cypress run --browser chrome --expose jobId=job-movil
```

> Nota: este proyecto usa Cypress 16, donde `Cypress.env()` ya no está
> disponible fuera de un `it()` (se eliminó esa forma de uso). Para leer un
> valor síncronamente al cargar el spec —como el `jobId`— se usa el flag
> `--expose`/`-x` y `Cypress.expose()` en vez de `--env`/`Cypress.env()`.

Cada corrida actualiza automáticamente `cypress/fixtures/lighthouse-metrics.json`,
conservando el historial completo de ejecuciones (nunca se sobrescribe, solo se
agrega).

## 3. Ejecución programada (scheduler)

```bash
node scheduler.js
```

El scheduler lee `config/schedule.js` y dispara `cypress run` en el horario,
frecuencia y zona horaria configurados para cada job, pasando el `jobId`
correspondiente para que solo se evalúen sus páginas/dispositivos.

**Este proceso debe permanecer vivo** para que las ejecuciones programadas
ocurran. Opciones para mantenerlo activo:

- **Terminal dedicada**: dejar `node scheduler.js` corriendo en una terminal que
  no se cierre (sirve para pruebas/demo, no para producción).
- **pm2** (recomendado para dejarlo corriendo en segundo plano en una máquina
  propia):
  ```bash
  npm install -g pm2
  pm2 start scheduler.js --name metricas-uam
  pm2 save
  ```
- **GitHub Actions** (alternativa sin mantener un proceso propio encendido):
  crear un workflow con `on: schedule` usando cron. Importante: **GitHub
  Actions interpreta el cron en UTC**, así que hay que restar 5 horas a la hora
  de Bogotá (`America/Bogota` = UTC-5) al definir la expresión cron, y
  considerar que las ejecuciones programadas de Actions pueden retrasarse
  varios minutos en horas pico.

### Frecuencias soportadas en `config/schedule.js`

- `"única"`: se ejecuta una sola vez en `startDate` + `time` y luego se
  desactiva automáticamente.
- `"diaria"`: se ejecuta todos los días a `time`.
- `"semanal"`: se ejecuta todos los lunes a `time`.

El campo `startDate` se respeta: si el scheduler arranca antes de esa fecha,
el job se omite (se loguea) hasta alcanzarla.

## 4. Configuración (agregar páginas o dispositivos)

Toda la configuración vive en `config/`, sin tocar la lógica de las pruebas:

- **`config/pages.json`**: array de páginas (`id`, `url`, `owner`). Agregar una
  página nueva es solo agregar un objeto aquí.
- **`config/devices.json`**: array de perfiles de dispositivo (`name`,
  `userAgent`, `viewport`). Agregar un dispositivo nuevo es solo agregar un
  objeto aquí.
- **`config/schedule.js`**: jobs programados. Cada job referencia páginas por
  `id` y dispositivos por `name`, así que agregar una página/dispositivo a un
  job existente es solo editar esos arrays.
- **`config/thresholds.json`**: umbrales de clasificación (Bueno / Por mejorar
  / Deficiente) para `fcp`, `lcp`, `speedIndex` y `performance`. Es el único
  lugar donde se definen estos límites; tanto el informe web como cualquier
  lógica futura deben leer de aquí.

`cypress/e2e/metricas.cy.js` recorre estos archivos con `forEach`, así que
nunca hay que duplicar la lógica de las pruebas al agregar una URL o un
dispositivo.

## 5. Manejo de errores

Antes de auditar con Lighthouse, la prueba hace una petición HTTP de
verificación (`cy.request` con `failOnStatusCode: false`). Si la página
responde con un error (4xx/5xx), se registra un entry en el JSON con
`status: "Error: ..."` y métricas en `null`, sin intentar la auditoría.

**Limitación conocida**: fallas de red a nivel de conexión (DNS, timeout de
conexión, Chrome caído) no quedan capturadas como un registro "Error" en el
JSON — Cypress marca la prueba como fallida y eso queda visible en la salida
de `cypress run` / en el reporte del runner, pero no se agrega una fila al
historial. Es un caso de borde aceptado por alcance del proyecto.

## 6. Informe web

```bash
npx http-server .
```

y abrir `http://localhost:8080/index.html`. **No abrir el archivo con doble
clic** (`file://`): el `fetch()` a los JSON falla por CORS.

El informe muestra:
- Mejor y peor rendimiento registrado.
- Comparación Desktop vs. Móvil (última medición por página).
- Historial completo de ejecuciones, con clasificación (Bueno / Por mejorar /
  Deficiente) por **etiqueta y color** para FCP, LCP, Speed Index y
  Performance, y las filas con error resaltadas aparte.

## 7. Google Sheets — YA CONFIGURADO ✅

El enunciado pide evidencia de que el informe se refleje también en una hoja
de cálculo cada vez que corre un job. Está implementado y **probado en
vivo** (ver `config/googleSheets.js`, invocado automáticamente desde
`cypress.config.js` en cada registro).

**Decisión técnica**: no usamos Google Cloud + service account (el camino
"típico"), porque la cuenta institucional del equipo
(`andres.montoyao@autonoma.edu.co`) tiene bloqueada la creación de
proyectos de Google Cloud (`resourcemanager.projects.create` denegado —
restricción común en cuentas de Google Workspace educativas). En su lugar
usamos **Google Apps Script** vinculado directamente a la hoja: no necesita
proyecto de GCP ni credenciales descargables, solo la cuenta de Google del
equipo.

**Cómo funciona**:
- Hoja: https://docs.google.com/spreadsheets/d/1ao1avZAVBE3OQ_ktaGeMJlvsDhywbGmP6JR4i4YeS4s/edit
  (pestaña `Metricas`, con encabezados ya creados).
- Dentro de esa hoja hay un proyecto de Apps Script ("Metricas UAM - Sheets
  Bridge") con una función `doPost(e)` que recibe un POST con
  `{ token, record }`, valida el token y agrega una fila.
- Publicado como aplicación web (`Implementar > Gestionar implementaciones`)
  con acceso "Cualquier usuario" — protegido por un token compartido que el
  propio script valida (sin el token exacto, el script responde
  `{ok:false}` y no escribe nada).

**Variables de entorno necesarias** (quien corra Cypress o el scheduler
debe definirlas en su máquina; no están en el repo por seguridad):
```bash
export GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbwX1JnqGHrtZjonHmd5OYLu1gmL10XFEhmaYb-IjSp0MtbnAwNN7hlG7hwqOzZt3DtL/exec"
export GOOGLE_APPS_SCRIPT_TOKEN="357d56f36e465ab947d4266e5718d8f25b0234f81516a420"
```
> El token está aquí en texto plano porque es el token del proyecto de la
> UAM del propio equipo — compártanlo solo entre ustedes dos, no lo
> publiquen en un repo público sin pensarlo. Si prefieren rotarlo: entren
> al editor de Apps Script, cambien el valor de `TOKEN` en el código,
> vuelvan a implementar (crear una **nueva versión** en "Gestionar
> implementaciones"), y actualicen `GOOGLE_APPS_SCRIPT_TOKEN` aquí.

Sin esas dos variables definidas, la integración es un no-op seguro: el
resto del flujo (JSON local + informe web) sigue funcionando igual. Si
están definidas pero algo falla, el error se loguea en consola sin
detener la ejecución de Cypress.

Si el equipo quisiera reproducir esto desde cero (por ejemplo si rotan el
proyecto a otra hoja), los pasos son: Extensiones → Apps Script en la hoja
nueva, pegar el código de `doPost` (está en el historial del proyecto /
pueden pedírselo a Andres), Implementar → Aplicación web → Ejecutar como
"Yo" → Quién tiene acceso "Cualquier usuario".

> Si corren el scheduler con `node scheduler.js` en segundo plano (pm2,
> systemd, etc.), esas variables de entorno deben estar definidas en el
> entorno donde corre ese proceso, no solo en la terminal interactiva.

## 8. Análisis y recomendaciones

> TODO (completar tras correr el proyecto con las 3 páginas reales en ambos
> dispositivos):
> - ¿Cuál página tuvo mejor y cuál peor rendimiento, y en qué dispositivo?
> - ¿Qué diferencias sistemáticas se observan entre escritorio y móvil?
> - Recomendaciones concretas de mejora (p. ej. optimización de imágenes,
>   reducir JS bloqueante, mejorar el LCP, etc.) para las páginas peor
>   evaluadas.

## Pendientes antes de la entrega

- [ ] Confirmar con el profesor que un equipo de 2 con 2 URL es aceptable
  (el enunciado pide 3 y 3).
- [ ] Configurar Google Sheets (sección 7) con credenciales reales.
- [ ] Ejecutar el proyecto completo (manual y programado) y dejar evidencia
  (capturas o logs) de ambos jobs corriendo de forma independiente.
- [ ] Completar la sección de análisis y recomendaciones (sección 8).
- [ ] Verificar que los tres integrantes tengan commits propios en el
  repositorio remoto.
