import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { INITIAL_PLAYERS } from './src/data/initialPlayers.js';
import { LiveTrackerPayload, PlayerProfile } from './src/types/lol.js';


const app = express();
const PORT = Number(process.env.PORT || 3000);
const LIVE_PATH = path.resolve('data/live.json');
const execFileAsync = promisify(execFile);

let refreshPromise: Promise<LiveTrackerPayload> | null = null;
let lastRefreshStartedAt = 0;
const REFRESH_COOLDOWN_MS = 60_000;

app.use(express.json());

function cloneSeed(): PlayerProfile[] {
  return JSON.parse(JSON.stringify(INITIAL_PLAYERS)) as PlayerProfile[];
}

function recalculateRankings(players: PlayerProfile[]) {
  const tierWeight: Record<string, number> = {
    CHALLENGER: 10000,
    GRANDMASTER: 9000,
    MASTER: 8000,
    DIAMOND: 7000,
    EMERALD: 6000,
    PLATINUM: 5000,
    GOLD: 4000,
    SILVER: 3000,
    BRONZE: 2000,
    IRON: 1000,
    UNRANKED: 0,
  };
  const divisionWeight: Record<string, number> = { I: 400, II: 300, III: 200, IV: 100 };
  const apexTiers = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

  const eloScore = (player: PlayerProfile) =>
    (tierWeight[player.tier] || 0) +
    (apexTiers.has(player.tier.toUpperCase()) ? 0 : (divisionWeight[player.division] || 0)) +
    player.lp;

  const formScore = (player: PlayerProfile) =>
    player.winrate * 1.5 +
    player.streak * 4 +
    player.avgKda * 2.5 +
    (player.wins / Math.max(1, player.wins + player.losses)) * 50;

  [...players].sort((a, b) => eloScore(b) - eloScore(a)).forEach((player, index) => {
    const target = players.find((item) => item.id === player.id);
    if (target) target.eloRank = index + 1;
  });

  [...players].sort((a, b) => formScore(b) - formScore(a)).forEach((player, index) => {
    const target = players.find((item) => item.id === player.id);
    if (target) target.formRank = index + 1;
  });
}

async function loadLivePayload(): Promise<LiveTrackerPayload> {
  try {
    const raw = await fs.readFile(LIVE_PATH, 'utf8');
    const payload = JSON.parse(raw) as LiveTrackerPayload;
    if (Array.isArray(payload.players) && payload.players.length === 5) {
      recalculateRankings(payload.players);
      return payload;
    }
  } catch (error) {
    console.warn('No se pudo leer data/live.json:', error);
  }

  const players = cloneSeed();
  recalculateRankings(players);

  return {
    generatedAt: null,
    source: 'seed',
    sourceType: 'local-fallback',
    status: 'waiting_for_first_sync',
    players,
    errors: ['Todavía no existe un snapshot vivo válido de OP.GG.'],
    meta: {
      team: 'KOI / MKOI',
      region: 'NA',
      accountCount: players.length,
      successfulCount: 0,
    },
  };
}

function applyRefreshCors(req: express.Request, res: express.Response) {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    'https://shiro32-nexo32.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

app.options('/api/refresh', (req, res) => {
  applyRefreshCors(req, res);
  res.sendStatus(204);
});

app.post('/api/refresh', async (req, res) => {
  applyRefreshCors(req, res);
  res.setHeader('Cache-Control', 'no-store');

  const now = Date.now();

  if (now - lastRefreshStartedAt < REFRESH_COOLDOWN_MS) {
    const retryAfter = Math.max(
      1,
      Math.ceil((REFRESH_COOLDOWN_MS - (now - lastRefreshStartedAt)) / 1000),
    );

    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      ok: false,
      error: 'Ya se ha solicitado una sincronización hace muy poco.',
      retryAfter,
    });
  }

  lastRefreshStartedAt = now;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const tempLivePath = path.join(
        os.tmpdir(),
        'koi-live-' + process.pid + '.json',
      );

      try {
        await fs.copyFile(LIVE_PATH, tempLivePath);

        await execFileAsync(
          process.execPath,
          [path.resolve('scripts', 'sync_opgg.mjs')],
          {
            cwd: path.resolve('.'),
            timeout: 120_000,
            maxBuffer: 2 * 1024 * 1024,
            env: {
              ...process.env,
              KOI_LIVE_PATH: tempLivePath,
            },
          },
        );

        return JSON.parse(await fs.readFile(tempLivePath, 'utf8')) as LiveTrackerPayload;
      } finally {
        await fs.rm(tempLivePath, { force: true });
        refreshPromise = null;
      }
    })();
  }

  try {
    const payload = await refreshPromise;

    return res.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('No se pudo completar la actualización manual:', error);

    return res.status(502).json({
      ok: false,
      error: message.slice(0, 500),
    });
  }
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KOI Tracker running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error);
  process.exit(1);
});
