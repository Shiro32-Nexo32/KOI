// Data Dragon CDN helpers for League of Legends assets (Patch 16.20.1)

const DDRAGON_VERSION = '16.20.1';
const DDRAGON_BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

export function getChampionIconUrl(championIdOrName: string): string {
  if (!championIdOrName) return 'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/Ahri.png';
  // Normalize known edge cases
  const aliases: Record<string, string> = {
    "Kai'Sa": 'Kaisa',
    "K'Sante": 'KSante',
    "Bel'Veth": 'Belveth',
    "Rek'Sai": 'RekSai',
  };
  const clean = aliases[championIdOrName] || championIdOrName.replace(/[^a-zA-Z0-9]/g, '');
  return `${DDRAGON_BASE}/img/champion/${clean}.png`;
}

export function getItemIconUrl(itemId: number): string {
  if (!itemId || itemId === 0) return '';
  return `${DDRAGON_BASE}/img/item/${itemId}.png`;
}

export function getSpellIconUrl(spellName: string): string {
  if (!spellName) return '';
  return `${DDRAGON_BASE}/img/spell/${spellName}.png`;
}

export function getProfileIconUrl(iconId: number = 588): string {
  return `${DDRAGON_BASE}/img/profileicon/${iconId}.png`;
}

export function getTierColor(tier: string): { bg: string; text: string; border: string; glow: string } {
  switch (tier.toUpperCase()) {
    case 'CHALLENGER':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' };
    case 'GRANDMASTER':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', glow: 'shadow-rose-500/20' };
    case 'MASTER':
      return { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' };
    case 'DIAMOND':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' };
    case 'EMERALD':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' };
    case 'PLATINUM':
      return { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30', glow: 'shadow-teal-500/20' };
    default:
      return { bg: 'bg-slate-700/20', text: 'text-slate-300', border: 'border-slate-700', glow: 'shadow-slate-500/10' };
  }
}


export function formatRankLabel(tier: string, division: string, lp: number): string {
  const normalizedTier = (tier || '').toUpperCase();
  const normalizedDivision = (division || '').toUpperCase();
  const points = Number.isFinite(Number(lp)) ? Number(lp) : 0;
  const apexTier = normalizedTier === 'MASTER' || normalizedTier === 'GRANDMASTER' || normalizedTier === 'CHALLENGER';

  if (apexTier) return `${normalizedTier} · ${points} LP`;
  if (!normalizedTier || normalizedTier === 'UNRANKED') return 'Sin ranking';
  return `${normalizedTier} ${normalizedDivision} · ${points} LP`;
}

export function getOpGgUrl(gameName: string, tagLine: string, region: string = 'na'): string {
  const reg = region.toLowerCase();
  const nameClean = encodeURIComponent(gameName.trim());
  const tagClean = encodeURIComponent(tagLine.trim());
  return `https://op.gg/lol/summoners/${reg}/${nameClean}-${tagClean}`;
}

export function getDpmLolUrl(gameName: string, tagLine: string): string {
  const nameClean = encodeURIComponent(gameName.trim());
  const tagClean = encodeURIComponent(tagLine.trim());
  return `https://dpm.lol/${nameClean}-${tagClean}`;
}

export function getOpGgMultiSearchUrl(players: { gameName: string; tagLine: string }[], region: string = 'na'): string {
  const reg = region.toLowerCase();
  const summonersQuery = players
    .map((p) => `${encodeURIComponent(p.gameName.trim())}%23${encodeURIComponent(p.tagLine.trim())}`)
    .join(',');
  return `https://op.gg/lol/multisearch/${reg}?summoners=${summonersQuery}`;
}
