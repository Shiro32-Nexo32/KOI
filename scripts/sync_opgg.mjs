#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, 'data', 'monitored.json');
const LIVE = path.join(ROOT, 'data', 'live.json');
const MCP_URL = 'https://mcp-api.op.gg/mcp';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const int = (v, d = 0) => Math.trunc(num(v, d));

function walk(value, visit) {
  if (Array.isArray(value)) return value.forEach((x) => walk(x, visit));
  if (value && typeof value === 'object') {
    visit(value);
    Object.values(value).forEach((x) => walk(x, visit));
  }
}

function parseSse(text) {
  const matches = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim();
      if (data) matches.push(data);
    }
  }
  for (let i = matches.length - 1; i >= 0; i--) {
    try { return JSON.parse(matches[i]); } catch {}
  }
  return null;
}

function parseHttpBody(text, contentType) {
  if (!text) return null;
  if ((contentType || '').includes('text/event-stream')) return parseSse(text);
  try { return JSON.parse(text); } catch {}
  return null;
}

async function postMcp(body, sessionId = null) {
  const headers = {
    'Accept': 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const nextSession = response.headers.get('mcp-session-id') || sessionId;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        'OP.GG MCP HTTP ' + response.status + ': ' + text.slice(0, 500),
      );
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split(/\n\n/);
        buffer = events.pop() || '';

        for (const event of events) {
          const dataLines = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim());

          for (const data of dataLines) {
            if (!data) continue;

            try {
              const message = JSON.parse(data);
              if (
                body.id === undefined ||
                message.id === body.id ||
                message.error
              ) {
                await reader.cancel();
                return {
                  sessionId: nextSession,
                  message,
                };
              }
            } catch {
              // Ignore non-JSON SSE frames.
            }
          }
        }
      }

      return {
        sessionId: nextSession,
        message: null,
      };
    }

    const text = await response.text();
    let message = null;
    if (text.trim()) {
      try {
        message = JSON.parse(text);
      } catch {
        message = null;
      }
    }

    return {
      sessionId: nextSession,
      message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function createMcpSession() {
  const initialized = await postMcp({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'koi-tracker', version: '1.0.0' },
    },
  });

  if (!initialized.message?.result) {
    throw new Error(
      'OP.GG MCP no respondió correctamente a initialize: ' +
        JSON.stringify(initialized.message),
    );
  }

  await postMcp(
    {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    },
    initialized.sessionId,
  );

  return initialized.sessionId;
}

async function mcpRequest(sessionId, id, method, params = {}) {
  const response = await postMcp(
    { jsonrpc: '2.0', id, method, params },
    sessionId,
  );
  if (response.message?.error) {
    throw new Error(
      method + ' error: ' + JSON.stringify(response.message.error),
    );
  }
  return response.message?.result;
}

function schemaProperties(tool) {
  return tool?.inputSchema?.properties || {};
}

function pickProperty(tool, names) {
  const properties = schemaProperties(tool);
  return names.find((name) => properties[name]) || null;
}

function pickEnum(tool, names, wanted) {
  const properties = schemaProperties(tool);
  for (const name of names) {
    const enumValues = properties[name]?.enum;
    if (!Array.isArray(enumValues) || !enumValues.length) continue;
    const hit = enumValues.find((value) =>
      String(value).toLowerCase().includes(wanted),
    );
    if (hit !== undefined) return hit;
  }
  return null;
}

function setFirst(args, tool, names, value) {
  const key = pickProperty(tool, names);
  if (key) args[key] = value;
}

function desiredFields(tool) {
  const key = pickProperty(tool, ['desired_output_fields']);
  if (!key) return null;

  if (tool.name === 'lol_get_summoner_profile') {
    return [
      'data.summoner.{acct_id,game_name,id,level,name,profile_image_url,puuid,region,summoner_id,tagline,updated_at}',
      'data.summoner.league_stats[].{game_type,lose,win,updated_at}',
      'data.summoner.league_stats[].tier_info.{division,lp,tier}',
      'data.summoner.ranked_most_champions.my_champion_stats[].{champion_name,id,play,win,lose}',
      'data.summoner.ranked_most_champions.{game_type,play,win,lose}'
    ];
  }

  if (tool.name === 'lol_list_summoner_matches') {
    return [
      'data.game_history[].{created_at,game_length_second,game_type,id}',
      'data.game_history[].participants[].{champion_id,champion_name,items[],items_names[],position,spells[],team_key}',
      'data.game_history[].participants[].summoner.{game_name,puuid,tagline}',
      'data.game_history[].participants[].stats.{assist,champion_level,death,gold_earned,kill,minion_kill,op_score,result,total_damage_dealt_to_champions,total_damage_taken,total_heal,vision_wards_bought_in_game,ward_place}',
      'data.game_history[].teams[].game_stat.{champion_kill,gold_earned,is_win}'
    ];
  }

  return ['data'];
}

function buildArgs(tool, account, identifier = null) {
  const args = {};

  setFirst(
    args,
    tool,
    ['region', 'region_code', 'regionCode', 'server'],
    pickEnum(tool, ['region', 'region_code', 'regionCode', 'server'], 'na') || 'na',
  );

  setFirst(
    args,
    tool,
    ['game_name', 'gameName', 'summoner_name', 'summonerName', 'name'],
    account.gameName,
  );

  setFirst(
    args,
    tool,
    ['tagline', 'tag_line', 'tagLine', 'tag'],
    account.tagLine,
  );

  setFirst(
    args,
    tool,
    ['riot_id', 'riotId', 'riotID'],
    account.gameName + '#' + account.tagLine,
  );

  if (identifier) {
    setFirst(
      args,
      tool,
      ['summoner_id', 'summonerId', 'id', 'puuid', 'player_puuid', 'playerPuuid'],
      identifier,
    );
  }

  const matchType =
    pickEnum(
      tool,
      ['game_type', 'gameType', 'queue', 'queue_type'],
      'solo',
    ) ||
    pickEnum(
      tool,
      ['game_type', 'gameType', 'queue', 'queue_type'],
      'rank',
    );

  if (matchType) {
    setFirst(
      args,
      tool,
      ['game_type', 'gameType', 'queue', 'queue_type'],
      matchType,
    );
  }

  setFirst(args, tool, ['limit', 'count', 'results', 'game_count'], 20);

  const fields = desiredFields(tool);
  if (fields !== null) args.desired_output_fields = fields;

  for (const required of tool?.inputSchema?.required || []) {
    if (args[required] !== undefined) continue;

    if (required === 'desired_output_fields') {
      args[required] = desiredFields(tool) || ['data'];
      continue;
    }

    const props = schemaProperties(tool);
    const schema = props[required] || {};

    if (Array.isArray(schema.enum) && schema.enum.length) {
      const preferred = schema.enum.find((value) =>
        String(value).toLowerCase().includes('solo'),
      ) ??
        schema.enum.find((value) =>
          String(value).toLowerCase().includes('rank'),
        ) ??
        schema.enum.find((value) =>
          String(value).toLowerCase() === 'na',
        ) ??
        schema.enum[0];

      args[required] = preferred;
      continue;
    }

    throw new Error(
      'No sé rellenar el parámetro requerido "' +
        required +
        '" de ' +
        tool.name +
        '. Schema=' +
        JSON.stringify(tool.inputSchema),
    );
  }

  return args;
}

function resultData(result) {
  if (result?.structuredContent) return result.structuredContent;

  for (const block of result?.content || []) {
    if (block?.type === 'json' && block.json) return block.json;
    if (block?.type === 'text' && typeof block.text === 'string') {
      try { return JSON.parse(block.text); } catch {}
    }
  }

  return result;
}

function findRank(payload) {
  if (typeof payload === 'string') {
    const match = payload.match(
      /SOLORANKED[\s\S]*?TierInfo\("([^"]+)",\s*(null|\\d+),\s*(\\d+)\)[\s\S]*?(\\d+),\s*(\\d+),\s*null\)/,
    );

    if (match) {
      const [, tier, rawDivision, lp, wins, losses] = match;
      const divisionMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV' };
      const division =
        divisionMap[String(rawDivision)] ??
        (rawDivision === 'null' ? 'I' : String(rawDivision).trim().toUpperCase());

      return {
        tier: String(tier).toUpperCase(),
        division,
        lp: int(lp),
        wins: int(wins),
        losses: int(losses),
        winrate: Number(
          ((int(wins) / Math.max(1, int(wins) + int(losses))) * 100).toFixed(1),
        ),
      };
    }
  }

  const summoner =
    payload?.data?.summoner ??
    payload?.summoner ??
    payload?.data?.data?.summoner ??
    null;

  const leagueStats = Array.isArray(summoner?.league_stats)
    ? summoner.league_stats
    : Array.isArray(summoner?.leagueStats)
      ? summoner.leagueStats
      : [];

  const solo =
    leagueStats.find((entry) =>
      String(entry?.game_type ?? '').toUpperCase().includes('SOLORANKED'),
    ) ??
    leagueStats.find((entry) =>
      String(entry?.game_type ?? '').toUpperCase().includes('SOLO'),
    ) ??
    leagueStats.find((entry) => entry?.tier_info);

  if (solo?.tier_info) {
    const info = solo.tier_info;
    const divisionMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
    const wins = int(solo.win);
    const losses = int(solo.lose);

    return {
      tier: String(info.tier ?? 'UNRANKED').toUpperCase(),
      division: divisionMap[info.division] ?? String(info.division ?? 'I').toUpperCase(),
      lp: int(info.lp),
      wins,
      losses,
      winrate: Number(
        ((wins / Math.max(1, wins + losses)) * 100).toFixed(1),
      ),
    };
  }

  return null;
}

function extractIdentifier(payload) {
  let found = null;
  walk(payload, (object) => {
    if (found) return;
    for (const key of [
      'summoner_id',
      'summonerId',
      'puuid',
      'acct_id',
      'id',
    ]) {
      if (object[key] !== undefined && object[key] !== null) {
        found = String(object[key]);
        break;
      }
    }
  });
  return found;
}

function matchObjects(payload) {
  const candidates = [];
  walk(payload, (object) => {
    const identity =
      object.game_id ??
      object.gameId ??
      object.match_id ??
      object.matchId ??
      object.created_at ??
      object.game_creation ??
      object.gameCreation;

    const details =
      object.my_data ??
      object.myData ??
      object.player ??
      object.stats ??
      object.champion;

    if (identity !== undefined && details !== undefined) candidates.push(object);
  });

  const unique = new Map();

  for (const item of candidates) {
    const key = String(
      item.game_id ??
        item.gameId ??
        item.match_id ??
        item.matchId ??
        item.created_at ??
        item.game_creation ??
        item.gameCreation,
    );
    if (!unique.has(key)) unique.set(key, item);
  }

  return [...unique.values()].slice(0, 20);
}

function timestamp(game) {
  const value =
    game.created_at ??
    game.game_creation ??
    game.gameCreation ??
    game.timestamp ??
    Date.now();

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  const n = int(value, Date.now());
  return n < 1e10 ? n * 1000 : n;
}

function toMatch(game, role) {
  const player =
    game.my_data ??
    game.myData ??
    game.player ??
    {};

  const stats =
    player.stats ??
    game.stats ??
    {};

  const champion =
    player.champion ??
    game.champion ??
    {};

  const duration = int(
    game.game_length_second ??
      game.gameLengthSecond ??
      game.duration ??
      game.gameDurationSeconds,
  );

  const kills = int(stats.kill ?? stats.kills);
  const deaths = int(stats.death ?? stats.deaths);
  const assists = int(stats.assist ?? stats.assists);
  const cs = int(
    stats.minion_kill ??
      stats.minionKill ??
      stats.cs ??
      stats.total_minions_killed ??
      stats.totalMinionsKilled,
  );

  const result = String(
    stats.result ??
      stats.outcome ??
      stats.win ??
      game.result ??
      game.outcome ??
      game.win ??
      '',
  ).toLowerCase();

  const win = ['win', 'won', 'victory', 'true', '1'].includes(result);
  const id =
    game.game_id ??
    game.gameId ??
    game.match_id ??
    game.matchId ??
    'OPGG_' + timestamp(game);

  return {
    matchId: String(id),
    gameCreation: timestamp(game),
    gameDurationSeconds: duration,
    queueType: String(
      game.game_type ??
        game.gameType ??
        game.queue_type ??
        game.queueType ??
        'Ranked Solo/Duo',
    ),
    win,
    championName: String(
      champion.name ??
        champion.champion_name ??
        game.champion_name ??
        game.championName ??
        'Desconocido',
    ),
    championId: String(
      champion.id ??
        champion.key ??
        game.champion_id ??
        game.championId ??
        '0',
    ),
    champLevel: int(stats.level ?? stats.champ_level ?? stats.champLevel),
    role: String(
      player.position ??
        player.role ??
        game.position ??
        game.role ??
        role,
    ).toUpperCase(),
    kills,
    deaths,
    assists,
    kda: Number(
      ((kills + assists) / Math.max(1, deaths)).toFixed(2),
    ),
    cs,
    csPerMin: duration
      ? Number((cs / Math.max(1, duration / 60)).toFixed(1))
      : 0,
    killParticipationPct: Number(
      num(
        stats.kill_participation ??
          stats.killParticipation ??
          game.killParticipation,
        0,
      ).toFixed(1),
    ),
    damageDealt: int(
      stats.total_damage_to_champions ??
        stats.damage_to_champions ??
        stats.damage ??
        game.damageDealt,
    ),
    damagePct: Number(
      num(stats.damage_share ?? stats.damage_pct ?? game.damagePct, 0).toFixed(1),
    ),
    visionScore: int(
      stats.vision_score ??
        stats.visionScore ??
        game.visionScore,
    ),
    spells: Array.isArray(player.spells)
      ? player.spells.slice(0, 2).map(String)
      : ['', ''],
    items: Array.isArray(player.items)
      ? player.items.slice(0, 7).map((item) =>
          int(
            typeof item === 'object'
              ? item.id ?? item.item_id ?? item.itemId
              : item,
          ),
        )
      : [],
    tags: [],
  };
}

function championStats(matches) {
  const map = new Map();

  for (const match of matches) {
    const row =
      map.get(match.championName) ?? {
        championName: match.championName,
        championId: match.championId,
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

    row.games += 1;
    row.wins += match.win ? 1 : 0;
    row.losses += match.win ? 0 : 1;
    row.kills += match.kills;
    row.deaths += match.deaths;
    row.assists += match.assists;
    row.csPerMin += match.csPerMin;

    map.set(match.championName, row);
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      winrate: Number(
        ((row.wins / Math.max(1, row.games)) * 100).toFixed(1),
      ),
      kda: Number(
        ((row.kills + row.assists) / Math.max(1, row.deaths)).toFixed(1),
      ),
      csPerMin: Number(
        (row.csPerMin / Math.max(1, row.games)).toFixed(1),
      ),
    }))
    .sort((a, b) => b.games - a.games || b.winrate - a.winrate);
}

function streak(matches) {
  if (!matches.length) return 0;
  const first = Boolean(matches[0].win);
  let count = 0;
  for (const match of matches) {
    if (Boolean(match.win) !== first) break;
    count += 1;
  }
  return first ? count : -count;
}

function playerFrom(account, rank, matches, previous) {
  const recent = matches.slice(0, 20);
  const average = (field) =>
    Number(
      (
        recent.reduce((sum, match) => sum + num(match[field]), 0) /
        Math.max(1, recent.length)
      ).toFixed(1),
    );

  const current = {
    ...(previous ?? {}),
    id: account.id,
    proName: account.proName,
    realName: account.realName,
    riotId: account.gameName + '#' + account.tagLine,
    gameName: account.gameName,
    tagLine: account.tagLine,
    region: 'NA',
    team: 'KOI / MKOI',
    role: account.role,
    profileIconId: previous?.profileIconId ?? 588,
    tier: rank.tier,
    division: rank.division,
    lp: rank.lp,
    wins: rank.wins,
    losses: rank.losses,
    winrate: rank.winrate,
    streak: streak(recent),
    avgKda: average('kda'),
    avgKills: average('kills'),
    avgDeaths: average('deaths'),
    avgAssists: average('assists'),
    avgCsPerMin: average('csPerMin'),
    avgKillParticipationPct: average('killParticipationPct'),
    champions: championStats(recent),
    recentMatches: recent,
    statusBadge: rank.tier + ' ' + rank.division + ' (' + rank.lp + ' LP)',
    analystSummary:
      account.proName +
      ': ' +
      rank.tier +
      ' ' +
      rank.division +
      ' ' +
      rank.lp +
      ' LP · ' +
      recent.length +
      ' partidas consultadas · ' +
      rank.winrate +
      '% WR · KDA medio ' +
      average('kda') +
      '.',
    snapshots: previous?.snapshots ?? [],
    formRank: previous?.formRank ?? 0,
    eloRank: previous?.eloRank ?? 0,
  };

  const oldSignature = previous
    ? [previous.tier, previous.division, previous.lp].join(':')
    : null;

  const newSignature = [current.tier, current.division, current.lp].join(':');

  if (oldSignature !== newSignature) {
    current.snapshots = [
      ...current.snapshots,
      {
        timestamp: Date.now(),
        tier: current.tier,
        division: current.division,
        lp: current.lp,
        wins: current.wins,
        losses: current.losses,
        note: 'Sincronización automática desde OP.GG',
      },
    ].slice(-250);
  }

  return current;
}

function recalculateRankings(players) {
  const tierWeight = {
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

  const divisionWeight = { I: 400, II: 300, III: 200, IV: 100 };

  const elo = (player) =>
    (tierWeight[player.tier] ?? 0) +
    (divisionWeight[player.division] ?? 0) +
    num(player.lp);

  const form = (player) =>
    num(player.winrate) * 1.5 +
    num(player.streak) * 4 +
    num(player.avgKda) * 2.5 +
    (num(player.wins) /
      Math.max(1, num(player.wins) + num(player.losses))) *
      50;

  [...players]
    .sort((a, b) => elo(b) - elo(a))
    .forEach((player, index) => {
      player.eloRank = index + 1;
    });

  [...players]
    .sort((a, b) => form(b) - form(a))
    .forEach((player, index) => {
      player.formRank = index + 1;
    });
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG, 'utf8'));
  const previous = JSON.parse(await fs.readFile(LIVE, 'utf8')).players ?? [];

  const sessionId = await createMcpSession();

  const toolsResult = await mcpRequest(
    sessionId,
    2,
    'tools/list',
    {},
  );

  const tools = toolsResult?.tools ?? [];

  const profileTool = tools.find(
    (tool) => tool.name === 'lol_get_summoner_profile',
  );

  const matchesTool = tools.find(
    (tool) => tool.name === 'lol_list_summoner_matches',
  );

  if (!profileTool || !matchesTool) {
    throw new Error(
      'No se encontraron los tools de OP.GG MCP. Tools=' +
        tools.map((tool) => tool.name).join(', '),
    );
  }

  console.log(
    'Profile schema=' + JSON.stringify(profileTool.inputSchema),
  );
  console.log(
    'Matches schema=' + JSON.stringify(matchesTool.inputSchema),
  );

  const previousMap = new Map(
    previous.map((player) => [player.id, player]),
  );

  const players = [];
  const errors = [];

  for (const account of config.players) {
    try {
      const profileArgs = buildArgs(profileTool, account);

      const profileResult = await mcpRequest(
        sessionId,
        100 + players.length,
        'tools/call',
        {
          name: profileTool.name,
          arguments: profileArgs,
        },
      );

      const profilePayload = resultData(profileResult);
      if (account.id === 'myrwn') {
        console.log('PROFILE_PAYLOAD_TYPE=', typeof profilePayload);
        console.log('PROFILE_PAYLOAD_DEBUG=', JSON.stringify(profilePayload).slice(0, 30000));
      }
      const rank = findRank(profilePayload);

      if (!rank) {
        throw new Error(
          'No se pudo interpretar el rango/LP del perfil OP.GG.',
        );
      }

      const identifier = extractIdentifier(profilePayload);

      const matchesArgs = buildArgs(
        matchesTool,
        account,
        identifier,
      );

      const matchesResult = await mcpRequest(
        sessionId,
        200 + players.length,
        'tools/call',
        {
          name: matchesTool.name,
          arguments: matchesArgs,
        },
      );

      const matchesPayload = resultData(matchesResult);
      if (account.id === 'myrwn') {
        console.log('MATCHES_DEBUG=', String(matchesPayload).slice(0, 20000));
      }
      const matches = matchObjects(matchesPayload)
        .map((game) => toMatch(game, account.role))
        .sort((a, b) => b.gameCreation - a.gameCreation)
        .slice(0, 20);

      players.push(
        playerFrom(
          account,
          rank,
          matches,
          previousMap.get(account.id),
        ),
      );

      console.log(
        account.proName +
          ': ' +
          rank.tier +
          ' ' +
          rank.division +
          ' ' +
          rank.lp +
          ' LP · ' +
          matches.length +
          ' partidas',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.error(account.proName + ': ' + message);

      const previousPlayer = previousMap.get(account.id);

      if (previousPlayer) players.push(previousPlayer);

      errors.push(account.proName + ': ' + message);
    }
  }

  recalculateRankings(players);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'OP.GG',
    sourceType: 'official-opgg-mcp',
    status:
      errors.length === 0 &&
      players.length === config.players.length
        ? 'ok'
        : 'partial',
    players,
    errors,
    meta: {
      team: config.team,
      region: config.region.toUpperCase(),
      accountCount: config.players.length,
      successfulCount: config.players.length - errors.length,
      mcpTools: [
        'lol_get_summoner_profile',
        'lol_list_summoner_matches',
      ],
      message:
        'Datos obtenidos mediante el servidor oficial de OP.GG MCP. No se utiliza una Riot API key.',
    },
  };

  await fs.writeFile(
    LIVE,
    JSON.stringify(payload, null, 2) + '\n',
    'utf8',
  );

  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
