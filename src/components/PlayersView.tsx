import React, { useState } from 'react';
import { PlayerProfile } from '../types/lol';
import { getChampionIconUrl, getItemIconUrl, getTierColor, getOpGgUrl, getDpmLolUrl, getProfileIconUrl, formatRankLabel } from '../utils/ddragon';
import { Flame, Trophy, Swords, Shield, Crosshair, BarChart3, ArrowRight, ExternalLink } from 'lucide-react';

interface PlayersViewProps {
  players: PlayerProfile[];
  selectedPlayerId: string;
  onSelectPlayer: (id: string) => void;
  onAskAboutPlayer: (playerName: string) => void;
}

export const PlayersView: React.FC<PlayersViewProps> = ({
  players,
  selectedPlayerId,
  onSelectPlayer,
  onAskAboutPlayer,
}) => {
  const activePlayer = players.find((p) => p.id === selectedPlayerId) || players[0];
  const tierStyle = getTierColor(activePlayer.tier);

  return (
    <div className="space-y-6">
      {/* Player Selection Segmented Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        {players.map((p) => {
          const isActive = p.id === activePlayer.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPlayer(p.id)}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <span className={`font-mono text-xs ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                {p.role}
              </span>
              <span>{p.proName}</span>
              <span className={`font-mono text-xs ${isActive ? 'text-slate-900 font-semibold' : 'text-emerald-400'}`}>
                {p.winrate}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Player Profile Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Player Identity & Ranks */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <img
                  src={getProfileIconUrl(activePlayer.profileIconId)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl border border-slate-700 object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">{activePlayer.proName}</h2>
                  <span className="font-mono text-xs text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded">
                    {activePlayer.role}
                  </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{activePlayer.realName} · {activePlayer.team}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      {activePlayer.riotId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-block rounded px-2.5 py-1 font-mono text-xs font-bold ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                  {formatRankLabel(activePlayer.tier, activePlayer.division, activePlayer.lp)}
                </span>
                <div className="mt-1 font-mono text-xs text-slate-400">
                  Rango visible en Solo/Dúo
                </div>
              </div>
            </div>

            {/* LP Progress */}
            <div className="mt-5 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">{activePlayer.lp} / 100 LP</span>
                <span className="text-emerald-400 font-semibold">
                  {activePlayer.wins}W - {activePlayer.losses}L ({activePlayer.winrate}% WR)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full ${activePlayer.tier === 'MASTER' ? 'bg-purple-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, activePlayer.lp)}%` }}
                />
              </div>
            </div>

            {/* Metrics Cluster */}
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4">
              <div className="rounded-xl bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-500">KDA Promedio</span>
                <div className="font-mono text-lg font-bold text-white">{activePlayer.avgKda}</div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {activePlayer.avgKills} / {activePlayer.avgDeaths} / {activePlayer.avgAssists}
                </span>
              </div>

              <div className="rounded-xl bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-500">CS / Minuto</span>
                <div className="font-mono text-lg font-bold text-white">{activePlayer.avgCsPerMin}</div>
                <span className="text-[11px] text-slate-400 font-mono">KP: {activePlayer.avgKillParticipationPct}%</span>
              </div>

              <div className="rounded-xl bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-500">Racha Reciente</span>
                <div className="font-mono text-lg font-bold text-amber-400">
                  {activePlayer.streak > 0 ? `+${activePlayer.streak} Wins` : activePlayer.streak < 0 ? `${activePlayer.streak} Losses` : 'Sin racha'}
                </div>
                <span className="text-[11px] text-slate-400">Últimos resultados</span>
              </div>

              <div className="rounded-xl bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-500">Rankings Equipo</span>
                <div className="font-mono text-sm font-semibold text-slate-200">
                  Forma: <span className="text-amber-400">#{activePlayer.formRank}</span> · Rango: <span className="text-purple-300">#{activePlayer.eloRank}</span>
                </div>
                <span className="text-[11px] text-slate-400">Entre las 5 cuentas</span>
              </div>
            </div>

            {/* Quick Ask CTA & External Links */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => onAskAboutPlayer(activePlayer.proName)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                <span>Preguntar al Analista sobre {activePlayer.proName}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={getOpGgUrl(activePlayer.gameName, activePlayer.tagLine, activePlayer.region)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  <span>Ver en OP.GG</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <a
                  href={getDpmLolUrl(activePlayer.gameName, activePlayer.tagLine)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  <span>Ver en DPM.LOL</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Analyst Summary Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Evaluación Táctica de {activePlayer.proName}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {activePlayer.analystSummary}
            </p>
          </div>
        </div>

        {/* Right Column: Champion Pool & Recent Matches Preview */}
        <div className="space-y-6 lg:col-span-2">
          {/* Champion Pool Matrix */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Pool de campeones reciente</h3>
                <p className="text-xs text-slate-400">Partidas, porcentaje de victoria y estadísticas individuales</p>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {activePlayer.champions.length} Picks Diferentes
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-medium">Campeón</th>
                    <th className="pb-3 font-medium text-center">Partidas</th>
                    <th className="pb-3 font-medium text-center">Winrate</th>
                    <th className="pb-3 font-medium text-center">KDA</th>
                    <th className="pb-3 font-medium text-right">CS / min</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activePlayer.champions.map((champ) => {
                    return (
                      <tr key={champ.championId} className="transition hover:bg-slate-800/40">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getChampionIconUrl(champ.championName)}
                              alt={champ.championName}
                              className="h-8 w-8 rounded-lg border border-slate-700 object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-semibold text-white">{champ.championName}</span>
                              <div className="font-mono text-[10px] text-slate-400">
                                {champ.kills}/{champ.deaths}/{champ.assists}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 text-center font-mono tabular-nums text-slate-300">
                          {champ.games} ({champ.wins}W - {champ.losses}L)
                        </td>

                        <td className="py-3 text-center">
                          <div className="inline-flex items-center gap-2">
                            <span className={`font-mono font-bold tabular-nums ${champ.winrate >= 80 ? 'text-emerald-400' : 'text-slate-200'}`}>
                              {champ.winrate}%
                            </span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${champ.winrate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 text-center font-mono font-bold tabular-nums text-slate-200">
                          {champ.kda}
                        </td>

                        <td className="py-3 text-right font-mono tabular-nums text-slate-300">
                          {champ.csPerMin}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Ranked Games for this player */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Últimas partidas recibidas</h3>
                <p className="text-xs text-slate-400">Historial recibido desde OP.GG</p>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {activePlayer.recentMatches.length} Partidas
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {activePlayer.recentMatches.map((m) => {
                const isWin = m.win;
                return (
                  <div
                    key={m.matchId}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                      isWin
                        ? 'border-emerald-950/60 bg-emerald-950/20 hover:bg-emerald-950/30'
                        : 'border-rose-950/60 bg-rose-950/20 hover:bg-rose-950/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={getChampionIconUrl(m.championName)}
                          alt={m.championName}
                          className="h-11 w-11 rounded-xl border border-slate-700 object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 rounded-tl bg-slate-950 px-1 font-mono text-[9px] text-slate-300">
                          {m.champLevel}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? 'Victoria' : 'Derrota'}
                          </span>
                          <span className="font-semibold text-white">{m.championName}</span>
                          {m.tags && m.tags.map((t) => (
                            <span key={t} className="rounded bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] text-amber-300 border border-amber-500/30">
                              {t}
                            </span>
                          ))}
                        </div>

                        <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-slate-300">
                          <span>{m.kills} / {m.deaths} / {m.assists}</span>
                          <span className="text-slate-500">·</span>
                          <span className="font-bold text-amber-400">{m.kda} KDA</span>
                          <span className="text-slate-500">·</span>
                          <span>{m.cs} CS ({m.csPerMin}/m)</span>
                        </div>
                      </div>
                    </div>

                    {/* Items row */}
                    <div className="flex items-center gap-1">
                      {m.items.slice(0, 6).map((item, idx) => {
                        const iconUrl = getItemIconUrl(item);
                        return iconUrl ? (
                          <img
                            key={idx}
                            src={iconUrl}
                            alt={`Item ${item}`}
                            className="h-6 w-6 rounded border border-slate-700/60 object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div key={idx} className="h-6 w-6 rounded border border-slate-800 bg-slate-900/80" />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
