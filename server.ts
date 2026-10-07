import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_PLAYERS, INITIAL_TEAM_REPORT } from './src/data/initialPlayers.js';
import { PlayerProfile, TeamOverviewReport, MatchRecord, LPSnapshot } from './src/types/lol.js';

dotenv.config();

const app = express();
const PORT = 3000;

const RIOT_ROUTES: Record<string, { regional: string; platform: string }> = {
  NA: { regional: 'americas', platform: 'na1' },
  EUW: { regional: 'europe', platform: 'euw1' },
  EUNE: { regional: 'europe', platform: 'eun1' },
  KR: { regional: 'asia', platform: 'kr' },
};

function getRiotRoute(region: string) {
  return RIOT_ROUTES[region?.toUpperCase()] || RIOT_ROUTES.NA;
}


app.use(express.json());

// Initialize Gemini SDK if API key is provided
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize Gemini AI client:', err);
  }
}

// In-memory store
let players: PlayerProfile[] = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
let currentReport: TeamOverviewReport = JSON.parse(JSON.stringify(INITIAL_TEAM_REPORT));
let lastUpdated = Date.now();

// Helper to compute Form and Elo rankings
function recalculateRankings(roster: PlayerProfile[]) {
  // Elo rank: Master (Tier rank 1) > Diamond I > Diamond II > Diamond III > Diamond IV
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
  };
  const divWeight: Record<string, number> = {
    I: 400,
    II: 300,
    III: 200,
    IV: 100,
  };

  const getEloScore = (p: PlayerProfile) => {
    const base = tierWeight[p.tier] || 0;
    const div = divWeight[p.division] || 0;
    return base + div + p.lp;
  };

  // Sort for Elo Rank
  const eloSorted = [...roster].sort((a, b) => getEloScore(b) - getEloScore(a));
  eloSorted.forEach((p, index) => {
    const found = roster.find((x) => x.id === p.id);
    if (found) found.eloRank = index + 1;
  });

  // Sort for Form Rank (Winrate weighted with streak & KDA)
  const getFormScore = (p: PlayerProfile) => {
    // 100% winrate gives huge boost, plus streak * 3, plus avgKda * 2
    return p.winrate * 1.5 + p.streak * 4 + p.avgKda * 2.5 + (p.wins / Math.max(1, p.wins + p.losses)) * 50;
  };

  const formSorted = [...roster].sort((a, b) => getFormScore(b) - getFormScore(a));
  formSorted.forEach((p, index) => {
    const found = roster.find((x) => x.id === p.id);
    if (found) found.formRank = index + 1;
  });
}

// Initial calculation
recalculateRankings(players);

// API Endpoints

// 1. Get current players, rankings, and metadata
app.get('/api/players', (_req, res) => {
  recalculateRankings(players);
  res.json({
    players,
    lastUpdated,
    hasRiotApiKey: Boolean(process.env.RIOT_API_KEY && process.env.RIOT_API_KEY.trim().length > 0),
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    latestReport: currentReport,
  });
});

// 2. Trigger Refresh (Riot API sync when a key is available)
app.post('/api/players/refresh', async (_req, res) => {
  const riotKey = process.env.RIOT_API_KEY?.trim();

  if (!riotKey) {
    lastUpdated = Date.now();
    return res.json({
      success: true,
      lastUpdated,
      usedLiveRiotApi: false,
      players,
      message: 'No hay RIOT_API_KEY configurada. Se mantienen los datos locales/verificados.',
    });
  }

  let updatedPlayers = 0;

  for (const player of players) {
    try {
      const route = getRiotRoute(player.region);
      const accountRes = await fetch(
        `https://${route.regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(player.gameName)}/${encodeURIComponent(player.tagLine)}`,
        { headers: { 'X-Riot-Token': riotKey } }
      );

      if (!accountRes.ok) continue;
      const account = await accountRes.json();

      if (account.gameName) player.gameName = account.gameName;
      if (account.tagLine) player.tagLine = account.tagLine;
      player.riotId = `${player.gameName}#${player.tagLine}`;

      const summonerRes = await fetch(
        `https://${route.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(account.puuid)}`,
        { headers: { 'X-Riot-Token': riotKey } }
      );

      if (!summonerRes.ok) continue;
      const summoner = await summonerRes.json();

      const leagueRes = await fetch(
        `https://${route.platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summoner.id)}`,
        { headers: { 'X-Riot-Token': riotKey } }
      );

      if (!leagueRes.ok) continue;
      const entries = await leagueRes.json();
      const solo = entries.find((entry: { queueType?: string }) => entry.queueType === 'RANKED_SOLO_5x5') || entries[0];

      if (solo) {
        player.tier = solo.tier;
        player.division = solo.rank;
        player.lp = solo.leaguePoints;
        player.wins = solo.wins;
        player.losses = solo.losses;
        player.winrate = Number(((solo.wins / Math.max(1, solo.wins + solo.losses)) * 100).toFixed(1));
        player.statusBadge = `${solo.tier} ${solo.rank} (${solo.leaguePoints} LP)`;
      }

      updatedPlayers += 1;
    } catch (error) {
      console.warn(`Riot refresh failed for ${player.proName}:`, error);
    }
  }

  recalculateRankings(players);
  lastUpdated = Date.now();

  res.json({
    success: true,
    lastUpdated,
    usedLiveRiotApi: updatedPlayers > 0,
    players,
    message: updatedPlayers > 0
      ? `Datos de Riot actualizados para ${updatedPlayers} jugador(es).`
      : 'Riot API no devolvió datos actualizables; se mantienen los datos actuales.',
  });
});


// 3. Simulate a match / Record new game session for demonstration & progression
app.post('/api/players/simulate-game', (req, res) => {
  const { playerId, win, championName, kills, deaths, assists, cs, lpChange } = req.body;
  const player = players.find((p) => p.id === playerId);

  if (!player) {
    return res.status(404).json({ error: 'Jugador no encontrado' });
  }

  const toFiniteNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const k = Math.max(0, toFiniteNumber(kills, 0));
  const d = Math.max(0, toFiniteNumber(deaths, 0));
  const a = Math.max(0, toFiniteNumber(assists, 0));
  const newCs = Math.max(0, toFiniteNumber(cs, 0));
  const matchKda = Number(((k + a) / Math.max(1, d)).toFixed(2));
  const isWin = Boolean(win);
  const champ = typeof championName === 'string' && championName.trim()
    ? championName.trim()
    : player.champions[0]?.championName || 'Ahri';

  if (isWin) {
    player.wins += 1;
    player.streak = player.streak > 0 ? player.streak + 1 : 1;
  } else {
    player.losses += 1;
    player.streak = player.streak < 0 ? player.streak - 1 : -1;
  }

  const totalGames = player.wins + player.losses;
  player.winrate = Number(((player.wins / Math.max(1, totalGames)) * 100).toFixed(1));

  const rawLpChange = toFiniteNumber(lpChange, isWin ? 20 : -16);
  const deltaLp = isWin ? Math.abs(rawLpChange) : -Math.abs(rawLpChange);
  let nextLp = player.lp + deltaLp;

  if (nextLp >= 100 && player.tier === 'DIAMOND' && player.division === 'I') {
    player.tier = 'MASTER';
    player.division = 'I';
    nextLp -= 100;
  } else if (nextLp >= 100 && player.tier === 'DIAMOND' && player.division === 'II') {
    player.division = 'I';
    nextLp -= 100;
  }

  player.lp = Math.max(0, nextLp);
  player.statusBadge = `${player.tier} ${player.division} (${player.lp} LP)`;

  const newMatch: MatchRecord = {
    matchId: `NA1_${Date.now()}`,
    gameCreation: Date.now(),
    gameDurationSeconds: 1560 + Math.floor(Math.random() * 300),
    queueType: 'Ranked Solo/Duo',
    win: isWin,
    championName: champ,
    championId: champ,
    champLevel: 15,
    role: player.role,
    kills: k,
    deaths: d,
    assists: a,
    kda: matchKda,
    cs: newCs,
    csPerMin: Number((newCs / 26).toFixed(1)),
    killParticipationPct: Math.min(95, Math.floor(55 + Math.random() * 30)),
    damageDealt: Math.floor(18000 + Math.random() * 14000),
    damagePct: Math.floor(25 + Math.random() * 12),
    visionScore: Math.floor(20 + Math.random() * 40),
    spells: player.role === 'JUNGLE'
      ? ['SummonerFlash', 'SummonerSmite']
      : ['SummonerFlash', 'SummonerTeleport'],
    items: [3078, 3053, 3111, 3071, 0, 0, 3364],
    laneOpponentChamp: 'Opponent',
    tags: isWin ? (matchKda > 10 ? ['MVP', 'Hypercarry'] : ['MVP']) : (matchKda > 3 ? ['ACE'] : []),
  };

  player.recentMatches.unshift(newMatch);
  player.recentMatches = player.recentMatches.slice(0, 20);

  let champion = player.champions.find((c) => c.championName === champ);
  if (!champion) {
    champion = {
      championName: champ,
      championId: champ,
      games: 0,
      wins: 0,
      losses: 0,
      winrate: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      kda: 0,
      csPerMin: 0,
    };
    player.champions.unshift(champion);
  }

  champion.games += 1;
  champion.wins += isWin ? 1 : 0;
  champion.losses += isWin ? 0 : 1;
  champion.kills += k;
  champion.deaths += d;
  champion.assists += a;
  champion.winrate = Number(((champion.wins / champion.games) * 100).toFixed(1));
  champion.kda = Number(((champion.kills + champion.assists) / Math.max(1, champion.deaths)).toFixed(1));
  champion.csPerMin = newMatch.csPerMin;

  const recent = player.recentMatches;
  player.avgKda = Number((recent.reduce((sum, match) => sum + match.kda, 0) / Math.max(1, recent.length)).toFixed(1));
  player.avgKills = Number((recent.reduce((sum, match) => sum + match.kills, 0) / Math.max(1, recent.length)).toFixed(1));
  player.avgDeaths = Number((recent.reduce((sum, match) => sum + match.deaths, 0) / Math.max(1, recent.length)).toFixed(1));
  player.avgAssists = Number((recent.reduce((sum, match) => sum + match.assists, 0) / Math.max(1, recent.length)).toFixed(1));
  player.avgCsPerMin = Number((recent.reduce((sum, match) => sum + match.csPerMin, 0) / Math.max(1, recent.length)).toFixed(1));
  player.avgKillParticipationPct = Number((recent.reduce((sum, match) => sum + match.killParticipationPct, 0) / Math.max(1, recent.length)).toFixed(1));

  player.snapshots.push({
    timestamp: Date.now(),
    tier: player.tier,
    division: player.division,
    lp: player.lp,
    wins: player.wins,
    losses: player.losses,
    note: isWin ? `Victoria con ${champ} (+${deltaLp} LP)` : `Derrota con ${champ} (${deltaLp} LP)`,
  });

  recalculateRankings(players);
  lastUpdated = Date.now();

  res.json({
    success: true,
    player,
    players,
    message: `Partida registrada para ${player.proName} (${isWin ? 'Victoria' : 'Derrota'}). Rango actual: ${player.tier} ${player.division} ${player.lp} LP.`,
  });
});


// 4. Update Riot ID for player
app.post('/api/players/update-account', (req, res) => {
  const { playerId, riotId, region } = req.body;
  const player = players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });

  if (riotId && riotId.includes('#')) {
    const [name, tag] = riotId.split('#');
    player.riotId = riotId.trim();
    player.gameName = name.trim();
    player.tagLine = tag.trim();
  }
  if (region) {
    player.region = region.trim();
  }

  res.json({ success: true, player });
});

// 5. Generate Analyst Report (Team or Single Player)
app.post('/api/analyst/report', async (req, res) => {
  const { playerId } = req.body;

  // Prepare context data
  const playersSummary = players.map((p) => ({
    proName: p.proName,
    riotId: p.riotId,
    role: p.role,
    tier: `${p.tier} ${p.division} ${p.lp} LP`,
    record: `${p.wins}W - ${p.losses}L (${p.winrate}% WR)`,
    streak: p.streak,
    avgKda: p.avgKda,
    csPerMin: p.avgCsPerMin,
    formRank: p.formRank,
    eloRank: p.eloRank,
    champions: p.champions.map((c) => `${c.championName} (${c.wins}-${c.losses}, ${c.kda} KDA)`).join(', '),
  }));

  if (aiClient) {
    try {
      const prompt = playerId
        ? `Eres un analista profesional de League of Legends para el equipo MAD Lions KOI en su bootcamp de Norteamérica (NA).
Analiza a fondo al jugador: ${playerId}
Datos del equipo actual:
${JSON.stringify(playersSummary, null, 2)}
Escribe un reporte analítico en español, profesional y directo al grano, evaluando:
1. Rendimiento en sus últimas ranked partidas y winrate
2. Campeones prioritarios y maestría (KDA, CS/min)
3. Trayectoria en el ladder (LP acumulado)
4. Fortalezas detectadas y aspectos a vigilar de cara a scrims y competición oficial.`
        : `Eres un analista profesional de League of Legends para el equipo MAD Lions KOI en su bootcamp de Norteamérica (NA).
Analiza el estado general de los 5 jugadores (Myrwn, Elyoya, Jojopyun, Supa, Alvaro).
Datos actuales:
${JSON.stringify(playersSummary, null, 2)}
Proporciona:
1. Resumen ejecutivo de la sesión de bootcamp
2. Comparación explícita entre "Ranking de Forma" (momentum y racha) vs "Ranking de Elo" (posición en el ladder)
3. Rendimiento de la botlane (Supa y Alvaro) y del núcleo Jojopyun / Elyoya
4. Conclusiones y directrices para el cuerpo técnico (coach takeaways).`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const reportText = aiResponse.text || '';
      return res.json({
        report: reportText,
        source: 'gemini',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('Gemini report generation error, falling back to algorithmic report:', err);
    }
  }

  // Algorithmic Fallback Report
  if (playerId) {
    const p = players.find((x) => x.id === playerId);
    if (!p) return res.status(404).json({ error: 'Jugador no encontrado' });

    const report = `### Reporte de Rendimiento: ${p.proName} (${p.role}) - ${p.riotId}

**1. Estado Actual en el Ladder:**
* Rango: **${p.tier} ${p.division}, ${p.lp} LP** (${p.statusBadge})
* Balance reciente: **${p.wins} Victorias - ${p.losses} Derrotas** (${p.winrate}% Winrate)
* Racha actual: **${p.streak > 0 ? `+${p.streak} Victorias consecutivas` : `${Math.abs(p.streak)} Derrotas`}**

**2. Telemetría y Estadísticas Clave:**
* KDA Promedio: **${p.avgKda}** (${p.avgKills} / ${p.avgDeaths} / ${p.avgAssists})
* Farmeo / Ritmo: **${p.avgCsPerMin} CS/min**
* Participación en Kills: **${p.avgKillParticipationPct}%**

**3. Pool de Campeones Clave:**
${p.champions.map((c) => `* **${c.championName}**: ${c.games} partidas (${c.wins}-${c.losses}, ${c.winrate}% WR) | KDA: ${c.kda} | CS/min: ${c.csPerMin}`).join('\n')}

**4. Lectura Táctica del Analista:**
${p.analystSummary}
Su impacto en las partidas analizadas muestra una capacidad de snowball muy alta en el servidor de NA. Se recomienda mantener su confort con sus picks dominantes y seguir testeando matchups prioritarios.`;

    return res.json({ report, source: 'analytic-engine', timestamp: Date.now() });
  }

  // General 5 players report
  const formRanking = [...players].sort((a, b) => a.formRank - b.formRank);
  const eloRanking = [...players].sort((a, b) => a.eloRank - b.eloRank);
  const botlane = players.filter((p) => p.role === 'ADC' || p.role === 'SUPPORT');
  const botlaneWins = botlane.reduce((sum, p) => sum + p.wins, 0);
  const botlaneLosses = botlane.reduce((sum, p) => sum + p.losses, 0);

  const generalReport = `### Reporte General del Bootcamp

**1. Estado actual:**
${players.map((p) => `* **${p.proName}** (${p.role} · \`${p.riotId}\`): ${p.tier} ${p.division} ${p.lp} LP | ${p.wins}-${p.losses} (${p.winrate}% WR) | KDA ${p.avgKda}`).join('\n')}

**2. Ranking de Forma:**
${formRanking.map((p, i) => `${i + 1}. ${p.proName} (${p.winrate}% WR, ${p.wins}-${p.losses}, KDA ${p.avgKda})`).join('\n')}

**3. Ranking de Elo:**
${eloRanking.map((p, i) => `${i + 1}. ${p.proName} (${p.tier} ${p.division} ${p.lp} LP)`).join('\n')}

**4. Botlane:**
Balance combinado: **${botlaneWins}-${botlaneLosses}**.
`;

  return res.json({ report: generalReport, source: 'analytic-engine', timestamp: Date.now() });
});

// 6. Interactive Analyst Q&A ("Preguntar al analista")
app.post('/api/analyst/ask', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Pregunta requerida' });
  }

  const cleanQuery = question.toLowerCase().trim();

  // If Gemini client is active, answer via LLM
  if (aiClient) {
    try {
      const rosterContext = players.map((p) => ({
        name: p.proName,
        account: p.riotId,
        role: p.role,
        tier: `${p.tier} ${p.division} ${p.lp} LP`,
        wins: p.wins,
        losses: p.losses,
        winrate: `${p.winrate}%`,
        streak: p.streak,
        kda: p.avgKda,
        csPerMin: p.avgCsPerMin,
        formRank: p.formRank,
        eloRank: p.eloRank,
        bestChamps: p.champions.map((c) => `${c.championName} (${c.wins}-${c.losses}, ${c.kda} KDA)`).join(', '),
      }));

      const systemPrompt = `Eres el Analista Principal de League of Legends para el equipo profesional MAD Lions KOI en su bootcamp de Norteamérica (NA).
Dispones de los datos exactos y actualizados de los 5 jugadores:
${JSON.stringify(rosterContext, null, 2)}

Reglas de respuesta:
- Habla en español de forma precisa, experta y directa, como un auténtico analista de LEC / LCS / Worlds.
- Cita los datos reales (LP, Winrate, KDA, campeones y rachas).
- Si preguntan por los 5, compara sus estados y destaca tanto el Ranking de Forma como el de Elo.
- Sé claro, conciso y constructivo.`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }, { text: `Pregunta del usuario: "${question}"` }] },
        ],
      });

      return res.json({
        answer: aiResponse.text || 'Sin respuesta generada.',
        source: 'gemini',
      });
    } catch (err) {
      console.warn('Gemini chat error, continuing to expert fallback:', err);
    }
  }

  // Fallback intelligent pattern matching LoL analyst
  let answer = '';

  if (cleanQuery.includes('reporte de los 5') || cleanQuery.includes('como van') || cleanQuery.includes('cómo van')) {
    answer = `Actualmente los cinco jugadores de MAD Lions KOI están en un momento excelente en el bootcamp de NA:

1. **Jojopyun** (\`${players.find((p) => p.id === 'jojopyun')?.riotId}\`): Diamante II 27 LP (8-0, 100% WR). Está volando con Sylas (16.0 KDA) y Viktor (11.0 KDA). Es el número 1 en forma del grupo.
2. **Alvaro** (\`${players.find((p) => p.id === 'alvaro')?.riotId}\`): Diamante I 97 LP (13-1, 92.9% WR). A una sola victoria de promocionar a Master.
3. **Supa** (\`${players.find((p) => p.id === 'supa')?.riotId}\`): Master 62 LP (15-2, 88.2% WR). Líder absoluto en el ladder con su Draven (7-2) y 10.1 CS/min.
4. **Elyoya** (\`${players.find((p) => p.id === 'elyoya')?.riotId}\`): Diamante I 57 LP (13-2, 86.7% WR). Gran volumen de juego y control de objetivos con Xin Zhao (4-0).
5. **Myrwn** (\`${players.find((p) => p.id === 'myrwn')?.riotId}\`): Diamante II 97 LP (11-2, 84.6% WR). A 3 LP de subir a Diamante I con Gwen (100% WR).

**Ranking de Forma:** Jojopyun > Alvaro > Supa > Elyoya > Myrwn
**Ranking de Elo:** Supa > Alvaro > Elyoya > Myrwn > Jojopyun`;
  } else if (cleanQuery.includes('jojo') || cleanQuery.includes('jojopyun')) {
    const jojo = players.find((p) => p.id === 'jojopyun')!;
    answer = `**Jojopyun** está en racha impecable: **${jojo.wins}-${jojo.losses} (100% Winrate)** en Diamante II (${jojo.lp} LP).
Ha jugado 5 campeones distintos en sus 8 partidas:
* **Sylas**: 2-0, con un descomunal KDA de 16.0
* **Viktor**: 2-0, KDA de 11.0 y 9.8 CS/min
* **Twisted Fate**: 1-0, KDA de 18.0
* **Ryze**: 2-0, KDA de 8.3
* **Jayce**: 1-0, KDA de 7.0
Es sin duda el jugador con el pico de rendimiento individual más alto del bootcamp ahora mismo.`;
  } else if (cleanQuery.includes('supa')) {
    const supa = players.find((p) => p.id === 'supa')!;
    answer = `**Supa** es el faro del ladder para el equipo:
* Rango: **Master 62 LP** (el único del equipo en Master por ahora)
* Balance: **15-2 (88.2% WR)**
* Farmeo medio: **10.1 CS/min**
* Destaca especialmente su **Draven (7-2)** como pick identitario de presión, y mantiene un 100% de victorias con **Aphelios (4-0)** y **Kai'Sa (3-0)**.`;
  } else if (cleanQuery.includes('alvaro') || cleanQuery.includes('álvaro')) {
    const alvaro = players.find((p) => p.id === 'alvaro')!;
    answer = `**Alvaro** está intratable:
* Rango: **Diamante I 97 LP** (¡a tan solo 3 LP de entrar en Master!)
* Balance: **13-1 (92.9% WR)**
* KDA: **5.9** con una participación en muertes del 76.8%
* Su **Thresh** está invicto (4-0, 6.1 KDA) y ha aportado una gran versatilidad con picks como Camille soporte, Zoe, Elise y Alistar.`;
  } else if (cleanQuery.includes('elyoya') || cleanQuery.includes('yoya')) {
    const yoya = players.find((p) => p.id === 'elyoya')!;
    answer = `**Elyoya** (\`${yoya.riotId}\`):
* Rango: **Diamante I 57 LP**
* Balance: **13-2 (86.7% WR)**
* KDA: **5.8**
* Es el jugador con mayor volumen de partidas analizadas. Su **Xin Zhao** (4-0) y **Viego** (4-1) están marcando el ritmo de las partidas en NA, asegurando más del 74% de los primeros dragones.`;
  } else if (cleanQuery.includes('myrwn')) {
    const myrwn = players.find((p) => p.id === 'myrwn')!;
    answer = `**Myrwn** (\`${myrwn.riotId}\`):
* Rango: **Diamante II 97 LP** (a una victoria de subir a Diamante I)
* Balance: **11-2 (84.6% WR)**
* KDA: **4.8** con 8.5 CS/min
* Su **Gwen** está al 100% de victorias (4-0, 6.6 KDA) y su **Rumble** (3-1) aporta gran daño en peleas de equipo. Aunque arrancó más abajo en MMR que Supa o Alvaro, su ritmo de escalada es vertiginoso.`;
  } else if (cleanQuery.includes('bot') || cleanQuery.includes('botlane') || cleanQuery.includes('duo')) {
    answer = `La botlane de MAD Lions KOI (Supa + Alvaro) está dominando las rankeds de NA de manera abrumadora:
* Balance combinado: **28 victorias y solo 3 derrotas** (>90% WR en el carril inferior).
* Supa está ya en **Master 62 LP** y Alvaro en **Diamante I 97 LP** a punto de unirse a él.
* La combinación de presión de Draven/Aphelios con el control de mapa de Thresh y Alistar está decantando casi todas las partidas antes del minuto 25.`;
  } else if (cleanQuery.includes('kda') || cleanQuery.includes('mejor')) {
    answer = `El mejor KDA del equipo lo ostenta **Jojopyun con un promedio de 10.4 KDA**, seguido por **Alvaro (5.9)** y **Elyoya (5.8)**. En partidas individuales, Jojopyun llegó a registrar 19.0 KDA con Sylas y 18.0 con Twisted Fate.`;
  } else {
    answer = `Los 5 jugadores de MAD Lions KOI en el bootcamp de NA acumulan un impresionante balance global de ~89.5% de victorias. Jojopyun lidera la forma invicto con 8-0, mientras que Supa (Master 62 LP) y Alvaro (D1 97 LP) comandan el avance en el ladder. ¿Quieres profundizar en las estadísticas de algún jugador en específico?`;
  }

  return res.json({
    answer,
    source: 'analytic-engine',
  });
});

// Full-Stack Vite Integration
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
    console.log(`LoL Bootcamp Tracker server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
