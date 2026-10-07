import React, { useEffect, useState } from 'react';
import { PlayerProfile, LPSnapshot } from '../types/lol';
import { getTierColor } from '../utils/ddragon';
import { TrendingUp, Clock, Award, Milestone, ArrowRight } from 'lucide-react';

interface EvolutionViewProps {
  players: PlayerProfile[];
  onSelectPlayer: (id: string) => void;
}

export const EvolutionView: React.FC<EvolutionViewProps> = ({
  players,
  onSelectPlayer,
}) => {
  const [activePlayerId, setActivePlayerId] = useState<string>(players[0]?.id || 'jojopyun');

  useEffect(() => {
    if (!players.some((p) => p.id === activePlayerId)) {
      setActivePlayerId(players[0]?.id || '');
    }
  }, [players, activePlayerId]);

  const activePlayer = players.find((p) => p.id === activePlayerId) || players[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white">Evolución Temporal de LP y Snapshots</h2>
        <p className="text-xs text-slate-400">
          Histórico secuencial del ladder. Se crea un snapshot cuando la sincronización detecta un cambio de rango o LP.
        </p>
      </div>

      {/* Cross-Team Progression Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {players.map((p) => {
          const isSelected = p.id === activePlayer.id;
          const tierStyle = getTierColor(p.tier);
          const firstSnap = p.snapshots[0];
          const lastSnap = p.snapshots[p.snapshots.length - 1];
          const delta = firstSnap && lastSnap ? ladderValue(lastSnap) - ladderValue(firstSnap) : 0;

          return (
            <div
              key={p.id}
              onClick={() => { setActivePlayerId(p.id); onSelectPlayer(p.id); }}
              className={`cursor-pointer rounded-xl border p-4 transition ${
                isSelected
                  ? 'border-amber-500 bg-slate-900 shadow-md'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{p.proName}</span>
                <span className="font-mono text-[10px] text-slate-400">{p.role}</span>
              </div>

              <div className="mt-2">
                <span className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-semibold ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                  {p.tier} {p.division} · {p.lp} LP
                </span>
              </div>

              {/* Trajectory pills */}
              <div className="mt-3 flex items-center gap-1 font-mono text-[11px] text-slate-400">
                <span className="text-slate-500">
                  {firstSnap ? `${firstSnap.tier} ${firstSnap.division} ${firstSnap.lp}` : 'Inicio'}
                </span>
                <ArrowRight className="h-3 w-3 text-amber-500" />
                <span className="font-bold text-emerald-400">
                  {lastSnap ? `${lastSnap.tier} ${lastSnap.division} ${lastSnap.lp}` : `${p.tier} ${p.lp}`}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-600">
                {p.snapshots.length > 1 ? `Cambio registrado: ${delta >= 0 ? '+' : ''}${delta} puntos de ladder` : 'Primer snapshot registrado'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Player Detailed Timeline Journey */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Milestone className="h-4 w-4 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Trayectoria de {activePlayer.proName} ({activePlayer.riotId})
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Rango actual: {activePlayer.tier} {activePlayer.division} ({activePlayer.lp} LP) · Balance: {activePlayer.wins}W - {activePlayer.losses}L
            </span>
          </div>

          <div className="font-mono text-xs text-amber-400">
            {activePlayer.snapshots.length} Snapshots registrados
          </div>
        </div>

        {/* Visual Progress Stepper */}
        <div className="mt-6 space-y-6">
          <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {activePlayer.snapshots.map((snap, idx) => {
              const isLast = idx === activePlayer.snapshots.length - 1;
              const dateStr = new Date(snap.timestamp).toLocaleDateString('es-ES', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={idx} className="relative mb-6 last:mb-0">
                  {/* Dot */}
                  <div
                    className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 ${
                      isLast
                        ? 'border-amber-400 bg-amber-500 shadow-sm shadow-amber-500/50'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  />

                  {/* Content card */}
                  <div className={`rounded-xl border p-4 transition ${
                    isLast
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-slate-800/80 bg-slate-950/60'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-white">
                          {snap.tier} {snap.division} · {snap.lp} LP
                        </span>
                        {isLast && (
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                            Estado Actual
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dateStr}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        {snap.note || `Actualización de MMR y puntos (${snap.lp} LP)`}
                      </span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {snap.wins}W - {snap.losses}L
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


function ladderValue(snapshot: LPSnapshot): number {
  const tierWeight: Record<string, number> = {
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
  const divisionWeight: Record<string, number> = { I: 400, II: 300, III: 200, IV: 100 };
  return (tierWeight[snapshot.tier] || 0) + (divisionWeight[snapshot.division] || 0) + snapshot.lp;
}
