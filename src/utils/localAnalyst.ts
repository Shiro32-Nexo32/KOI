import { PlayerProfile, MatchRecord, LPSnapshot } from '../types/lol';
import { formatRankLabel } from './ddragon';

const TIER_WEIGHT: Record<string, number> = {
  IRON: 1000,
  BRONZE: 2000,
  SILVER: 3000,
  GOLD: 4000,
  PLATINUM: 5000,
  EMERALD: 6000,
  DIAMOND: 7000,
  MASTER: 8000,
  GRANDMASTER: 9000,
  CHALLENGER: 10000,
};

const DIVISION_WEIGHT: Record<string, number> = {
  I: 400,
  II: 300,
  III: 200,
  IV: 100,
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim();
}

function ladderScore(tier: string, division: string, lp: number): number {
  const normalizedTier = tier.toUpperCase();
  const apex = normalizedTier === 'MASTER' || normalizedTier === 'GRANDMASTER' || normalizedTier === 'CHALLENGER';
  return (TIER_WEIGHT[normalizedTier] || 0) + (apex ? 0 : (DIVISION_WEIGHT[division.toUpperCase()] || 0)) + Number(lp || 0);
}

function rankLabel(player: PlayerProfile): string {
  return formatRankLabel(player.tier, player.division, player.lp);
}

function signed(value: number): string {
  return value > 0 ? '+' + value : String(value);
}

function ranking(players: PlayerProfile[], field: 'eloRank' | 'formRank'): string {
  return [...players]
    .sort((a, b) => a[field] - b[field])
    .map((player, index) => (index + 1) + '. ' + player.proName + ' — ' + rankLabel(player))
    .join('\n');
}

function topChampion(player: PlayerProfile): string {
  const champion = [...player.champions].sort((a, b) => b.games - a.games || b.winrate - a.winrate)[0];
  return champion
    ? champion.championName + ' (' + champion.games + ' partidas, ' + champion.wins + '-' + champion.losses + ', ' + champion.winrate + '% WR, KDA ' + champion.kda + ')'
    : 'sin datos de campeones';
}

function mentionedPlayers(question: string, players: PlayerProfile[]): PlayerProfile[] {
  const q = normalize(question);
  return players.filter((player) => {
    const aliases = [player.proName, player.id, player.gameName, player.riotId].map(normalize);
    return aliases.some((alias) => alias && q.includes(alias));
  });
}

function leader(players: PlayerProfile[]): PlayerProfile | undefined {
  return [...players].sort((a, b) => a.eloRank - b.eloRank)[0];
}

function formLeader(players: PlayerProfile[]): PlayerProfile | undefined {
  return [...players].sort((a, b) => a.formRank - b.formRank)[0];
}

function recentMatches(players: PlayerProfile[], cutoff: number): Array<MatchRecord & { proName: string }> {
  return players
    .flatMap((player) => player.recentMatches.map((match) => ({ ...match, proName: player.proName })))
    .filter((match) => match.gameCreation >= cutoff)
    .sort((a, b) => b.gameCreation - a.gameCreation);
}

function latestSnapshot(player: PlayerProfile): LPSnapshot | null {
  return [...player.snapshots].sort((a, b) => b.timestamp - a.timestamp)[0] || null;
}

function snapshotBefore(player: PlayerProfile, cutoff: number): LPSnapshot | null {
  return [...player.snapshots]
    .filter((snapshot) => snapshot.timestamp <= cutoff)
    .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
}

function ladderDelta(player: PlayerProfile, cutoff: number): number | null {
  const latest = latestSnapshot(player);
  if (!latest) return null;

  const before = snapshotBefore(player, cutoff);
  if (!before) return null;

  return ladderScore(latest.tier, latest.division, latest.lp) -
    ladderScore(before.tier, before.division, before.lp);
}

function windowText(hours: number): string {
  return hours === 1 ? 'la última hora' : 'las últimas 24 horas';
}

function groupWindow(players: PlayerProfile[], hours: number): string {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const matches = recentMatches(players, cutoff);
  const totalWins = matches.filter((match) => match.win).length;
  const totalLosses = matches.length - totalWins;

  const rows = players.map((player) => {
    const pm = player.recentMatches.filter((match) => match.gameCreation >= cutoff);
    const wins = pm.filter((match) => match.win).length;
    return { player, games: pm.length, wins, losses: pm.length - wins, delta: ladderDelta(player, cutoff) };
  }).filter((row) => row.games > 0 || row.delta !== null);

  if (!matches.length) {
    return '**Actividad de ' + windowText(hours) + '**\n\nNo hay partidas registradas en esta ventana.';
  }

  const best = [...rows].sort((a, b) => b.wins - a.wins || b.games - a.games)[0];
  const bestWr = [...rows].sort((a, b) => {
    const aw = a.games ? a.wins / a.games : 0;
    const bw = b.games ? b.wins / b.games : 0;
    return bw - aw || b.games - a.games;
  })[0];

  const net = rows.reduce((sum, row) => sum + (row.delta || 0), 0);
  const details = rows
    .sort((a, b) => b.games - a.games || b.wins - a.wins)
    .map((row) => {
      const delta = row.delta === null ? '' : ' · ladder ' + signed(row.delta);
      return '- **' + row.player.proName + '**: ' + row.wins + 'W-' + row.losses + 'L en ' + row.games + ' partidas' + delta;
    })
    .join('\n');

  return '**Actividad de ' + windowText(hours) + '**\n\n' +
    '**Grupo:** ' + matches.length + ' partidas · ' + totalWins + 'W-' + totalLosses + 'L.\n\n' +
    details + '\n\n' +
    '**Más victorias:** ' + best.player.proName + ' (' + best.wins + ').\n' +
    '**Mejor WR en la ventana:** ' + bestWr.player.proName + ' (' + ((bestWr.wins / Math.max(1, bestWr.games)) * 100).toFixed(1) + '%).\n' +
    '**Cambio neto de ladder registrado:** ' + signed(net) + ' puntos.';
}

function playerWindow(player: PlayerProfile, hours: number): string {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const matches = player.recentMatches.filter((match) => match.gameCreation >= cutoff);
  const wins = matches.filter((match) => match.win).length;
  const losses = matches.length - wins;
  const delta = ladderDelta(player, cutoff);

  if (!matches.length && (!delta || delta === 0)) {
    return '**' + player.proName + '**\n\nNo tengo actividad registrada para ' + windowText(hours) + '.';
  }

  const kda = matches.length
    ? (matches.reduce((sum, match) => sum + match.kda, 0) / matches.length).toFixed(2)
    : null;

  return '**' + player.proName + ' · ' + windowText(hours) + '**\n\n' +
    'Partidas: **' + matches.length + '** (' + wins + 'W-' + losses + 'L)\n' +
    (kda ? 'KDA medio: **' + kda + '**\n' : '') +
    'Rango actual: **' + rankLabel(player) + '**\n' +
    (delta === null ? 'Sin cambio de ladder registrado.' : 'Cambio registrado de ladder: **' + signed(delta) + ' puntos**.');
}

function compare(first: PlayerProfile, second: PlayerProfile): string {
  const firstScore = ladderScore(first.tier, first.division, first.lp);
  const secondScore = ladderScore(second.tier, second.division, second.lp);
  const rankWinner = firstScore === secondScore ? null : firstScore > secondScore ? first : second;
  const formWinner = first.formRank === second.formRank ? null : first.formRank < second.formRank ? first : second;

  return '**' + first.proName + ' vs ' + second.proName + '**\n\n' +
    first.proName + ': **' + rankLabel(first) + '** · ' + first.winrate + '% WR · KDA ' + first.avgKda + ' · racha ' + signed(first.streak) + '\n' +
    second.proName + ': **' + rankLabel(second) + '** · ' + second.winrate + '% WR · KDA ' + second.avgKda + ' · racha ' + signed(second.streak) + '\n\n' +
    '**Rango:** ' + (rankWinner ? 'va por delante **' + rankWinner.proName + '**.' : 'están empatados.') + '\n' +
    '**Forma:** ' + (formWinner ? 'lidera **' + formWinner.proName + '**.' : 'igualada.') ;
}

function playerSummary(player: PlayerProfile): string {
  return '**' + player.proName + '**\n\n' +
    'Rango actual: **' + rankLabel(player) + '**\n' +
    'Balance sincronizado: **' + player.wins + '-' + player.losses + ' (' + player.winrate + '% WR)**\n' +
    'Racha: **' + signed(player.streak) + '**\n' +
    'KDA medio: **' + player.avgKda + '**\n' +
    'CS/min: **' + player.avgCsPerMin + '**\n' +
    'Forma: **#' + player.formRank + ' de 5**\n' +
    'Rango dentro del grupo: **#' + player.eloRank + ' de 5**\n' +
    'Pick principal: **' + topChampion(player) + '**';
}

function champions(player: PlayerProfile): string {
  const rows = [...player.champions]
    .sort((a, b) => b.games - a.games || b.winrate - a.winrate)
    .map((champ) => '- **' + champ.championName + '** · ' + champ.games + ' partidas · ' + champ.winrate + '% WR · KDA ' + champ.kda)
    .join('\n');

  return rows
    ? '**Pool reciente de ' + player.proName + '**\n\n' + rows
    : 'No hay datos recientes de campeones para ' + player.proName + '.';
}

function allRecent(players: PlayerProfile[]): string {
  const rows = players
    .flatMap((player) => player.recentMatches.map((match) => ({ ...match, proName: player.proName })))
    .sort((a, b) => b.gameCreation - a.gameCreation)
    .slice(0, 10);

  return rows.length
    ? '**Últimas ' + rows.length + ' partidas recibidas**\n\n' +
      rows.map((match) =>
        (match.win ? '✅' : '❌') + ' **' + match.proName + '** · ' + match.championName +
        ' · ' + match.kills + '/' + match.deaths + '/' + match.assists + ' · ' + match.kda + ' KDA'
      ).join('\n')
    : 'No hay partidas recientes disponibles.';
}

export function getLocalAnalystAnswer(question: string, players: PlayerProfile[]): string {
  const q = normalize(question);

  if (!players.length) return 'No hay datos de jugadores disponibles en este momento.';

  const named = mentionedPlayers(question, players);
  const oneHour = q.includes('ultima hora') || q.includes('ultimos 60 minutos') || q.includes('ultimos 60 min');
  const oneDay = q.includes('ultimo dia') || q.includes('ultimas 24 horas') || q.includes('24 horas') || q.includes('hoy');

  const asksLadderChange =
    q.includes('ha perdido lp') ||
    q.includes('ha subido lp') ||
    q.includes('quien subio') ||
    q.includes('quien bajo') ||
    q.includes('cambio de lp') ||
    q.includes('cambio de ladder');

  if (oneDay && asksLadderChange) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const changes = players
      .map((player) => ({ player, delta: ladderDelta(player, cutoff) }))
      .filter((row) => row.delta !== null)
      .sort((a, b) => (b.delta || 0) - (a.delta || 0));

    const positive = changes.find((row) => (row.delta || 0) > 0);
    const negative = [...changes].reverse().find((row) => (row.delta || 0) < 0);

    return '**Cambios de ladder en las últimas 24 horas**\\n\\n' +
      (positive ? 'Más subida registrada: **' + positive.player.proName + ' ' + signed(positive.delta || 0) + ' puntos**.\\n' : 'No hay una subida registrada.\\n') +
      (negative ? 'Más bajada registrada: **' + negative.player.proName + ' ' + signed(negative.delta || 0) + ' puntos**.\\n\\n' : 'No hay una bajada registrada.\\n\\n') +
      'Se calcula con los snapshots publicados por el tracker; no es MMR oculto.';
  }

  if ((oneHour || oneDay) && named.length === 1) {
    return playerWindow(named[0], oneHour ? 1 : 24);
  }

  if ((oneHour || oneDay) && (
    q.includes('grupo') || q.includes('equipo') || q.includes('todos') || q.includes('5') || named.length === 0
  )) {
    return groupWindow(players, oneHour ? 1 : 24);
  }

  if (named.length >= 2 && (
    q.includes('compar') || q.includes('vs') || q.includes('contra') || q.includes('mejor') || q.includes('quien esta mejor')
  )) {
    return compare(named[0], named[1]);
  }

  const currentLeader = leader(players);
  const currentFormLeader = formLeader(players);

  if (
    q.includes('quien va lider') ||
    q.includes('quien es lider') ||
    q.includes('quien lidera') ||
    q.includes('lider ahora') ||
    q.includes('quien va primero') ||
    q === 'lider'
  ) {
    return currentLeader
      ? '**' + currentLeader.proName + ' va líder ahora mismo.**\n\nRango: **' + rankLabel(currentLeader) + '**\nBalance: ' +
        currentLeader.wins + '-' + currentLeader.losses + ' (' + currentLeader.winrate + '% WR)\n\nEs el primero entre las 5 cuentas monitorizadas.'
      : 'No hay ranking de rango disponible.';
  }

  if (
    q.includes('lidera la forma') ||
    q.includes('mejor forma') ||
    q.includes('quien esta en mejor forma') ||
    q.includes('mejor ahora')
  ) {
    return currentFormLeader
      ? '**' + currentFormLeader.proName + ' lidera la forma.**\n\n' +
        currentFormLeader.winrate + '% WR · KDA ' + currentFormLeader.avgKda + ' · racha ' +
        signed(currentFormLeader.streak) + ' · rango ' + rankLabel(currentFormLeader) + '.'
      : 'No hay ranking de forma disponible.';
  }

  if (
    q.includes('ranking de rango') ||
    q.includes('ranking del ladder') ||
    q.includes('orden de rango') ||
    q.includes('ordenalos por rango')
  ) {
    return '**Ranking de rango actual**\n\n' +
      ranking(players, 'eloRank') +
      '\n\nNota: es el orden entre estas 5 cuentas, no el puesto global de NA.';
  }

  if (
    q.includes('reporte') ||
    q.includes('como van todos') ||
    q.includes('como van las 5') ||
    q.includes('estado del grupo')
  ) {
    const bestKda = [...players].sort((a, b) => b.avgKda - a.avgKda)[0];
    const bestWr = [...players].sort((a, b) => b.winrate - a.winrate)[0];
    const bestStreak = [...players].sort((a, b) => Math.abs(b.streak) - Math.abs(a.streak))[0];

    return '**Estado actual de KOI / MKOI**\n\n' +
      '**Rango**\n' + ranking(players, 'eloRank') + '\n\n' +
      '**Forma**\n' + ranking(players, 'formRank') + '\n\n' +
      '**Mejor KDA:** ' + (bestKda ? bestKda.proName : '—') + '.\n' +
      '**Mejor WR:** ' + (bestWr ? bestWr.proName : '—') + '.\n' +
      '**Racha más larga:** ' + (bestStreak ? bestStreak.proName : '—') + '.';
  }

  if (q.includes('mejor winrate') || q.includes('mayor winrate') || q.includes('mejor wr')) {
    const best = [...players].sort((a, b) => b.winrate - a.winrate)[0];
    return best
      ? '**' + best.proName + ' tiene el mejor winrate:** ' + best.winrate + '% (' + best.wins + '-' + best.losses + ').'
      : 'No hay winrate disponible.';
  }

  if (q.includes('peor winrate') || q.includes('menor winrate') || q.includes('peor wr')) {
    const worst = [...players].sort((a, b) => a.winrate - b.winrate)[0];
    return worst
      ? '**' + worst.proName + ' tiene el winrate más bajo:** ' + worst.winrate + '% (' + worst.wins + '-' + worst.losses + ').'
      : 'No hay winrate disponible.';
  }

  if (q.includes('mejor kda') || q.includes('mayor kda') || q.includes('quien tiene el mejor kda')) {
    const best = [...players].sort((a, b) => b.avgKda - a.avgKda)[0];
    return best
      ? '**' + best.proName + ' lidera el KDA medio:** ' + best.avgKda + '.'
      : 'No hay KDA suficientes para comparar.';
  }

  if (q.includes('racha') || q.includes('streak')) {
    const wins = [...players].filter((p) => p.streak > 0).sort((a, b) => b.streak - a.streak)[0];
    const losses = [...players].filter((p) => p.streak < 0).sort((a, b) => a.streak - b.streak)[0];
    return '**Rachas actuales**\n\n' +
      (wins ? 'Mejor racha positiva: **' + wins.proName + ' +' + wins.streak + 'W**\n' : 'No hay racha positiva registrada.\n') +
      (losses ? 'Peor racha negativa: **' + losses.proName + ' ' + losses.streak + 'L**' : 'No hay racha negativa registrada.');
  }

  if (
    q.includes('ha perdido lp') ||
    q.includes('ha subido lp') ||
    q.includes('quien subio') ||
    q.includes('quien bajo') ||
    q.includes('cambio de lp') ||
    q.includes('cambio de ladder')
  ) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const changes = players
      .map((player) => ({ player, delta: ladderDelta(player, cutoff) }))
      .filter((row) => row.delta !== null)
      .sort((a, b) => (b.delta || 0) - (a.delta || 0));

    const positive = changes.find((row) => (row.delta || 0) > 0);
    const negative = [...changes].reverse().find((row) => (row.delta || 0) < 0);

    return '**Cambios de ladder en las últimas 24 horas**\n\n' +
      (positive ? 'Más subida registrada: **' + positive.player.proName + ' ' + signed(positive.delta || 0) + ' puntos**.\n' : 'No hay una subida registrada.\n') +
      (negative ? 'Más bajada registrada: **' + negative.player.proName + ' ' + signed(negative.delta || 0) + ' puntos**.\n\n' : 'No hay una bajada registrada.\n\n') +
      'Se calcula con los snapshots publicados por el tracker; no es MMR oculto.';
  }

  if (q.includes('botlane') || q.includes('bot lane') || q.includes('duo') || (q.includes('supa') && q.includes('alvaro'))) {
    const adc = players.find((p) => p.role === 'ADC');
    const support = players.find((p) => p.role === 'SUPPORT');

    if (adc && support) {
      const wins = adc.wins + support.wins;
      const losses = adc.losses + support.losses;
      const total = Math.max(1, wins + losses);
      const better = adc.avgKda >= support.avgKda ? adc : support;

      return '**Botlane de KOI / MKOI**\n\n' +
        'Supa: **' + rankLabel(adc) + '** · ' + adc.winrate + '% WR · KDA ' + adc.avgKda + '\n' +
        'Alvaro: **' + rankLabel(support) + '** · ' + support.winrate + '% WR · KDA ' + support.avgKda + '\n\n' +
        'Balance combinado: **' + wins + '-' + losses + '** (' + ((wins / total) * 100).toFixed(1) + '% WR).\n' +
        'En KDA medio lidera **' + better.proName + '** (' + better.avgKda + ').';
    }
  }

  if (q.includes('ultimas partidas') || q.includes('ultimos resultados') || q.includes('historial') || q.includes('partidas recientes')) {
    return allRecent(players);
  }

  if (q.includes('campeon') || q.includes('campeones') || q.includes('champ') || q.includes('picks')) {
    if (named.length === 1) return champions(named[0]);
    return players.map((player) => '**' + player.proName + '** — ' + topChampion(player)).join('\n');
  }

  if (q.includes('quien ha jugado mas') || q.includes('quien ha jugado mas partidas')) {
    const best = [...players].sort((a, b) => b.recentMatches.length - a.recentMatches.length)[0];
    return best
      ? '**' + best.proName + ' tiene más partidas recibidas en el snapshot:** ' + best.recentMatches.length + '.'
      : 'No hay partidas disponibles.';
  }

  if (named.length >= 2) return compare(named[0], named[1]);
  if (named.length === 1) return playerSummary(named[0]);

  if (q.includes('mejor') || q.includes('quien esta mejor')) {
    return currentFormLeader
      ? 'Ahora mismo, por forma, va mejor **' + currentFormLeader.proName + '**: ' +
        currentFormLeader.winrate + '% WR, KDA ' + currentFormLeader.avgKda + ' y racha ' + signed(currentFormLeader.streak) + '.'
      : 'No hay suficientes datos de forma.';
  }

  return 'Puedo responder con los datos del tracker. Prueba con “¿Quién va líder ahora?”, “¿Cómo ha ido el grupo en la última hora?”, “¿Cómo ha ido el grupo en las últimas 24 horas?”, “¿Quién tiene mejor KDA?”, “¿Cómo va Jojopyun?”, “¿Qué campeones juega Myrwn?”, “¿Cómo va la botlane?” o “¿Cuáles son las últimas partidas?”.';
}
