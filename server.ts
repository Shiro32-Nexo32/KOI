import express from 'express';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_PLAYERS } from './src/data/initialPlayers.js';
import { LiveTrackerPayload, PlayerProfile } from './src/types/lol.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const LIVE_PATH = path.resolve('data/live.json');

app.use(express.json());

let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY?.trim()) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY.trim(),
      httpOptions: { headers: { 'User-Agent': 'koi-tracker' } },
    });
  } catch (error) {
    console.error('No se pudo inicializar Gemini:', error);
  }
}

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

  const eloScore = (player: PlayerProfile) =>
    (tierWeight[player.tier] || 0) +
    (divisionWeight[player.division] || 0) +
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

function localAnalyst(question: string, players: PlayerProfile[]): string {
  const query = question.toLowerCase();

  if (query.includes('reporte') || query.includes('5 jugadores') || query.includes('como van') || query.includes('cómo van')) {
    const form = [...players].sort((a, b) => a.formRank - b.formRank);
    const elo = [...players].sort((a, b) => a.eloRank - b.eloRank);
    return [
      '**Reporte KOI / MKOI**',
      '',
      '**Forma**',
      ...form.map((p, i) => `${i + 1}. ${p.proName} — ${p.tier} ${p.division} ${p.lp} LP · ${p.winrate}% WR · KDA ${p.avgKda}`),
      '',
      '**Ladder**',
      ...elo.map((p, i) => `${i + 1}. ${p.proName} — ${p.tier} ${p.division} ${p.lp} LP`),
    ].join('\n');
  }

  const player = players.find((candidate) =>
    [candidate.id, candidate.proName, candidate.gameName]
      .some((alias) => query.includes(alias.toLowerCase())),
  );

  if (player) {
    const topChampion = [...player.champions].sort((a, b) => b.games - a.games)[0];
    return [
      `**${player.proName}**`,
      `Rango: **${player.tier} ${player.division} · ${player.lp} LP**`,
      `Balance: **${player.wins}-${player.losses} (${player.winrate}% WR)**`,
      `KDA medio: **${player.avgKda}** · CS/min **${player.avgCsPerMin}**`,
      `Racha: **${player.streak > 0 ? '+' : ''}${player.streak}**`,
      topChampion ? `Pick principal: **${topChampion.championName}** (${topChampion.winrate}% WR)` : '',
    ].filter(Boolean).join('\n');
  }

  if (query.includes('kda') || query.includes('mejor')) {
    const best = [...players].sort((a, b) => b.avgKda - a.avgKda)[0];
    return best
      ? `${best.proName} lidera el KDA medio del grupo con **${best.avgKda}**.`
      : 'No hay KDA suficientes para comparar.';
  }

  return 'Puedo analizar rango, LP, winrate, KDA, rachas, campeones y el ranking de las cinco cuentas.';
}

app.get('/api/players', async (_req, res) => {
  const payload = await loadLivePayload();
  res.json(payload);
});

app.post('/api/players/refresh', async (_req, res) => {
  const payload = await loadLivePayload();
  res.json({
    ...payload,
    success: true,
    message:
      payload.source === 'OP.GG'
        ? 'Se ha cargado el último snapshot publicado por el sincronizador de OP.GG.'
        : 'Todavía no existe un snapshot vivo publicado por el sincronizador de OP.GG.',
  });
});

app.post('/api/players/update-account', (req, res) => {
  const { playerId, riotId, region } = req.body || {};
  const player = cloneSeed().find((item) => item.id === playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });

  if (typeof riotId === 'string' && riotId.includes('#')) {
    const [name, tag] = riotId.split('#');
    player.riotId = riotId.trim();
    player.gameName = name.trim();
    player.tagLine = tag.trim();
  }
  if (typeof region === 'string' && region.trim()) {
    player.region = region.trim();
  }

  res.json({
    success: true,
    player,
    message: 'Cambio local aceptado. La cuenta monitorizada se define en data/monitored.json.',
  });
});

app.post('/api/analyst/report', async (req, res) => {
  const payload = await loadLivePayload();
  const { playerId } = req.body || {};
  const player = playerId ? payload.players.find((item) => item.id === playerId) : null;

  if (aiClient) {
    try {
      const context = player ? [player] : payload.players;
      const prompt = [
        'Eres el analista estadístico de KOI / MKOI.',
        'Usa únicamente los datos proporcionados. No inventes partidas, LP, winrates o campeones.',
        JSON.stringify(context, null, 2),
        player ? `Analiza a ${player.proName}.` : 'Resume el estado de las cinco cuentas.',
      ].join('\n\n');

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({
        report: response.text || localAnalyst('reporte', payload.players),
        source: 'gemini',
        generatedAt: Date.now(),
      });
    } catch (error) {
      console.warn('Gemini no disponible; usando analista local:', error);
    }
  }

  return res.json({
    report: localAnalyst(player ? `como va ${player.proName}` : 'reporte', payload.players),
    source: 'tracker-analytics',
    generatedAt: Date.now(),
  });
});

app.post('/api/analyst/ask', async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) return res.status(400).json({ error: 'Pregunta requerida' });

  const payload = await loadLivePayload();

  if (aiClient) {
    try {
      const context = payload.players.map((player) => ({
        name: player.proName,
        riotId: player.riotId,
        tier: `${player.tier} ${player.division} ${player.lp} LP`,
        record: `${player.wins}-${player.losses} (${player.winrate}% WR)`,
        streak: player.streak,
        kda: player.avgKda,
        csPerMin: player.avgCsPerMin,
        champions: player.champions.slice(0, 5).map((champion) => ({
          name: champion.championName,
          games: champion.games,
          winrate: champion.winrate,
          kda: champion.kda,
        })),
      }));

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          'Eres un analista de KOI / MKOI. Responde en español y no inventes datos.',
          JSON.stringify(context, null, 2),
          `Pregunta: ${question}`,
        ].join('\n\n'),
      });

      return res.json({
        answer: response.text || localAnalyst(question, payload.players),
        source: 'gemini',
      });
    } catch (error) {
      console.warn('Gemini no disponible; usando analista local:', error);
    }
  }

  res.json({ answer: localAnalyst(question, payload.players), source: 'tracker-analytics' });
});

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
