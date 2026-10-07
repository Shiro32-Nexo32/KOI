import React from 'react';
import {
  ArrowRight,
  ExternalLink,
  Flame,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { PlayerProfile } from '../types/lol';
import { getChampionIconUrl, getOpGgMultiSearchUrl, getOpGgUrl, getTierColor, formatRankLabel } from '../utils/ddragon';

interface OverviewViewProps {
  players: PlayerProfile[];
  onSelectPlayer: (playerId: string) => void;
  onNavigateToAnalyst: () => void;
  sourceStatus: 'live' | 'cached' | 'seed';
  lastUpdated: number | null;
}

function syncAge(timestamp: number | null): string {
  if (!timestamp) return 'sin sincronización confirmada';
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'hace menos de 1 min';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function getFormScore(player: PlayerProfile): number {
  return (
    player.winrate * 1.5 +
    player.streak * 4 +
    player.avgKda * 2.5 +
    (player.wins / Math.max(1, player.wins + player.losses)) * 50
  );
}

function formatRank(player: PlayerProfile): string {
  return formatRankLabel(player.tier, player.division, player.lp);
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  players,
  onSelectPlayer,
  onNavigateToAnalyst,
  sourceStatus,
  lastUpdated,
}) => {
  const totalWins = players.reduce((sum, player) => sum + player.wins, 0);
  const totalLosses = players.reduce((sum, player) => sum + player.losses, 0);
  const totalGames = totalWins + totalLosses;
  const globalWinrate = totalGames ? ((totalWins / totalGames) * 100).toFixed(1) : '0.0';

  const eloOrdered = [...players].sort((a, b) => a.eloRank - b.eloRank);
  const formOrdered = [...players].sort((a, b) => getFormScore(b) - getFormScore(a));
  const ladderLeader = eloOrdered[0];
  const formLeader = formOrdered[0];
  const streakLeader = [...players].sort((a, b) => Math.abs(b.streak) - Math.abs(a.streak))[0];
  const highestKda = [...players].sort((a, b) => b.avgKda - a.avgKda)[0];

  const sourceTone =
    sourceStatus === 'live'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : sourceStatus === 'cached'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : 'border-slate-700 bg-slate-900 text-slate-400';

  const sourceLabel =
    sourceStatus === 'live'
      ? 'DATOS OP.GG'
      : sourceStatus === 'cached'
        ? 'CACHÉ'
        : 'RESPALDO';

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-amber-400">
              <span>KOI · MKOI</span>
              <span className="text-slate-700">/</span>
              <span className="text-slate-500">NORTEAMÉRICA</span>
              <span className="text-slate-700">/</span>
              <span className="text-slate-500">5 CUENTAS</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-md border px-2 py-1 text-[10px] font-bold tracking-wider ${sourceTone}`}>
                {sourceLabel}
              </span>
              <span className="text-xs text-slate-500">
                {syncAge(lastUpdated)}
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Tracker de SoloQ
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Un panel dedicado a las cuentas monitorizadas de KOI: rango actual, LP,
                forma reciente, historial de partidas, pool de campeones y evolución.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center sm:p-4">
              <span className="text-[11px] text-slate-500">Balance</span>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                {totalWins}-{totalLosses}
              </div>
              <span className="text-[10px] text-emerald-400">{globalWinrate}% WR</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center sm:p-4">
              <span className="text-[11px] text-slate-500">Ladder</span>
              <div className="mt-1 text-lg font-bold text-purple-300 sm:text-xl">
                {ladderLeader?.proName ?? '—'}
              </div>
              <span className="text-[10px] text-slate-400">
                {ladderLeader ? formatRank(ladderLeader) : '—'}
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center sm:p-4">
              <span className="text-[11px] text-slate-500">Mejor KDA</span>
              <div className="mt-1 text-lg font-bold text-amber-300 sm:text-xl">
                {highestKda?.avgKda ?? '—'}
              </div>
              <span className="text-[10px] text-slate-400">{highestKda?.proName ?? '—'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Forma</h2>
                <span className="text-xs text-slate-500">Momentum calculado con rendimiento reciente</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-amber-400">DINÁMICO</span>
          </div>

          <div className="mt-4 space-y-2">
            {formOrdered.map((player, index) => {
              const style = getTierColor(player.tier);
              return (
                <button
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-left transition hover:border-amber-500/40 hover:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 font-mono text-xs font-bold text-slate-500 group-hover:text-amber-400">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{player.proName}</span>
                        <span className="font-mono text-[10px] text-slate-600">{player.role}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                        <span>{player.wins}-{player.losses}</span>
                        <span>{player.winrate}% WR</span>
                        <span>KDA {player.avgKda}</span>
                        <span>{player.avgCsPerMin} CS/m</span>
                      </div>
                    </div>
                  </div>
                  <span className={`hidden rounded-md border px-2 py-1 font-mono text-[10px] font-semibold sm:inline-block ${style.bg} ${style.text} ${style.border}`}>
                    {formatRank(player)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-slate-800/70 pt-4 text-xs text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            <span>
              Líder actual de forma: <strong className="text-slate-300">{formLeader?.proName ?? '—'}</strong>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Ladder</h2>
                <span className="text-xs text-slate-500">Ordenado por rango + LP</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-purple-300">RANGO</span>
          </div>

          <div className="mt-4 space-y-2">
            {eloOrdered.map((player, index) => {
              const style = getTierColor(player.tier);
              return (
                <button
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-left transition hover:border-purple-500/40 hover:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 font-mono text-xs font-bold text-slate-500 group-hover:text-purple-400">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white">{player.proName}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {player.wins}W · {player.losses}L · {player.winrate}% WR
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-md border px-2 py-1 font-mono text-[10px] font-semibold ${style.bg} ${style.text} ${style.border}`}>
                    {formatRank(player)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-slate-800/70 pt-4 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
            <span>
              La posición se recalcula por rango visible y LP; no representa el puesto global de NA.
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Las 5 cuentas monitorizadas</h2>
            <p className="text-xs text-slate-500">
              Accede al perfil interno, historial, evolución y fuente externa de cada cuenta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={getOpGgMultiSearchUrl(players, 'na')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/20"
            >
              Ver las 5 en OP.GG
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={onNavigateToAnalyst}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              Analizar equipo
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => {
            const style = getTierColor(player.tier);
            const topChampion = player.champions[0];
            const progress = Math.min(100, Math.max(0, player.lp));

            return (
              <button
                key={player.id}
                onClick={() => onSelectPlayer(player.id)}
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900 hover:shadow-xl"
              >
                <div className="absolute right-0 top-0 h-28 w-28 translate-x-1/3 -translate-y-1/3 rounded-full bg-amber-500/5 blur-2xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                      <img
                        src={getChampionIconUrl(topChampion?.championName || 'Ahri')}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-110"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white group-hover:text-amber-300">{player.proName}</div>
                      <div className="truncate font-mono text-[11px] text-slate-500">{player.riotId}</div>
                      <div className="mt-1 text-[10px] font-semibold tracking-wider text-slate-600">{player.role}</div>
                    </div>
                  </div>

                  <span className={`rounded-md border px-2 py-1 font-mono text-[10px] font-semibold ${style.bg} ${style.text} ${style.border}`}>
                    {player.tier} {player.division}
                  </span>
                </div>

                <div className="relative mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-500">{player.lp} LP</span>
                    <span className="text-emerald-400">{player.winrate}% WR</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${player.tier === 'MASTER' ? 'bg-purple-500' : 'bg-amber-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-center">
                  <div>
                    <span className="text-[10px] text-slate-600">KDA</span>
                    <div className="font-mono text-sm font-bold text-slate-200">{player.avgKda}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600">CS/m</span>
                    <div className="font-mono text-sm font-bold text-slate-200">{player.avgCsPerMin}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600">Racha</span>
                    <div className="font-mono text-sm font-bold text-amber-300">
                      {player.streak > 0 ? `+${player.streak}W` : player.streak < 0 ? `${player.streak}L` : '—'}
                    </div>
                  </div>
                </div>

                <div className="relative mt-3 rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">Pick principal</span>
                    <span className="font-semibold text-slate-200">
                      {topChampion ? `${topChampion.championName} · ${topChampion.winrate}%` : 'Sin datos'}
                    </span>
                  </div>
                </div>

                <div className="relative mt-3 flex items-center justify-end gap-2 text-[10px] font-mono">
                  <span className="text-slate-600">Fuente externa</span>
                  <a
                    href={getOpGgUrl(player.gameName, player.tagLine, player.region)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                  >
                    OP.GG
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Sincronización</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            GitHub Actions consulta OP.GG cada 15 minutos y publica un snapshot compartido para la web.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Analítica</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Rankings, rachas, KDA y pool de campeones se recalculan a partir de las partidas disponibles.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Histórico</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Los cambios de rango y LP se guardan como snapshots para que la evolución no dependa del estado actual.
          </p>
        </div>
      </section>
    </div>
  );
};
