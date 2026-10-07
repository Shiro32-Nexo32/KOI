#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, 'data', 'monitored.json');
const LIVE = path.join(ROOT, 'data', 'live.json');
const MCP_URL = 'https://mcp-api.op.gg/mcp';

const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const int = (v, d = 0) => Math.trunc(num(v, d));
const walk = (v, fn) => {
  if (Array.isArray(v)) return v.forEach(x => walk(x, fn));
  if (v && typeof v === 'object') {
    fn(v);
    Object.values(v).forEach(x => walk(x, fn));
  }
};
const parseTool = (r) => {
  if (r?.structuredContent) return r.structuredContent;
  for (const block of r?.content || []) {
    if (block?.type === 'json' && block.json) return block.json;
    if (block?.type === 'text' && typeof block.text === 'string') {
      try { return JSON.parse(block.text); } catch {}
    }
  }
  return r;
};

function prop(tool, names) {
  const p = tool?.inputSchema?.properties || {};
  return names.find(n => p[n]);
}
function setArg(args, tool, names, value) {
  const key = prop(tool, names);
  if (key) args[key] = value;
}
function argsFor(tool, account, identifier = null) {
  const p = tool?.inputSchema?.properties || {};
  const a = {};
  setArg(a, tool, ['region','region_code','regionCode','server'], 'na');
  setArg(a, tool, ['game_name','gameName','summoner_name','summonerName','name'], account.gameName);
  setArg(a, tool, ['tagline','tag_line','tagLine','tag'], account.tagLine);
  setArg(a, tool, ['riot_id','riotId','riotID'], account.gameName + '#' + account.tagLine);
  if (identifier) setArg(a, tool, ['summoner_id','summonerId','id','puuid','player_puuid','playerPuuid'], identifier);
  setArg(a, tool, ['limit','count','results','game_count'], 20);
  setArg(a, tool, ['game_type','gameType','queue','queue_type'], 'ranked');
  setArg(a, tool, ['language','lang','hl'], 'en_US');

  for (const required of tool?.inputSchema?.required || []) {
    if (a[required] !== undefined) continue;
    const aliases = {
      region: ['region','region_code','regionCode','server'],
      game_name: ['game_name','gameName','summoner_name','summonerName','name'],
      tagline: ['tagline','tag_line','tagLine','tag'],
      riot_id: ['riot_id','riotId','riotID'],
      summoner_id: ['summoner_id','summonerId','id','puuid','player_puuid','playerPuuid'],
      limit: ['limit','count','results','game_count'],
      game_type: ['game_type','gameType','queue','queue_type'],
    };
    const names = aliases[required] || [required];
    if (names.some(n => p[n])) {
      const key = names.find(n => p[n]);
      if (key === 'region' || key === 'region_code' || key === 'regionCode' || key === 'server') a[required] = 'na';
      else if (key === 'game_name' || key === 'gameName' || key === 'summoner_name' || key === 'summonerName' || key === 'name') a[required] = account.gameName;
      else if (key === 'tagline' || key === 'tag_line' || key === 'tagLine' || key === 'tag') a[required] = account.tagLine;
      else if (key === 'riot_id' || key === 'riotId' || key === 'riotID') a[required] = account.gameName + '#' + account.tagLine;
      else if (identifier) a[required] = identifier;
      else if (key === 'limit' || key === 'count' || key === 'results' || key === 'game_count') a[required] = 20;
      else if (key === 'game_type' || key === 'gameType' || key === 'queue' || key === 'queue_type') a[required] = 'ranked';
    }
  }
  return a;
}

function findRank(payload) {
  const c = [];
  walk(payload, o => {
    const t = o.solo_tier_info || o.soloTierInfo || o.tier_info || o.tierInfo;
    if (t && typeof t === 'object' && (t.lp ?? t.league_points ?? t.leaguePoints) !== undefined) {
      c.push({
        tier: t.tier ?? t.tier_name ?? o.tier,
        division: t.division ?? t.rank ?? o.division ?? o.rank ?? 'I',
        lp: t.lp ?? t.league_points ?? t.leaguePoints,
        wins: t.wins ?? o.wins ?? o.win ?? 0,
        losses: t.losses ?? o.losses ?? o.lose ?? 0
      });
    } else if (o.tier !== undefined && (o.lp ?? o.league_points ?? o.leaguePoints) !== undefined) {
      c.push({
        tier: o.tier,
        division: o.division ?? o.rank ?? 'I',
        lp: o.lp ?? o.league_points ?? o.leaguePoints,
        wins: o.wins ?? o.win ?? 0,
        losses: o.losses ?? o.lose ?? 0
      });
    }
  });
  const x = c.find(r => ['CHALLENGER','GRANDMASTER','MASTER','DIAMOND','EMERALD','PLATINUM','GOLD','SILVER','BRONZE','IRON'].includes(String(r.tier).toUpperCase())) || c[0];
  if (!x) return null;
  const wins = int(x.wins), losses = int(x.losses);
  return {
    tier: String(x.tier).toUpperCase(),
    division: String(x.division).toUpperCase(),
    lp: int(x.lp),
    wins,
    losses,
    winrate: Number(((wins / Math.max(1, wins + losses)) * 100).toFixed(1))
  };
}

function gameList(payload) {
  const out = [];
  walk(payload, o => {
    const id = o.game_id ?? o.gameId ?? o.match_id ?? o.matchId ?? o.created_at ?? o.game_creation ?? o.gameCreation;
    const data = o.my_data || o.myData || o.player || o.stats;
    if (id !== undefined && data !== undefined) out.push(o);
  });
  const map = new Map();
  for (const g of out) {
    const id = String(g.game_id ?? g.gameId ?? g.match_id ?? g.matchId ?? g.created_at ?? g.game_creation ?? g.gameCreation);
    if (!map.has(id)) map.set(id, g);
  }
  return [...map.values()].slice(0, 20);
}

function ts(g) {
  const v = g.created_at ?? g.game_creation ?? g.gameCreation ?? g.timestamp ?? Date.now();
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : Date.now();
  }
  const n = int(v, Date.now());
  return n < 1e10 ? n * 1000 : n;
}

function toMatch(g, role) {
  const d = g.my_data || g.myData || g.player || {};
  const s = d.stats || g.stats || {};
  const ch = d.champion || g.champion || {};
  const duration = int(g.game_length_second ?? g.gameLengthSecond ?? g.duration ?? g.gameDurationSeconds);
  const kills = int(s.kill ?? s.kills), deaths = int(s.death ?? s.deaths), assists = int(s.assist ?? s.assists);
  const cs = int(s.minion_kill ?? s.minionKill ?? s.cs ?? s.total_minions_killed ?? s.totalMinionsKilled);
  const raw = String(s.result ?? s.outcome ?? s.win ?? g.result ?? g.outcome ?? g.win ?? '').toLowerCase();
  const win = ['win','won','victory','true','1'].includes(raw);
  return {
    matchId: String(g.game_id ?? g.gameId ?? g.match_id ?? g.matchId ?? 'OPGG_' + ts(g)),
    gameCreation: ts(g),
    gameDurationSeconds: duration,
    queueType: String(g.game_type ?? g.gameType ?? g.queue_type ?? g.queueType ?? 'Ranked Solo/Duo'),
    win,
    championName: String(ch.name ?? ch.champion_name ?? g.champion_name ?? g.championName ?? 'Desconocido'),
    championId: String(ch.id ?? ch.key ?? g.champion_id ?? g.championId ?? '0'),
    champLevel: int(s.level ?? s.champ_level ?? s.champLevel),
    role: String(d.position ?? d.role ?? g.position ?? g.role ?? role).toUpperCase(),
    kills, deaths, assists,
    kda: Number(((kills + assists) / Math.max(1, deaths)).toFixed(2)),
    cs,
    csPerMin: duration ? Number((cs / Math.max(1, duration / 60)).toFixed(1)) : 0,
    killParticipationPct: Number(num(s.kill_participation ?? s.killParticipation ?? g.killParticipation, 0).toFixed(1)),
    damageDealt: int(s.total_damage_to_champions ?? s.damage_to_champions ?? s.damage ?? g.damageDealt),
    damagePct: Number(num(s.damage_share ?? s.damage_pct ?? g.damagePct, 0).toFixed(1)),
    visionScore: int(s.vision_score ?? s.visionScore ?? g.visionScore),
    spells: Array.isArray(d.spells) ? d.spells.slice(0,2).map(String) : ['', ''],
    items: Array.isArray(d.items) ? d.items.slice(0,7).map(x => int(typeof x === 'object' ? (x.id ?? x.item_id ?? x.itemId) : x)) : [],
    tags: []
  };
}

function champions(matches) {
  const map = new Map();
  for (const m of matches) {
    const c = map.get(m.championName) || { championName:m.championName, championId:m.championId, games:0, wins:0, losses:0, winrate:0, kills:0, deaths:0, assists:0, kda:0, csPerMin:0 };
    c.games++; c.wins += m.win ? 1 : 0; c.losses += m.win ? 0 : 1;
    c.kills += m.kills; c.deaths += m.deaths; c.assists += m.assists; c.csPerMin += m.csPerMin;
    map.set(m.championName, c);
  }
  return [...map.values()].map(c => ({
    ...c,
    winrate: Number(((c.wins / Math.max(1,c.games))*100).toFixed(1)),
    kda: Number(((c.kills+c.assists)/Math.max(1,c.deaths)).toFixed(1)),
    csPerMin: Number((c.csPerMin/Math.max(1,c.games)).toFixed(1))
  })).sort((a,b)=>b.games-a.games || b.winrate-a.winrate);
}

function streak(matches) {
  if (!matches.length) return 0;
  const w = !!matches[0].win;
  let n = 0;
  for (const m of matches) { if (!!m.win !== w) break; n++; }
  return w ? n : -n;
}

function playerFrom(account, rank, matches, previous) {
  const recent = matches.slice(0,20);
  const avg = k => Number((recent.reduce((s,m)=>s+num(m[k],0),0)/Math.max(1,recent.length)).toFixed(1));
  const cur = {
    ...(previous || {}),
    id:account.id, proName:account.proName, realName:account.realName,
    riotId:account.gameName+'#'+account.tagLine, gameName:account.gameName, tagLine:account.tagLine,
    region:'NA', team:'KOI / MKOI', role:account.role, profileIconId:previous?.profileIconId ?? 588,
    tier:rank.tier, division:rank.division, lp:rank.lp, wins:rank.wins, losses:rank.losses, winrate:rank.winrate,
    streak:streak(recent), avgKda:avg('kda'), avgKills:avg('kills'), avgDeaths:avg('deaths'), avgAssists:avg('assists'),
    avgCsPerMin:avg('csPerMin'), avgKillParticipationPct:avg('killParticipationPct'),
    champions:champions(recent), recentMatches:recent,
    statusBadge:rank.tier+' '+rank.division+' ('+rank.lp+' LP)',
    analystSummary:account.proName+': '+rank.tier+' '+rank.division+' '+rank.lp+' LP · '+recent.length+' partidas consultadas · '+rank.winrate+'% WR · KDA medio '+avg('kda')+'.',
    snapshots:previous?.snapshots || [], formRank:previous?.formRank || 0, eloRank:previous?.eloRank || 0
  };
  const oldSig = previous ? [previous.tier,previous.division,previous.lp].join(':') : null;
  const newSig = [cur.tier,cur.division,cur.lp].join(':');
  if (oldSig !== newSig) {
    cur.snapshots = [...cur.snapshots, {timestamp:Date.now(),tier:cur.tier,division:cur.division,lp:cur.lp,wins:cur.wins,losses:cur.losses,note:'Sincronización automática desde OP.GG'}].slice(-250);
  }
  return cur;
}

function rankings(players) {
  const tw={CHALLENGER:10000,GRANDMASTER:9000,MASTER:8000,DIAMOND:7000,EMERALD:6000,PLATINUM:5000,GOLD:4000,SILVER:3000,BRONZE:2000,IRON:1000,UNRANKED:0};
  const dw={I:400,II:300,III:200,IV:100};
  const elo=p=>(tw[p.tier]||0)+(dw[p.division]||0)+num(p.lp);
  const form=p=>num(p.winrate)*1.5+num(p.streak)*4+num(p.avgKda)*2.5+(num(p.wins)/Math.max(1,num(p.wins)+num(p.losses)))*50;
  [...players].sort((a,b)=>elo(b)-elo(a)).forEach((p,i)=>p.eloRank=i+1);
  [...players].sort((a,b)=>form(b)-form(a)).forEach((p,i)=>p.formRank=i+1);
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG,'utf8'));
  const old = JSON.parse(await fs.readFile(LIVE,'utf8')).players || [];
  const oldMap = new Map(old.map(p => [p.id,p]));
  const client = new Client({name:'koi-tracker',version:'1.0.0'},{capabilities:{}});
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));

  const toolData = await client.listTools();
  const tools = toolData.tools || [];
  const profileTool = tools.find(t=>t.name==='lol_get_summoner_profile');
  const matchesTool = tools.find(t=>t.name==='lol_list_summoner_matches');
  if (!profileTool || !matchesTool) throw new Error('No están disponibles los tools oficiales de OP.GG MCP.');

  const players=[], errors=[];
  for (const account of config.players) {
    try {
      const profileRes = await client.callTool({name:profileTool.name,arguments:argsFor(profileTool,account)});
      const profile = parseTool(profileRes);
      const rank = findRank(profile);
      if (!rank) throw new Error('No se pudo interpretar rango/LP desde el perfil OP.GG.');
      let identifier = null;
      walk(profile,o=>{ if (identifier) return; for (const k of ['summoner_id','summonerId','id','puuid','acct_id']) if (o[k]!=null) { identifier=String(o[k]); break; }});
      const matchRes = await client.callTool({name:matchesTool.name,arguments:argsFor(matchesTool,account,identifier)});
      const matches = gameList(parseTool(matchRes)).map(g=>toMatch(g,account.role)).sort((a,b)=>b.gameCreation-a.gameCreation).slice(0,20);
      players.push(playerFrom(account,rank,matches,oldMap.get(account.id)));
      console.log(account.proName+': '+rank.tier+' '+rank.division+' '+rank.lp+' LP · '+matches.length+' partidas');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(account.proName+': '+msg);
      const previous = oldMap.get(account.id);
      if (previous) players.push(previous);
      errors.push(account.proName+': '+msg);
    }
  }

  rankings(players);
  const payload = {
    generatedAt:nowIso(), source:'OP.GG', sourceType:'official-opgg-mcp',
    status:errors.length===0 && players.length===config.players.length ? 'ok' : 'partial',
    players, errors,
    meta:{
      team:config.team, region:config.region.toUpperCase(),
      accountCount:config.players.length, successfulCount:config.players.length-errors.length,
      mcpTools:['lol_get_summoner_profile','lol_list_summoner_matches'],
      message:'Datos obtenidos mediante el servidor oficial de OP.GG MCP. No se utiliza una Riot API key.'
    }
  };
  await fs.writeFile(LIVE,JSON.stringify(payload,null,2)+'\n','utf8');
  if (client.close) await client.close();
}
main().catch(error=>{ console.error(error); process.exit(1); });
