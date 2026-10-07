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

  const player = players.find((candidate) => {
    const aliases = [
      candidate.proName.toLowerCase(),
      candidate.id.toLowerCase(),
      candidate.gameName.toLowerCase(),
    ];
    return aliases.some((alias) => query.includes(alias));
  });

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

  if (
    query.includes('bot') ||
    query.includes('botlane') ||
    query.includes('duo')
  ) {
    const adc = players.find((player) => player.role === 'ADC');
    const support = players.find((player) => player.role === 'SUPPORT');

    if (adc && support) {
      const wins = adc.wins + support.wins;
      const losses = adc.losses + support.losses;
      const total = Math.max(1, wins + losses);
      return `**Botlane de KOI / MKOI**

Supa: **${adc.tier} ${adc.division} ${adc.lp} LP · ${adc.winrate}% WR · KDA ${adc.avgKda}**
Alvaro: **${support.tier} ${support.division} ${support.lp} LP · ${support.winrate}% WR · KDA ${support.avgKda}**

Balance individual combinado: **${wins}-${losses} (${((wins / total) * 100).toFixed(1)}% WR)**.`;
    }
  }

  if (query.includes('kda') || query.includes('mejor')) {
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

  return `Puedo analizar cualquiera de las cinco cuentas de KOI / MKOI. Prueba con “Reporte de los 5”, el nombre de un jugador, “botlane”, “mejor KDA”, “racha” o “campeones”.`;
}
