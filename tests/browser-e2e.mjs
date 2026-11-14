// Integración real: navegador → Next.js → Express existente → PostgreSQL efímero.
// No compila, modifica ni carga fixtures en el backend o la base del proyecto.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const backend = resolve(process.env.MANADALAB_BACKEND_DIR || resolve(root, "../backend"));
const requireBackend = createRequire(resolve(backend, "package.json"));
const name = `manadalab_front_e2e_${randomBytes(5).toString("hex")}`;
const password = randomBytes(24).toString("hex");
const origin = "http://127.0.0.1:3000";
const apiPort = Number(process.env.MANADALAB_E2E_API_PORT || 4000);
let apiServer, nextServer, prisma, browser;
let container = false;
const checks = [];
let page;
function command(program, args, options = {}) {
  const result = spawnSync(program, args, { encoding: "utf8", timeout: 60000, ...options });
  if (result.status !== 0) throw new Error(`${program} ${args.slice(0,3).join(" ")}: ${result.stderr || result.stdout || result.error}`);
  return result.stdout.trim();
}
async function waitUntil(fn, description) {
  for (let n = 0; n < 120; n++) { try { if (await fn()) return; } catch { /* Esperar disponibilidad. */ } await new Promise(r => setTimeout(r, 250)); }
  throw new Error(`Tiempo agotado: ${description}`);
}
async function check(label, fn) { await fn(); checks.push(label); console.log(`OK · ${label}`); }
async function login(email) {
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Paginación" }).or(page.getByRole("heading", { name: "Cada reporte cuenta." })).or(page.getByRole("heading", { name: "Registrar entrega", exact: true }))).toBeVisible();
}
try {
  // Puertos reservados por este ensayo. Fallar antes de crear recursos si están ocupados.
  for (const port of [3000,apiPort]) {
    const { createServer } = await import("node:net");
    const probe = createServer();
    await new Promise((res, rej) => { probe.once("error", rej); probe.listen(port, "127.0.0.1", res); });
    await new Promise(res => probe.close(res));
  }
  command("docker", ["run", "--rm", "-d", "--name", name, "-e", "POSTGRES_USER=frontend_test", "-e", `POSTGRES_PASSWORD=${password}`, "-e", "POSTGRES_DB=frontend_e2e", "-p", "127.0.0.1::5432", "postgres:17"]);
  container = true;
  const port = command("docker", ["port", name, "5432/tcp"]).split(":").pop();
  const databaseUrl = `postgresql://frontend_test:${password}@127.0.0.1:${port}/frontend_e2e`;
  assert.equal(new URL(databaseUrl).pathname, "/frontend_e2e");
  Object.assign(process.env, { DATABASE_URL: databaseUrl, NODE_ENV: "test", APP_ORIGIN: origin, JWT_SECRET: randomBytes(32).toString("hex"), MATRICULA_KEY: randomBytes(32).toString("hex"), IDEMPOTENCY_SECRET: randomBytes(32).toString("hex") });
  delete process.env.DATABASE_HOST;
  const { Pool } = requireBackend("pg");
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 1000 });
  await waitUntil(async () => { await pool.query("SELECT 1"); return true; }, "PostgreSQL de pruebas");
  await pool.end();
  command(process.execPath, [requireBackend.resolve("prisma/build/index.js"), "migrate", "deploy", "--config", "prisma7.config.ts"], { cwd: backend, env: process.env });
  prisma = requireBackend("./dist/config/prisma.js").prisma;
  const app = requireBackend("./dist/app.js").default;
  const { limiteGeneral } = requireBackend("./dist/middlewares/seguridad.middleware.js");
  const argon2 = requireBackend("argon2");
  const ema = await prisma.ema.create({ data: { nombre: "EMA de ensayo A" } });
  const foreign = await prisma.ema.create({ data: { nombre: "EMA de ensayo B" } });
  const room = await prisma.aula.create({ data: { numero: "101", emaId: ema.id } });
  await prisma.aula.create({ data: { numero: "102", emaId: ema.id } });
  const foreignRoom = await prisma.aula.create({ data: { numero: "201", emaId: foreign.id } });
  const pc = await prisma.tipoDispositivo.create({ data: { nombre: "Computadora" } });
  const tv = await prisma.tipoDispositivo.create({ data: { nombre: "TV" } });
  const antenna = await prisma.tipoDispositivo.create({ data: { nombre: "Antena Wi-Fi", esPrestable: true } });
  const devices = [];
  for (let i = 1; i <= 105; i++) {
    const d = await prisma.dispositivo.create({ data: { clave: `PC-${String(i).padStart(3,"0")}`, tipoId: pc.id, emaId: ema.id, aulaId: room.id } });
    devices.push(d);
    if (i > 1) await prisma.incidencia.create({ data: { dispositivoId: d.id, descripcion: "Descripción privada de prueba", matriculaCifrada: "fixture-sin-datos-personales", historial: { create: { estadoNuevo: "PENDIENTE" } } } });
  }
  const tvDevice = await prisma.dispositivo.create({ data: { clave: "TV-01", tipoId: tv.id, emaId: ema.id, aulaId: room.id } });
  const raceDevice = await prisma.dispositivo.create({ data: { clave: "TV-02", tipoId: tv.id, emaId: ema.id, aulaId: room.id } });
  const tvReport = await prisma.incidencia.create({ data: { dispositivoId: tvDevice.id, descripcion: "La televisión no muestra imagen", matriculaCifrada: "fixture", historial: { create: { estadoNuevo: "PENDIENTE" } } } });
  const foreignPc = await prisma.dispositivo.create({ data: { clave: "PC-EXTERNA", tipoId: pc.id, emaId: foreign.id, aulaId: foreignRoom.id } });
  const foreignReport = await prisma.incidencia.create({ data: { dispositivoId: foreignPc.id, descripcion: "Computadora de otro EMA", matriculaCifrada: "fixture", historial: { create: { estadoNuevo: "PENDIENTE" } } } });
  for (const clave of ["WIFI-01", "WIFI-02"]) await prisma.dispositivo.create({ data: { clave, tipoId: antenna.id, emaId: ema.id } });
  const hash = await argon2.hash(password);
  const admin = await prisma.usuario.create({ data: { nombre: "Administradora de ensayo", correo: "admin@example.test", emaId: ema.id, contrasenaHash: hash } });
  const technician = await prisma.usuario.create({ data: { nombre: "Técnico de ensayo", correo: "tecnico@example.test", emaId: ema.id, esTecnico: true, contrasenaHash: hash } });
  apiServer = app.listen(apiPort, "127.0.0.1");
  await new Promise((res, rej) => { apiServer.once("listening", res); apiServer.once("error", rej); });
  let nextOutput = "";
  nextServer = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", "3000"], { cwd: root, env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] });
  nextServer.stdout.on("data", d => nextOutput += d);
  nextServer.stderr.on("data", d => nextOutput += d);
  await waitUntil(async () => { if (nextServer.exitCode !== null) throw new Error(nextOutput); const r = await fetch(origin); return r.ok; }, "Next.js de pruebas");
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await mkdir(resolve(root, "test-results"), { recursive: true });
  await check("Bienvenida, navegación pública y ausencia de registro", async () => {
    await page.goto(origin);
    await expect(page.getByRole("heading", { name: /Un mejor espacio/ })).toBeVisible();
    assert.equal((await page.request.get(`${origin}/registro`)).status(), 404);
    await page.screenshot({ path: resolve(root, "test-results/inicio-desktop.png"), fullPage: true });
  });
  await check("Inventario paginado completo, aula vacía y reporte activo", async () => {
    await page.goto(`${origin}/reportar`);
    await page.getByLabel("¿En qué aula estás?").selectOption(String(room.id));
    await expect(page.getByRole("button", { name: /PC-105/ })).toBeVisible();
    await page.getByRole("button", { name: /PC-003/ }).click();
    await expect(page.getByText("Este dispositivo ya tiene un reporte activo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });
  await check("Alta real, pérdida de respuesta, recarga e idempotencia", async () => {
    await page.getByRole("button", { name: /PC-001/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Matrícula", { exact: true }).fill("20260001");
    await page.getByLabel("Describe el problema").fill("El monitor no enciende durante la clase.");
    let key;
    await page.route("**/api/incidencias", async route => {
      if (route.request().method() !== "POST") return route.continue();
      key = route.request().headers()["idempotency-key"];
      await route.fetch(); await route.abort("failed");
    });
    await page.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(page.getByRole("button", { name: "Reintentar el mismo envío" })).toBeVisible();
    await page.unroute("**/api/incidencias");
    await page.reload();
    await expect(page.getByLabel("Matrícula", { exact: true })).toHaveValue("20260001");
    await expect(page.getByLabel("Describe el problema")).toHaveAttribute("readonly", "");
    const request = page.waitForRequest(r => r.url().endsWith("/api/incidencias") && r.method() === "POST");
    await page.getByRole("button", { name: "Reintentar el mismo envío" }).click();
    assert.equal((await request).headers()["idempotency-key"], key);
    await expect(page.getByRole("heading", { name: "Reporte registrado" })).toBeVisible();
    assert.equal(await prisma.incidencia.count({ where: { dispositivoId: devices[0].id } }), 1);
    assert.equal(await prisma.historialIncidencia.count({ where: { incidencia: { dispositivoId: devices[0].id } } }), 1);
    const report = await prisma.incidencia.findFirstOrThrow({ where: { dispositivoId: devices[0].id } });
    await page.goto(`${origin}/seguimiento?folio=${report.folio}`);
    await expect(page.getByText("Información del reporte")).toBeVisible();
    await expect(page.getByText("El monitor no enciende durante la clase.")).toHaveCount(0);
  });
  await check("Consulta pública de aulas, ceros y privacidad", async () => {
    await page.goto(`${origin}/aulas`);
    await expect(page.getByRole("heading", { name: "Aula 102" })).toBeVisible();
    await page.getByRole("link", { name: /Aula 102/ }).click();
    await expect(page.getByRole("heading", { name: "No hay dispositivos registrados" })).toBeVisible();
  });
  await check("Carrera de alta: 409 con folio existente y refresco público", async () => {
    await page.goto(`${origin}/reportar`);
    await page.getByLabel("¿En qué aula estás?").selectOption(String(room.id));
    await page.getByRole("button", { name: "Más dispositivos", exact: true }).click();
    await page.getByRole("button", { name: /TV-02/ }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Más dispositivos", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /TV-02/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Matrícula", { exact: true }).fill("20260002");
    await page.getByLabel("Describe el problema").fill("La televisión no tiene sonido.");
    const response = await fetch(`${origin}/api/incidencias`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "Idempotency-Key": randomUUID() }, body: JSON.stringify({ dispositivoId: raceDevice.id, matricula: "20260003", descripcion: "Reporte simultáneo desde otra persona" }) });
    assert.equal(response.status, 201);
    const created = await response.json();
    await page.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(page.getByText("El dispositivo ya tenía un reporte activo.", { exact: false })).toBeVisible();
    assert.equal(new URL(page.url()).searchParams.get("folio"), created.incidencia.folio);
    assert.equal(await prisma.incidencia.count({ where: { dispositivoId: raceDevice.id } }), 1);
    await prisma.incidencia.update({ where: { id: created.incidencia.id }, data: { estado: "VISTO", version: 2 } });
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    // Si la consulta inicial sigue en vuelo, el siguiente refresco visible ocurre a los 15 s.
    await expect(page.locator("section.panel .pill").first()).toHaveText("Visto", { timeout: 20000 });
  });
  await check("Acceso incorrecto recuperable y administración real", async () => {
    await page.goto(`${origin}/admin/incidencias`);
    await page.getByLabel("Correo electrónico").fill(admin.correo);
    await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Correo o contraseña incorrectos" })).toBeVisible();
    await login(admin.correo);
    await expect(page.getByRole("navigation", { name: "Paginación" })).toContainText("107 registros");
    await page.getByRole("textbox", { name: "Buscar por folio o dispositivo" }).fill("PC-105");
    await expect(page.getByRole("table")).toContainText("PC-105");
    await expect(page.getByRole("navigation", { name: "Paginación" })).toContainText("1 registros");
  });
  await check("Permisos de computadora y conflicto de versión real", async () => {
    const pcReport = await prisma.incidencia.findFirstOrThrow({ where: { dispositivoId: devices[0].id } });
    await page.goto(`${origin}/admin/incidencias/${pcReport.folio}`);
    await expect(page.getByText("Solo el personal con permiso técnico puede cambiar el estado de computadoras.")).toBeVisible();
    await page.goto(`${origin}/admin/incidencias/${tvReport.folio}`);
    await expect(page.getByRole("button", { name: "Marcar como visto" })).toBeVisible();
    await prisma.incidencia.update({ where: { id: tvReport.id }, data: { estado: "VISTO", version: 2, historial: { create: { estadoAnterior: "PENDIENTE", estadoNuevo: "VISTO", usuarioId: admin.id } } } });
    await page.getByRole("button", { name: "Marcar como visto" }).click();
    await expect(page.getByText("Cargamos la información actual.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Marcar como solucionado" }).click();
    await expect(page.getByText("Reporte solucionado. No admite más cambios.")).toBeVisible();
    assert.equal((await prisma.incidencia.findUniqueOrThrow({ where: { id: tvReport.id } })).estado, "SOLUCIONADO");
  });
  await check("Éxito incompleto de reporte: borrador y clave conservados hasta confirmar", async () => {
    const unit = await prisma.dispositivo.create({ data: { clave: "TV-RESPUESTA-INVALIDA", tipoId: tv.id, emaId: ema.id, aulaId: room.id } });
    await page.goto(`${origin}/reportar`);
    await page.getByLabel("¿En qué aula estás?").selectOption(String(room.id));
    await page.getByRole("button", { name: "Más dispositivos", exact: true }).click();
    await page.getByRole("button", { name: /TV-RESPUESTA-INVALIDA/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Matrícula", { exact: true }).fill("20260004");
    await page.getByLabel("Describe el problema").fill("Reporte con respuesta incompleta de ensayo.");
    let key;
    for (const body of [{}, { incidencia: {} }, { incidencia: { folio: "invalido" } }]) {
      await page.route("**/api/incidencias", async route => {
        if (route.request().method() !== "POST") return route.continue();
        const requestKey = route.request().headers()["idempotency-key"];
        if (key) assert.equal(requestKey, key); else key = requestKey;
        const response = await route.fetch();
        assert.equal(response.status(), 201);
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(body) });
      });
      await page.getByRole("button", { name: /^(Enviar reporte|Reintentar el mismo envío)$/ }).click();
      await expect(page.getByRole("button", { name: "Reintentar el mismo envío" })).toBeVisible();
      const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem("manadalab.reportDraft.v2")));
      assert.equal(draft.intencion.key, key);
      assert.equal(draft.intencion.body.dispositivoId, unit.id);
      await page.unroute("**/api/incidencias");
      await page.reload();
      await expect(page.getByLabel("Matrícula", { exact: true })).toHaveValue("20260004");
      await expect(page.getByLabel("Describe el problema")).toHaveAttribute("readonly", "");
    }
    await page.getByRole("button", { name: "Reintentar el mismo envío" }).click();
    await expect(page.getByRole("heading", { name: "Reporte registrado" })).toBeVisible();
    assert.equal(await prisma.incidencia.count({ where: { dispositivoId: unit.id } }), 1);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("manadalab.reportDraft.v2")), null);
  });
  await check("Entrega privada, validación y devolución confirmada", async () => {
    await page.goto(`${origin}/admin/prestamos/nuevo`);
    await expect(page.getByLabel("Unidad disponible")).toContainText("WIFI-01");
    const unit = await prisma.dispositivo.findUniqueOrThrow({ where: { clave: "WIFI-01" } });
    await page.getByLabel("Unidad disponible").selectOption(String(unit.id));
    await page.getByLabel("Nombre del profesor receptor").fill("Profesora de ensayo");
    await page.getByRole("button", { name: "Registrar entrega", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Información del préstamo" })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar devolución", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Sí, recibí la unidad" }).click();
    await expect(page.getByText("La devolución quedó registrada y se conserva este historial.")).toBeVisible();
    assert.ok((await prisma.prestamo.findFirstOrThrow({ where: { dispositivoId: unit.id } })).fechaDevolucion);
  });
  await check("Entrega con respuesta perdida: conciliación sin segundo POST", async () => {
    await page.goto(`${origin}/admin/prestamos/nuevo`);
    const unit = await prisma.dispositivo.findUniqueOrThrow({ where: { clave: "WIFI-02" } });
    await page.getByLabel("Unidad disponible").selectOption(String(unit.id));
    await page.getByLabel("Nombre del profesor receptor").fill("Profesor de respuesta perdida");
    await page.route("**/api/admin/prestamos", async route => { if (route.request().method() !== "POST") return route.continue(); await route.fetch(); await route.abort("failed"); });
    await page.getByRole("button", { name: "Registrar entrega", exact: true }).click();
    await expect(page.getByRole("button", { name: "Verificar resultado" })).toBeVisible();
    await page.unroute("**/api/admin/prestamos");
    await page.reload();
    await page.getByRole("button", { name: "Verificar resultado" }).click();
    await expect(page.getByRole("link", { name: /Hay un préstamo pendiente/ })).toBeVisible();
    assert.equal(await prisma.prestamo.count({ where: { dispositivoId: unit.id } }), 1);
  });
  await check("Éxito inválido de préstamo: conserva borrador y concilia sin duplicar entrega", async () => {
    const unit = await prisma.dispositivo.findUniqueOrThrow({ where: { clave: "WIFI-01" } });
    // El escenario anterior dejó deliberadamente una entrega incierta en esta pestaña.
    await page.evaluate(id => sessionStorage.removeItem(`manadalab.loanDraft.v2.${id}`), admin.id);
    await page.goto(`${origin}/admin/prestamos/nuevo`);
    await page.getByLabel("Unidad disponible").selectOption(String(unit.id));
    await page.getByLabel("Nombre del profesor receptor").fill("Profesor de éxito inválido");
    let posts = 0;
    await page.route("**/api/admin/prestamos", async route => {
      if (route.request().method() !== "POST") return route.continue();
      posts++;
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      await route.fulfill({ status: 201, contentType: "application/json", body: '{"id":0}' });
    });
    await page.getByRole("button", { name: "Registrar entrega", exact: true }).click();
    await expect(page.getByRole("button", { name: "Verificar resultado" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nombre del profesor receptor")).toHaveValue("Profesor de éxito inválido");
    await expect(page.getByRole("button", { name: "Registrar entrega", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Verificar resultado" }).click();
    await expect(page.getByRole("link", { name: /Hay un préstamo pendiente/ })).toBeVisible();
    assert.equal(posts, 1);
    assert.equal(await prisma.prestamo.count({ where: { dispositivoId: unit.id, fechaDevolucion: null } }), 1);
    await page.unroute("**/api/admin/prestamos");
  });
  await check("Técnico: alcance externo exclusivo de computadoras", async () => {
    await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await login(technician.correo);
    await page.goto(`${origin}/admin/incidencias`);
    await page.getByRole("button", { name: "Computadoras de otros EMAs", exact: true }).click();
    await expect(page.getByRole("table")).toContainText("PC-EXTERNA");
    await page.getByRole("link", { name: /PC-EXTERNA/ }).click();
    await page.getByRole("button", { name: "Marcar como visto" }).click();
    await expect(page.getByRole("button", { name: "Marcar como solucionado" })).toBeVisible();
    assert.equal((await prisma.incidencia.findUniqueOrThrow({ where: { id: foreignReport.id } })).estado, "VISTO");
  });
  await check("Responsive público y administrativo, navegación móvil y teclado", async () => {
    for (const path of ["/", "/reportar", "/seguimiento", "/admin", "/admin/incidencias", "/admin/prestamos"]) {
      // Aislar la ráfaga artificial de diez recargas por pantalla. Solo afecta a este Express efímero.
      limiteGeneral.resetKey("127.0.0.1");
      for (const width of [360,390,430,600,768,820,1024,1366,1440,1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(origin + path);
        await page.waitForTimeout(120);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Desbordamiento en ${path}, ${width}px`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/admin/incidencias`);
    await expect(page.locator(".sidebar")).toBeHidden();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest(".sidebar")), false);
    await page.getByRole("button", { name: "Abrir navegación", exact: true }).click();
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar navegación", exact: true })).toHaveCount(2);
    await page.keyboard.press("Escape");
    await expect(page.locator(".sidebar")).toBeHidden();
    await expect(page.getByRole("button", { name: "Abrir navegación", exact: true })).toBeFocused();
    await page.screenshot({ path: resolve(root, "test-results/incidencias-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1366, height: 900 });
    await expect(page.locator(".sidebar")).toBeVisible();
    await page.locator(".sidebar .brand").focus();
    await expect(page.locator(".sidebar .brand")).toBeFocused();
  });
  await check("Sesión revocada, recuperación de ruta y formulario conservado", async () => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(`${origin}/admin/prestamos/nuevo`);
    await page.getByLabel("Nombre del profesor receptor").fill("Borrador conservado");
    await prisma.sesion.updateMany({ where: { usuarioId: technician.id }, data: { revocadaEn: new Date() } });
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByRole("heading", { name: "Acceso del personal" })).toBeVisible();
    await login(technician.correo);
    await expect(page.getByLabel("Nombre del profesor receptor")).toHaveValue("Borrador conservado");
  });
  await check("Errores de red recuperables y ausencia de errores React", async () => {
    await page.route("**/api/aulas**", route => route.abort("failed"));
    await page.goto(`${origin}/aulas`);
    await expect(page.getByRole("alert").filter({ hasText: "No pudimos conectar" })).toBeVisible();
    await page.unroute("**/api/aulas**");
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Aula 101" })).toBeVisible();
    assert.deepEqual(errors, []);
  });
  console.log(`\n${checks.length} escenarios E2E aprobados con Express y PostgreSQL reales. Capturas: frontend/test-results/.`);
} catch (error) {
  if (page) { await mkdir(resolve(root, "test-results"), { recursive: true }); await page.screenshot({ path: resolve(root, "test-results/failure.png"), fullPage: true }).catch(() => {}); }
  console.error(error); process.exitCode = 1;
} finally {
  await browser?.close();
  if (nextServer && nextServer.exitCode === null) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(nextServer.pid), "/T", "/F"], { stdio: "ignore" });
    else nextServer.kill("SIGTERM");
  }
  if (apiServer) await new Promise(resolve => apiServer.close(resolve));
  await prisma?.$disconnect();
  if (container) command("docker", ["rm", "-f", name]);
}
