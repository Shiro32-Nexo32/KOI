# KOI Tracker · MKOI

Tracker de las cinco cuentas de SoloQ monitorizadas de **KOI / MKOI**:

- Myrwn
- Elyoya
- Jojopyun
- Supa
- Alvaro

El frontend es una web estática gratuita en GitHub Pages. El refresco se coordina con un Cloudflare Worker gratuito que activa un workflow de GitHub Actions cada cinco minutos. GitHub Actions consulta el servidor MCP oficial de OP.GG y publica el snapshot si encuentra cambios relevantes.

## Fuente de datos

La fuente principal del tracker es **OP.GG**.

El sincronizador utiliza el servidor MCP oficial de OP.GG para consultar las herramientas de perfil y partidas:

- rango y LP;
- victorias, derrotas y winrate;
- últimas partidas;
- campeón jugado;
- KDA y CS/min;
- snapshots de evolución;
- ranking de forma y ladder.

No se requiere una Riot API key para este flujo.

La web no llama directamente a una API de Riot. El workflow de GitHub Actions consulta el MCP de OP.GG y publica un snapshot en \`data/live.json\`.

## Arquitectura

~~~text
Cloudflare Worker (Cron Trigger cada 5 min)
   │
   │ workflow_dispatch
   ▼
GitHub Actions
   │
   │ consulta MCP oficial de OP.GG
   ▼
data/live.json ── solo se publica si hay cambios significativos
   │
   ├── frontend estático en GitHub Pages
   └── callback de estado ──► Cloudflare KV
                              (última comprobación, resultado y errores)
~~~

El frontend consulta el snapshot publicado cada dos minutos y guarda una copia local para no quedarse vacío si una sincronización temporal falla. También consulta el coordinador para distinguir la fecha de los datos de la hora de la última comprobación real.

El workflow mantiene una comprobación programada **cada hora como respaldo** si Cloudflare no está disponible o aún no se ha desplegado. Cuando el Worker ya está configurado, su Cron Trigger pasa a ser el mecanismo principal de cinco minutos.

Los snapshots no generan un commit si el único campo que cambia es \`syncedAt\`. La hora de cada comprobación se guarda en Cloudflare KV, evitando crear cientos de commits diarios sin cambios en las cuentas.

## Desarrollo local

Instala dependencias:

~~~bash
npm install
npm run dev
~~~

El servidor local arranca en \`http://localhost:3000\`. El endpoint manual del antiguo servidor Express sigue estando disponible para desarrollo local; la web pública usa el coordinador de Cloudflare si se configura su URL.

## Pruebas

~~~bash
npm run test:worker
npm run build
~~~

Las pruebas del coordinador se ejecutan también en GitHub Actions y verifican, entre otras cosas, la lectura del estado, la autenticación del callback, el refresco manual y el disparo programado.

## Desplegar el coordinador gratuito de Cloudflare

Este paso se hace una sola vez desde una cuenta gratuita de Cloudflare. **No se guardan tokens en el repositorio**.

### 1. Crear el namespace KV

Con Node.js instalado, ejecuta desde la raíz del repositorio:

~~~bash
npx wrangler@latest kv namespace create SYNC_STATUS
~~~

Copia el identificador que devuelve el comando. Duplica \`wrangler.toml.example\` como \`wrangler.toml\` y sustituye \`REPLACE_WITH_YOUR_32_CHARACTER_KV_NAMESPACE_ID\` por el identificador real. En Windows PowerShell:

~~~powershell
Copy-Item wrangler.toml.example wrangler.toml
~~~

El archivo \`wrangler.toml\` está ignorado por Git para no versionar la configuración local.

### 2. Crear los secretos del Worker

Crea un token fine-grained de GitHub limitado al repositorio \`Shiro32-Nexo32/KOI\`, con permiso **Actions: Read and write**. No hace falta usar un token con permisos para todos tus repositorios.

Añade los secretos al Worker:

~~~bash
npx wrangler@latest secret put GITHUB_TOKEN
npx wrangler@latest secret put SYNC_STATUS_TOKEN
~~~

Introduce el token fine-grained cuando el primer comando lo solicite. Para \`SYNC_STATUS_TOKEN\`, genera una cadena aleatoria larga (por ejemplo, con \`openssl rand -hex 32\`) y guarda el mismo valor para el siguiente paso.

### 3. Desplegar

~~~bash
npx wrangler@latest deploy
~~~

Cloudflare mostrará una URL de \`workers.dev\`, por ejemplo \`https://koi-sync-coordinator.tu-subdominio.workers.dev\`. Comprueba que \`/api/health\` responde con \`{"ok":true,...}\`.

El Worker incluye un Cron Trigger \`*/5 * * * *\`, que solicita el workflow de sincronización. Evita lanzar una segunda ejecución cuando ya hay otra activa y aplica un pequeño período de protección frente a despachos duplicados.

### 4. Conectar GitHub Actions con el Worker

En GitHub, abre **Settings → Secrets and variables → Actions**.

Añade estos **secrets** del repositorio KOI:

- \`KOI_SYNC_STATUS_URL\`: URL completa del callback, terminada en \`/api/sync-status\`, por ejemplo \`https://koi-sync-coordinator.tu-subdominio.workers.dev/api/sync-status\`.
- \`KOI_SYNC_STATUS_TOKEN\`: el mismo valor que guardaste como secreto \`SYNC_STATUS_TOKEN\` del Worker.

Añade esta **variable** del repositorio:

- \`VITE_COORDINATOR_URL\`: la URL base del Worker, sin \`/api\` al final, por ejemplo \`https://koi-sync-coordinator.tu-subdominio.workers.dev\`.

Al completar este paso, ejecuta manualmente **Actions → Deploy KOI Tracker → Run workflow** para reconstruir GitHub Pages con la URL del coordinador. Comprueba después el botón **Actualizar** y que \`/api/status\` indique una hora en \`checkedAt\` cuando termine la siguiente sincronización.

Si los secretos aún no están configurados, el workflow omite el callback sin exponer tokens ni detener la publicación del snapshot.

## GitHub Pages

La página se construye con Vite mediante \`.github/workflows/static.yml\`. Los commits que solo cambian \`data/live.json\` no recompilan toda la web, porque el frontend consume ese archivo directamente.

## Estructura importante

- \`data/monitored.json\`: las cinco cuentas monitorizadas.
- \`data/live.json\`: último snapshot público.
- \`scripts/sync_opgg.mjs\`: sincronizador mediante el MCP oficial de OP.GG.
- \`scripts/publish_sync_status.mjs\`: envía el resultado de cada ejecución al Worker cuando los secretos están configurados.
- \`worker/index.js\`: API manual, estado público, callback autenticado y Cron Trigger.
- \`worker/tests/worker.test.mjs\`: pruebas de la API del Worker.
- \`wrangler.toml.example\`: configuración de ejemplo para Cloudflare.
- \`server.ts\`: servidor Express local opcional.
- \`.github/workflows/sync-opgg.yml\`: sincronización y publicación de snapshot.
- \`.github/workflows/static.yml\`: pruebas y publicación en GitHub Pages.

## Política de datos

El tracker conserva snapshots de LP cuando detecta cambios de rango o LP. El histórico se almacena en \`data/live.json\` y queda versionado en Git. La hora de cada comprobación se conserva por separado en Cloudflare KV.

## Aviso legal

KOI Tracker isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Los logotipos, nombres y recursos de League of Legends siguen perteneciendo a sus respectivos titulares.

## Consultas del tracker

La pestaña de análisis no utiliza IA generativa ni servicios externos de generación de texto. Las respuestas son deterministas: reconocen preguntas habituales y calculan la respuesta a partir de los datos presentes en \`data/live.json\`. Incluye consultas sobre líder de rango, líder de forma, actividad de la última hora o de las últimas 24 horas, cambios de ladder registrados, rendimiento individual, botlane, KDA, rachas, campeones y últimas partidas.
