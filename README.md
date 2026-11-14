# ManadaLab — frontend

Next.js App Router, React y TypeScript. Interfaz para reportar y dar seguimiento a incidencias de CU2, BUAP, conectada a la API Express de ManadaLab. Incluye consulta pública, administración y registro privado de préstamos presenciales.

## Ejecutar

Desde `frontend/`, con Node.js 24 o posterior:

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1
```

Abrir **http://127.0.0.1:3000**. Express debe estar accesible en `http://127.0.0.1:4000`. Next.js reenvía `/api/:path*` hacia Express; el navegador utiliza siempre `/api` bajo el mismo origen.

### Origen autorizado del backend existente

Express comprueba `Origin` en las escrituras. Para abrir este frontend en `http://127.0.0.1:3000`, el **proceso de Express** debe recibir `APP_ORIGIN=http://127.0.0.1:3000`. `localhost` y `127.0.0.1` son orígenes diferentes; usar consistentemente la misma dirección.

La configuración del backend no se modificó. Su valor predeterminado es `http://127.0.0.1:4000`: con ese valor, las consultas funcionan, pero acceso, reportes y escrituras desde el puerto 3000 reciben `403`. Esta comprobación no se elimina ni se disimula en el proxy.

Si se desea pasar el origen **solo durante una ejecución** con el Compose existente, y el puerto 4000 está libre:

```powershell
# En backend/, usando su configuración y comandos existentes:
docker compose up -d db
docker compose run --rm --service-ports -e APP_ORIGIN=http://127.0.0.1:3000 backend
```

Ese comando inicia un contenedor puntual y no edita `.env`, Compose ni código. No iniciar al mismo tiempo otro backend en el mismo puerto. Para una instalación permanente, el responsable del entorno debe proporcionar el origen correcto al proceso de Express.

### Variables del frontend

| Variable | Valor predeterminado | Uso |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | URL relativa del cliente; sin secretos |
| `BACKEND_URL` | `http://127.0.0.1:4000` | Destino interno del rewrite de Next.js |

Definir `BACKEND_URL` antes de `npm run build` cuando el backend tenga otra dirección: los rewrites quedan incorporados en la compilación. El servidor de producción se ejecuta con `npm start` después de `npm run build`.

## Pantallas

| Ruta | Función |
|---|---|
| `/` | Bienvenida y explicación del recorrido |
| `/reportar` | EMA → aula → dispositivo → descripción y matrícula |
| `/confirmacion?folio=UUID` | Confirmación y copia del folio |
| `/seguimiento?folio=UUID` | Consulta pública, sin texto libre ni matrícula |
| `/aulas` y `/aulas/[id]` | Aulas, recursos reportables e incidencias públicas |
| `/login` | Acceso de cuentas precargadas |
| `/admin` | Resumen del EMA propio |
| `/admin/incidencias` | Búsqueda, filtros y alcance técnico externo |
| `/admin/incidencias/[id]` | Descripción, historial y transición autorizada |
| `/admin/aulas` y `/admin/aulas/[id]` | Consulta del EMA propio |
| `/admin/prestamos` | Registro privado, filtros y situaciones |
| `/admin/prestamos/nuevo` | Entrega presencial de una unidad disponible |
| `/admin/prestamos/[id]` | Detalle y devolución confirmada |

No hay registro de cuentas ni pantallas de alta de inventario. EMAs, aulas, tipos, dispositivos y cuentas se precargan en PostgreSQL mediante las herramientas privadas del backend. No se incluyen cuentas ni inventario de demostración en la aplicación.

## Decisiones de integración

- **Contrato real.** Folios UUID, estados `PENDIENTE`/`VISTO`/`SOLUCIONADO`, IDs numéricos reales y nombres del backend (`correo`, `contrasena`, `dispositivoId`, `profesorNombre`). Sin IDs de catálogo asumidos.
- **Sesión.** JWT únicamente en cookie HttpOnly. El contexto y CSRF se recuperan de `/api/sesion`, sin guardar tokens o contraseñas en Web Storage. Se comprueba la sesión al entrar, recuperar foco y cada 15 segundos visibles. Al revocarse/caducar, se muestra acceso en la ruta actual y se retiran las vistas privadas.
- **Permisos.** El administrador ve las incidencias de su EMA; el cambio de computadoras requiere técnico. El técnico tiene las funciones normales en su EMA y alcance adicional solo de computadoras externas. Los préstamos siguen siendo del EMA propio. Express conserva la autoridad en cada operación.
- **Filtros del diseño.** Como la API no ofrece búsqueda textual, exclusión del EMA propio o filtro de préstamos por categoría, el cliente recorre todas las páginas autorizadas de los listados antes de filtrar y paginar visualmente. Los conteos se calculan sobre el conjunto completo, nunca sobre una sola página. Los selectores se derivan de las respuestas reales. Es una solución para el volumen académico previsto; no ofrece una instantánea transaccional entre páginas diferentes ni está pensada para listados masivos.
- **Inventario.** Se muestran clave, tipo y aula reales. No se inventan plantas, nombres cortos, accesorios o conteos de inventario no disponibles en el contrato. La imagen de la bienvenida es una ilustración, identificada como tal.
- **Alta de reportes.** Clave UUID por intención. Ante pérdida de respuesta o `5xx`, se conservan cuerpo y clave y se bloquea la edición hasta recuperar el resultado. Un `409` con incidencia activa conduce a su seguimiento. Validaciones de servidor y mensajes se presentan sin descartar el formulario.
- **Préstamos.** La API de alta no tiene clave de idempotencia. Ante un resultado incierto se ofrece verificar los préstamos y revisar el registro existente; no se repite el POST automáticamente. La devolución utiliza `{}` y conserva el comportamiento idempotente del servidor.
- **Borradores.** Matrícula/descripción del reporte y captura de préstamo se conservan temporalmente en `sessionStorage`, no en `localStorage`. El borrador de préstamo está separado por usuario. Se eliminan al confirmar la operación; si Web Storage está bloqueado, el formulario funciona en memoria y avisa ante un envío incierto.
- **Actualización.** Consultas al entrar, recuperar foco y cada 15 segundos visibles. React actualiza datos sin reconstruir los campos o perder el foco. Recarga inmediata tras cambios propios, fecha de última consulta exitosa y error recuperable cuando falla la red.

## Organización

```text
src/
  app/                    Rutas, layouts y estilos
  components/
    admin/                Resumen y composición administrativa
    aulas/                Consulta de aulas y recursos
    auth/                 Acceso reutilizable
    incidencias/          Listado, tabla y detalle privado
    layout/               Layouts público y administrativo
    prestamos/            Lista, entrega y devolución
    public/               Reporte y seguimiento
    ui/                   Indicadores, feedback, diálogos e iconos
  hooks/useConsulta.ts    Carga cancelable, refresco y datos anteriores
  lib/api.ts              HTTP, códigos y cuerpos de error
  providers/              Sesión y composición de proveedores
  services/               Adaptadores al contrato de Express
  types/                  Contratos del frontend
tests/browser-e2e.mjs      Integración real en entorno efímero
```

## Verificación

```powershell
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

## Archivos versionados

Conservar `src/`, `tests/`, los archivos de configuración, `package.json`, `package-lock.json` y este README. El lockfile fija las dependencias para `npm ci`; las pruebas usan datos ficticios en una base temporal independiente.

`.gitignore` excluye dependencias, compilados, cachés, resultados/capturas de pruebas, cobertura, configuración de editores y agentes, archivos `.env*`, configuración local de npm y claves privadas. `next-env.d.ts` se genera mediante Next.js. Los valores predeterminados de configuración están documentados arriba; no se necesitan credenciales del backend en el frontend. Las variables `NEXT_PUBLIC_*` se incorporan al cliente y deben contener únicamente valores públicos.

Desde la raíz del proyecto, revisar `git status --short --untracked-files=all -- frontend` y preparar únicamente `frontend/` si solo se publicará esta parte. No añadir la configuración ni los datos privados del backend.

### Pruebas de navegador con backend real

Requisitos: Docker disponible, imagen `postgres:17`, puertos 3000 y 4000 libres, backend existente con dependencias y `dist/` ya compilados. No se compila ni modifica el backend desde estas pruebas.

```powershell
npx playwright install chromium
npm run test:e2e
```

Si el backend habitual ocupa el puerto 4000, ejecutar la prueba con otro puerto libre, sin detenerlo:

```powershell
$env:MANADALAB_E2E_API_PORT = "4100"
$env:BACKEND_URL = "http://127.0.0.1:4100"
npm run test:e2e
Remove-Item Env:MANADALAB_E2E_API_PORT, Env:BACKEND_URL
npm run build
```

El último build restablece el destino habitual del frontend después del ensayo. Si esas variables ya tenían valores propios, restaurarlos en lugar de eliminarlos. El puerto 3000 debe estar libre.

El script crea un contenedor PostgreSQL **efímero**, con usuario/contraseña aleatorios y una base `frontend_e2e` independiente. Aplica las migraciones existentes únicamente allí. Carga dos EMAs, cuentas y más de cien dispositivos/incidencias de prueba; ejecuta el Express existente con configuración temporal del proceso y Next.js compilado. No lee ni modifica las credenciales de la base del proyecto. Al terminar, cierra navegador/servidores y elimina el contenedor. Para otra ubicación del backend, definir `MANADALAB_BACKEND_DIR`.

Se verifican: privacidad pública, inventario de más de una página, reporte activo, pérdida de respuesta y reenvío tras recargar, conflicto simultáneo de alta, foco/actualización pública, acceso incorrecto y correcto, búsqueda fuera de la primera página, permisos, conflicto de versión, transición final, entrega, devolución, conciliación de entrega incierta, alcance técnico externo, sesión revocada y recuperación del borrador, errores de red, ausencia de errores React y desbordamiento horizontal en diez anchos (360–1920 px). Capturas en `test-results/`, excluidas de Git.

## Estado de verificación

Lint, tipos y compilación de producción comprobados después de la limpieza para Git. La última ejecución de la suite integrada aprobó **15 escenarios E2E** con Chromium, Express y PostgreSQL reales en un entorno temporal aislado; no se repitió la suite durante la retirada de archivos sin uso.

Las pruebas incluyen conservación de borradores ante respuestas de éxito inválidas, reintento del reporte con la misma clave, conciliación de préstamos sin duplicados, categoría del dispositivo restaurado y navegación por teclado en móvil/escritorio. La prueba responsive reinicia el contador general únicamente del Express efímero entre pantallas para aislar las ráfagas de recargas. No modifica los límites del backend habitual.

La aceptación con el inventario y las cuentas reales depende de su precarga y del origen proporcionado al proceso de Express. Prisma/pg puede emitir un aviso interno de deprecación por consultas concurrentes durante el ensayo, documentado en el backend.
