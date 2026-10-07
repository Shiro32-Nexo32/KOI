import React, { useEffect, useState } from 'react';
import { PlayerProfile, MatchRecord } from '../types/lol';
import { getChampionIconUrl, getItemIconUrl, getSpellIconUrl } from '../utils/ddragon';
import { BarChart3, Filter, Trophy } from 'lucide-react';

interface MatchesViewProps {
  players: PlayerProfile[];
  selectedPlayerId?: string;
  onSelectPlayer: (id: string) => void;
}

interface EnrichedMatch extends MatchRecord {
  playerId: string;
  proName: string;
  riotId: string;
  playerRole: string;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  players,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const [filterPlayer, setFilterPlayer] = useState<string>(selectedPlayerId || 'all');
  const [filterOutcome, setFilterOutcome] = useState<'all' | 'win' | 'loss'>('all');
  const [minKda, setMinKda] = useState<'all' | '5' | '8'>('all');

  useEffect(() => {
    setFilterPlayer(selectedPlayerId || 'all');
  }, [selectedPlayerId]);

  // Flatten and enrich matches
  const allMatches: EnrichedMatch[] = [];
  players.forEach((p) => {
    p.recentMatches.forEach((m) => {
      allMatches.push({
        ...m,
        playerId: p.id,
        proName: p.proName,
        riotId: p.riotId,
        playerRole: p.role,
      });
    });
  });

  // Sort by game creation descending
  allMatches.sort((a, b) => b.gameCreation - a.gameCreation);

  // Filter
  const filtered = allMatches.filter((m) => {
    if (filterPlayer !== 'all') {
      const p = players.find((x) => x.id === filterPlayer);
      if (p && m.proName !== p.proName) return false;
    }
    if (filterOutcome === 'win' && !m.win) return false;
    if (filterOutcome === 'loss' && m.win) return false;
    if (minKda === '5' && m.kda < 5) return false;
    if (minKda === '8' && m.kda < 8) return false;
    return true;
  });

  const filteredWins = filtered.filter((match) => match.win).length;
  const filteredLosses = filtered.length - filteredWins;
  const filteredWinrate = filtered.length ? ((filteredWins / filtered.length) * 100).toFixed(1) : '0.0';

  const handlePlayerFilter = (id: string) => {
    setFilterPlayer(id);
    if (id !== 'all') onSelectPlayer(id);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-cyan-400">
              <BarChart3 className="h-3.5 w-3.5" />
              OP.GG · TELEMETRÍA DE PARTIDAS
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Historial de SoloQ</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              Últimas partidas disponibles de las cinco cuentas, con KDA, farm, daño, visión, campeones,
              hechizos e inventario.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-center">
              <div className="text-[10px] text-slate-500">Mostradas</div>
              <div className="mt-1 font-mono text-xl font-bold text-white">{filtered.length}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-center">
              <div className="text-[10px] text-slate-500">Balance</div>
              <div className="mt-1 font-mono text-xl font-bold text-white">{filteredWins}-{filteredLosses}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-center">
              <div className="text-[10px] text-slate-500">WR</div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-400">{filteredWinrate}%</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Filtrar
          </div>
          {/* Player Selector */}
          <select
            value={filterPlayer}
            onChange={(e) => handlePlayerFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none focus:border-amber-500"
          >
            <option value="all">Todos los jugadores (5)</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.proName} ({p.role})
              </option>
            ))}
          </select>

          {/* Outcome Filter */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
            <button
              onClick={() => setFilterOutcome('all')}
              className={`rounded px-2.5 py-1 ${filterOutcome === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterOutcome('win')}
              className={`rounded px-2.5 py-1 ${filterOutcome === 'win' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Victorias
            </button>
            <button
              onClick={() => setFilterOutcome('loss')}
              className={`rounded px-2.5 py-1 ${filterOutcome === 'loss' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Derrotas
            </button>
          </div>

          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
            {([
              ['all', 'Cualquier KDA'],
              ['5', 'KDA ≥ 5'],
              ['8', 'KDA ≥ 8'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setMinKda(value)}
                className={`rounded px-2.5 py-1 ${minKda === value ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-600">
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        <span>{allMatches.length} partidas recibidas de las cinco cuentas · ordenadas por hora de inicio</span>
      </div>

      {/* Match Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
            <p className="text-sm text-slate-400">No se encontraron partidas con los filtros seleccionados.</p>
          </div>
        ) : (
          filtered.map((match) => {
            const isWin = match.win;
            const durationMin = Math.floor(match.gameDurationSeconds / 60);
            const durationSec = match.gameDurationSeconds % 60;
            const timeAgo = formatTimeAgo(match.gameCreation);

            return (
              <div
                key={match.playerId + match.matchId}
                className={`relative flex flex-col gap-4 rounded-xl border p-4 transition-all duration-150 lg:flex-row lg:items-center lg:justify-between ${
                  isWin
                    ? 'border-emerald-950/60 bg-gradient-to-r from-emerald-950/30 via-slate-950/80 to-slate-950 hover:border-emerald-800/60'
                    : 'border-rose-950/60 bg-gradient-to-r from-rose-950/30 via-slate-950/80 to-slate-950 hover:border-rose-800/60'
                }`}
              >
                {/* Left zone: Outcome, Pro, Champion, Spells */}
                <div className="flex items-center gap-4">
                  {/* Result indicator bar */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`font-mono text-xs font-bold uppercase tracking-wider ${
                        isWin ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isWin ? 'Victoria' : 'Derrota'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {durationMin}m {durationSec}s
                    </span>
                    <span className="text-[10px] text-slate-500">{timeAgo}</span>
                  </div>

                  {/* Champion Icon + Level */}
                  <div className="relative">
                    <img
                      src={getChampionIconUrl(match.championName)}
                      alt={match.championName}
                      className="h-12 w-12 rounded-xl border border-slate-700 object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-1 -right-1 rounded bg-slate-950 px-1 font-mono text-[9px] font-bold text-slate-300 border border-slate-800">
                      {match.champLevel}
                    </span>
                  </div>

                  {/* Spells */}
                  <div className="flex flex-col gap-1">
                    {match.spells.map((spell, i) => {
                      const spellUrl = getSpellIconUrl(spell);
                      return spellUrl ? (
                        <img
                          key={i}
                          src={spellUrl}
                          alt={spell}
                          className="h-5 w-5 rounded border border-slate-700 object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div key={i} className="h-5 w-5 rounded bg-slate-800" />
                      );
                    })}
                  </div>

                  {/* Player & Role Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{match.proName}</span>
                      <span className="font-mono text-xs text-slate-400">({match.championName})</span>
                      <span className="font-mono text-[10px] text-amber-400 border border-amber-500/20 bg-amber-500/10 px-1.5 rounded">
                        {match.playerRole}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {match.tags &&
                        match.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                              tag === 'MVP'
                                ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                                : tag === 'Hypercarry'
                                ? 'border border-purple-500/40 bg-purple-500/20 text-purple-300'
                                : 'border border-slate-700 bg-slate-800 text-slate-300'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      {match.laneOpponentChamp && (
                        <span className="text-[11px] text-slate-500">
                          vs {match.laneOpponentChamp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle zone: Telemetry (KDA, CS, Damage, KP) */}
                <div className="grid grid-cols-3 gap-3 border-y border-slate-800/60 py-2 sm:gap-6 lg:border-y-0 lg:py-0">
                  <div>
                    <div className="font-mono text-xs text-slate-400">KDA</div>
                    <div className="font-mono text-sm font-bold text-white">
                      {match.kills} / <span className="text-rose-400">{match.deaths}</span> / {match.assists}
                    </div>
                    <div className="font-mono text-[11px] text-amber-400">
                      {match.kda} KDA
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-xs text-slate-400">Farm (CS)</div>
                    <div className="font-mono text-sm font-bold text-white">
                      {match.cs} <span className="text-[11px] text-slate-400">({match.csPerMin}/m)</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      KP: {match.killParticipationPct}%
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-xs text-slate-400">Daño Infligido</div>
                    <div className="font-mono text-sm font-bold text-white">
                      {match.damageDealt.toLocaleString()}
                    </div>
                    <div className="font-mono text-[11px] text-emerald-400">
                      {match.damagePct}% del equipo
                    </div>
                  </div>
                </div>

                {/* Right zone: Items */}
                <div className="flex items-center gap-1">
                  {match.items.slice(0, 6).map((item, idx) => {
                    const iconUrl = getItemIconUrl(item);
                    return iconUrl ? (
                      <img
                        key={idx}
                        src={iconUrl}
                        alt={`Item ${item}`}
                        className="h-7 w-7 rounded border border-slate-700/80 object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div key={idx} className="h-7 w-7 rounded border border-slate-800 bg-slate-900/60" />
                    );
                  })}
                  {/* Trinket */}
                  {match.items[6] && getItemIconUrl(match.items[6]) ? (
                    <img
                      src={getItemIconUrl(match.items[6])}
                      alt="Trinket"
                      className="ml-1 h-7 w-7 rounded-full border border-amber-500/40 object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return `hace ${mins} min`;
  }
  const hours = Math.floor(diffSec / 3600);
  if (hours < 24) {
    return `hace ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
