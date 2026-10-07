import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { INITIAL_PLAYERS } from './src/data/initialPlayers.js';
import { LiveTrackerPayload, PlayerProfile } from './src/types/lol.js';


const app = express();
const PORT = Number(process.env.PORT || 3000);
const LIVE_PATH = path.resolve('data/live.json');

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
