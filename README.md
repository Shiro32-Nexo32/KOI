# KOI Tracker · MKOI

Tracker de las cinco cuentas de SoloQ monitorizadas de **KOI / MKOI**:

- Myrwn
- Elyoya
- Jojopyun
- Supa
- Alvaro

La aplicación está diseñada como un **tracker de cuentas**, no como una ficha estática. El frontend muestra el último snapshot disponible y GitHub Actions sincroniza los datos automáticamente desde OP.GG.

## Fuente de datos

La fuente principal del tracker es **OP.GG**.

El sincronizador usa endpoints internos que consume la propia web de OP.GG para obtener:

- rango y LP;
- victorias, derrotas y winrate;
- últimas partidas;
- campeón jugado;
- KDA;
- CS/min;
- snapshots de evolución;
- ranking de forma y ladder.

No se requiere una Riot API key para este flujo.

**Importante:** el endpoint de OP.GG utilizado no está documentado por OP.GG como una API pública para desarrolladores. Está aislado en `scripts/sync_opgg.py` para poder sustituirlo si cambia.

## Arquitectura

~~~text
OP.GG
  │
  │ cada 15 minutos
  ▼
GitHub Actions
  │
  │ genera
  ▼
data/live.json
  │
  ├── frontend en GitHub Pages
  │
  └── servidor local opcional
~~~

El frontend consulta el último `live.json` publicado directamente desde GitHub y guarda una copia local para evitar quedarse vacío cuando una sincronización temporalmente no esté disponible.

La web **no afirma "tiempo real"**: muestra la antigüedad del último snapshot recibido.

## Desarrollo local

Instala dependencias:

~~~bash
npm install
~~~

Arranca el servidor local:

~~~bash
npm run dev
~~~

El servidor local sirve la interfaz y expone una pequeña API de lectura sobre `data/live.json`.

## Sincronización manual

Desde GitHub Actions se puede ejecutar manualmente:

**Actions → Sync KOI accounts from OP.GG → Run workflow**

El workflow también se ejecuta automáticamente cada 15 minutos.

## GitHub Pages

La página se construye con Vite mediante `.github/workflows/static.yml`.

Los commits que solo cambian `data/live.json` no vuelven a compilar toda la web; el frontend consume ese archivo directamente. Esto reduce despliegues innecesarios.

## Estructura importante

- `data/monitored.json` → las cinco cuentas monitorizadas.
- `data/live.json` → último snapshot publicado.
- `scripts/sync_opgg.py` → sincronizador OP.GG.
- `src/data/initialPlayers.ts` → datos de respaldo iniciales.
- `src/utils/ddragon.ts` → recursos de campeones, objetos y hechizos.
- `server.ts` → servidor local opcional.
- `.github/workflows/sync-opgg.yml` → sincronización automática.
- `.github/workflows/static.yml` → publicación en GitHub Pages.

## Política de datos

El tracker conserva snapshots de LP cuando detecta cambios de rango o LP. El histórico se almacena dentro de `data/live.json` y queda versionado en Git, de modo que los cambios no dependen de que un proceso Node permanezca vivo.

## Aviso legal

KOI Tracker isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Los logotipos, nombres y recursos de League of Legends siguen perteneciendo a sus respectivos titulares.
