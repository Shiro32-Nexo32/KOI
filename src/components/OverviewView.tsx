import React from 'react';
import { PlayerProfile, TeamOverviewReport } from '../types/lol';
import { getChampionIconUrl, getTierColor, getOpGgUrl, getOpGgMultiSearchUrl, getDpmLolUrl } from '../utils/ddragon';
import { Flame, Trophy, TrendingUp, Sparkles, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';

interface OverviewViewProps {
  players: PlayerProfile[];
  report: TeamOverviewReport;
  onSelectPlayer: (playerId: string) => void;
  onNavigateToAnalyst: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  players,
  report,
  onSelectPlayer,
  onNavigateToAnalyst,
}) => {
  // Compute overall squad stats
  const totalWins = players.reduce((sum, p) => sum + p.wins, 0);
  const totalLosses = players.reduce((sum, p) => sum + p.losses, 0);
  const totalGames = totalWins + totalLosses;
  const overallWinrate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0';

  // Sort players for form vs elo
  const formOrdered = [...players].sort((a, b) => a.formRank - b.formRank);
  const eloOrdered = [...players].sort((a, b) => a.eloRank - b.eloRank);

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400">
              <span>BOOTCAMP NORTEAMÉRICA (NA)</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">5 CUENTAS MONITORIZADAS</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400">EN TIEMPO REAL</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Reporte de Estado y Ladder Pro
            </h1>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              Seguimiento analítico de las últimas rankeds de los 5 jugadores de MAD Lions KOI:
              rango actual, balance reciente, winrates, KDA medio y proyección de ascenso hacia Master y Challenger.
            </p>
          </div>

          {/* Quick Squad Metric Cluster */}
          <div className="grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-4 sm:gap-4 lg:border-t-0 lg:pt-0">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center sm:p-4">
              <span className="text-xs text-slate-400">Balance Global</span>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white sm:text-2xl">
                {totalWins}-{totalLosses}
              </div>
              <span className="text-[11px] text-emerald-400">+{overallWinrate}% WR</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center sm:p-4">
              <span className="text-xs text-slate-400">Líder Ladder</span>
              <div className="mt-1 font-mono text-xl font-bold text-purple-300 sm:text-2xl">
                Supa
              </div>
              <span className="text-[11px] text-slate-400">Master 62 LP</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center sm:p-4">
              <span className="text-xs text-slate-400">Racha Más Larga</span>
              <div className="mt-1 font-mono text-xl font-bold text-amber-400 sm:text-2xl">
                8-0
              </div>
              <span className="text-[11px] text-amber-300">Jojopyun (100% WR)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Comparative Rankings (Form vs Elo) */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Ranking de Forma */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Ranking de Forma</h2>
                <span className="text-xs text-slate-400">Rendimiento reciente puro y momentum</span>
              </div>
            </div>
            <span className="font-mono text-xs text-amber-400">Últimas 20 Rankeds</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {formOrdered.map((player, idx) => {
              const tierStyling = getTierColor(player.tier);
              return (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition hover:border-amber-500/40 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold text-slate-400 group-hover:text-amber-400">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-amber-300">
                          {player.proName}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {player.role}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          ({player.riotId})
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                        <span className="text-emerald-400 font-mono font-medium">
                          {player.wins}-{player.losses} ({player.winrate}% WR)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>KDA {player.avgKda}</span>
                        <span aria-hidden="true">·</span>
                        <span>{player.avgCsPerMin} CS/m</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-semibold ${tierStyling.bg} ${tierStyling.text} border ${tierStyling.border}`}>
                      {player.tier} {player.division} · {player.lp} LP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-400 border-t border-slate-800/60 pt-3">
            <strong className="text-slate-300">Lectura analítica:</strong> Jojopyun está literalmente volando con un 100% de victorias y KDAs desorbitados, seguido por Alvaro y Supa.
          </p>
        </div>

        {/* Ranking de Elo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Ranking de Elo</h2>
                <span className="text-xs text-slate-400">Posición real acumulada en el ladder de NA</span>
              </div>
            </div>
            <span className="font-mono text-xs text-purple-300">Posición Ladder</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {eloOrdered.map((player, idx) => {
              const tierStyling = getTierColor(player.tier);
              return (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition hover:border-purple-500/40 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold text-slate-400 group-hover:text-purple-400">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-purple-300">
                          {player.proName}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {player.role}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          ({player.riotId})
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                        <span>{player.statusBadge}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-emerald-400">{player.wins}W - {player.losses}L</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-semibold ${tierStyling.bg} ${tierStyling.text} border ${tierStyling.border}`}>
                      {player.tier} {player.division} · {player.lp} LP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-400 border-t border-slate-800/60 pt-3">
            <strong className="text-slate-300">Lectura analítica:</strong> Supa es el líder indiscutible en Master (62 LP), mientras Alvaro y Elyoya empujan fuerte en Diamante I.
          </p>
        </div>
      </section>

      {/* 5 Registered Pro Accounts Detailed Table / Bento Grid */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Estado Actual de los 5 Jugadores</h2>
            <p className="text-xs text-slate-400">Haz clic en cualquier ficha para ver sus últimas 20 partidas y pool de campeones</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={getOpGgMultiSearchUrl(players, 'na')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 hover:border-cyan-500/50"
              title="Abrir las 5 cuentas a la vez en OP.GG Multi-Search"
            >
              <span>Ver los 5 en OP.GG</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              onClick={onNavigateToAnalyst}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              <span>Generar Reporte Completo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => {
            const tierStyle = getTierColor(p.tier);
            const mainChamp = p.champions[0];

            return (
              <div
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className="group relative cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900 hover:shadow-lg"
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Champion avatar thumbnail */}
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                      <img
                        src={getChampionIconUrl(mainChamp?.championName || 'Ahri')}
                        alt={mainChamp?.championName || p.proName}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 rounded-tl bg-slate-950/90 px-1 font-mono text-[9px] font-bold text-slate-300">
                        {p.role}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white group-hover:text-amber-300">
                          {p.proName}
                        </h3>
                        <span className="text-xs text-slate-400">· {p.realName.split(' ')[0]}</span>
                      </div>
                      <div className="font-mono text-xs text-slate-400">
                        {p.riotId}
                      </div>
                    </div>
                  </div>

                  <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                    {p.tier} {p.division}
                  </span>
                </div>

                {/* Progress LP bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-mono">{p.lp} / 100 LP</span>
                    <span className="text-emerald-400 font-mono font-medium">
                      {p.wins}W - {p.losses}L ({p.winrate}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full ${p.tier === 'MASTER' ? 'bg-purple-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, p.lp)}%` }}
                    />
                  </div>
                </div>

                {/* Performance stats row */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-center text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">KDA Medio</span>
                    <div className="font-mono font-bold text-slate-200">{p.avgKda}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">CS / min</span>
                    <div className="font-mono font-bold text-slate-200">{p.avgCsPerMin}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Racha</span>
                    <div className="font-mono font-bold text-amber-400">
                      {p.streak > 0 ? `+${p.streak} W` : `${p.streak} L`}
                    </div>
                  </div>
                </div>

                {/* Top Champion tag */}
                {mainChamp && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-300">
                    <span className="text-slate-400">Principal:</span>
                    <span className="font-semibold text-slate-200">
                      {mainChamp.championName} ({mainChamp.wins}-{mainChamp.losses}, {mainChamp.kda} KDA)
                    </span>
                  </div>
                )}

                {/* External tracker links */}
                <div
                  className="mt-3 flex items-center justify-end gap-2 text-[11px] font-mono border-t border-slate-800/60 pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={getOpGgUrl(p.gameName, p.tagLine, p.region)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
                    title={`Ver historial de ${p.proName} en OP.GG`}
                  >
                    <span>OP.GG</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                  <span className="text-slate-600">·</span>
                  <a
                    href={getDpmLolUrl(p.gameName, p.tagLine)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 hover:underline"
                    title={`Ver cuenta pro en DPM.LOL`}
                  >
                    <span>DPM.LOL</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Session Tactical Insights */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h2 className="text-base font-bold text-white">Claves Tácticas del Bootcamp</h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">Análisis y conclusiones extraídas de las últimas sesiones</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.keyInsights.map((insight, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
              <span className="text-[11px] font-mono font-bold text-amber-400">
                {insight.tag}
              </span>
              <h3 className="mt-1 font-semibold text-white text-sm">{insight.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{insight.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
