import { PlayerProfile } from '../types/lol';

function ranking(players: PlayerProfile[], field: 'eloRank' | 'formRank'): string {
  return [...players]
    .sort((a, b) => a[field] - b[field])
    .map((player, index) => `${index + 1}. ${player.proName} — ${player.tier} ${player.division} ${player.lp} LP`)
    .join('\n');
}

function topChampion(player: PlayerProfile): string {
  const champion = [...player.champions].sort(
    (a, b) => b.games - a.games || b.winrate - a.winrate,
  )[0];
  return champion
    ? `${champion.championName} (${champion.wins}-${champion.losses}, ${champion.winrate}% WR, KDA ${champion.kda})`
    : 'sin datos de campeones';
}

export function getLocalAnalystAnswer(question: string, players: PlayerProfile[]): string {
  const query = question.toLowerCase().trim();

  if (!players.length) return 'No hay datos de jugadores disponibles en este momento.';

  if (
    query.includes('reporte de los 5') ||
    query.includes('como van') ||
    query.includes('cómo van')
  ) {
    const formLeader = [...players].sort((a, b) => a.formRank - b.formRank)[0];
    const eloLeader = [...players].sort((a, b) => a.eloRank - b.eloRank)[0];

    return `**Reporte de KOI / MKOI**

**Ranking de forma**
${ranking(players, 'formRank')}

**Ranking de ladder**
${ranking(players, 'eloRank')}

El líder de forma actual es **${formLeader?.proName ?? '—'}** y el líder de ladder es **${eloLeader?.proName ?? '—'}**.

La lectura combina rango/LP, winrate, racha y KDA. La fuente de datos del tracker es OP.GG.`;
  }

  const ladderLeader = [...players].sort((a, b) => a.eloRank - b.eloRank)[0];
  const formLeader = [...players].sort((a, b) => a.formRank - b.formRank)[0];

  if (query.includes('lidera el ladder') || query.includes('mejor ladder') || query.includes('top ladder')) {
    return ladderLeader
      ? `El líder del ladder es **${ladderLeader.proName}**: ${ladderLeader.tier} ${ladderLeader.division} · ${ladderLeader.lp} LP, ${ladderLeader.winrate}% WR.`
      : 'No hay ranking de ladder disponible.';
  }

  if (query.includes('lidera la forma') || query.includes('mejor forma') || query.includes('top forma')) {
    return formLeader
      ? `El líder de forma es **${formLeader.proName}**: ${formLeader.winrate}% WR, racha ${formLeader.streak > 0 ? '+' : ''}${formLeader.streak}, KDA ${formLeader.avgKda}.`
      : 'No hay ranking de forma disponible.';
  }

  if (query.includes('mejor winrate') || query.includes('mayor winrate') || query.includes('mejor wr')) {
    const best = [...players].sort((a, b) => b.winrate - a.winrate)[0];
    return best
      ? `El mejor winrate es el de **${best.proName}**: **${best.winrate}%** (${best.wins}-${best.losses}).`
      : 'No hay winrate disponible.';
  }

  if (query.includes('peor winrate') || query.includes('menor winrate') || query.includes('peor wr')) {
    const worst = [...players].sort((a, b) => a.winrate - b.winrate)[0];
    return worst
      ? `El winrate más bajo es el de **${worst.proName}**: **${worst.winrate}%** (${worst.wins}-${worst.losses}).`
      : 'No hay winrate disponible.';
  }

  if (query.includes('bot') || query.includes('botlane') || query.includes('duo')) {
    const adc = players.find((candidate) => candidate.role === 'ADC');
    const support = players.find((candidate) => candidate.role === 'SUPPORT');

    if (adc && support) {
      const wins = adc.wins + support.wins;
      const losses = adc.losses + support.losses;
      const total = Math.max(1, wins + losses);
      const better = adc.avgKda >= support.avgKda ? adc : support;

      return `**Botlane de KOI / MKOI**

Supa: **${adc.tier} ${adc.division} ${adc.lp} LP · ${adc.winrate}% WR · KDA ${adc.avgKda}**
Alvaro: **${support.tier} ${support.division} ${support.lp} LP · ${support.winrate}% WR · KDA ${support.avgKda}**

Balance combinado: **${wins}-${losses} (${((wins / total) * 100).toFixed(1)}% WR)**.
En KDA medio, lidera **${better.proName}** (${better.avgKda}).`;
    }
  }

  const player = players.find((candidate) => {
    const aliases = [
      candidate.proName.toLowerCase(),
      candidate.id.toLowerCase(),
      candidate.gameName.toLowerCase(),
    ];
    return aliases.some((alias) => query.includes(alias));
  });

  if (player && (query.includes('campeon') || query.includes('campeones') || query.includes('champ') || query.includes('picks'))) {
    const championLines = [...player.champions]
      .sort((a, b) => b.games - a.games || b.winrate - a.winrate)
      .map(
        (champion) =>
          `- **${champion.championName}** · ${champion.games} partidas · ${champion.winrate}% WR · KDA ${champion.kda}`,
      );

    return championLines.length
      ? `**Pool de ${player.proName}**

${championLines.join('\n')}`
      : `No hay partidas de campeones disponibles para ${player.proName}.`;
  }

  if (player) {
    return `**${player.proName}**

Rango: **${player.tier} ${player.division} · ${player.lp} LP**
Balance: **${player.wins}-${player.losses} (${player.winrate}% WR)**
Racha: **${player.streak > 0 ? '+' : ''}${player.streak}**
KDA medio: **${player.avgKda}**
CS/min: **${player.avgCsPerMin}**
Ranking de forma: **#${player.formRank}**
Ranking de ladder: **#${player.eloRank}**
Pick principal: **${topChampion(player)}**`;
  }

  if (query.includes('ultimas partidas') || query.includes('últimas partidas') || query.includes('historial')) {
    const latest = [...players]
      .flatMap((candidate) =>
        candidate.recentMatches.slice(0, 3).map((match) => ({
          ...match,
          proName: candidate.proName,
        })),
      )
      .sort((a, b) => b.gameCreation - a.gameCreation)
      .slice(0, 8);

    return latest.length
      ? `**Últimas partidas recibidas**

${latest
          .map(
            (match) =>
              `${match.win ? '✅' : '❌'} ${match.proName} — ${match.championName} — ${match.kills}/${match.deaths}/${match.assists} — ${match.kda} KDA`,
          )
          .join('\n')}`
      : 'No hay historial reciente disponible.';
  }

  if (query.includes('kda')) {
    const best = [...players].sort((a, b) => b.avgKda - a.avgKda)[0];
    return best
      ? `${best.proName} tiene el KDA medio más alto del grupo: **${best.avgKda}**, con ${best.wins}-${best.losses} y ${best.winrate}% WR.`
      : 'No hay KDA suficientes para comparar.';
  }

  if (query.includes('racha') || query.includes('streak')) {
    const best = [...players].sort((a, b) => Math.abs(b.streak) - Math.abs(a.streak))[0];
    return best
      ? `${best.proName} tiene la racha más larga registrada: **${best.streak > 0 ? '+' : ''}${best.streak}**.`
      : 'No hay datos de rachas.';
  }

  if (query.includes('campeon') || query.includes('campeones') || query.includes('champ')) {
    const championLines = players.map(
      (player) => `**${player.proName}** — ${topChampion(player)}`,
    );
    return championLines.join('\n');
  }

  return `Puedo analizar las cinco cuentas de KOI / MKOI. Prueba con “Reporte de los 5”, “quién lidera el ladder”, “mejor winrate”, “botlane”, el nombre de un jugador, “campeones de Jojopyun”, “mejor KDA” o “últimas partidas”.`;
}
