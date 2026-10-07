import React, { useState } from 'react';
import { PlayerProfile } from '../types/lol';
import { X, PlusCircle, Check } from 'lucide-react';

interface SimulateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerProfile[];
  onGameSimulated: (updatedPlayers: PlayerProfile[]) => void;
}

export const SimulateMatchModal: React.FC<SimulateMatchModalProps> = ({
  isOpen,
  onClose,
  players,
  onGameSimulated,
}) => {
  if (!isOpen) return null;

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || 'jojopyun');
  const [isWin, setIsWin] = useState<boolean>(true);
  const [championName, setChampionName] = useState<string>('Sylas');
  const [kills, setKills] = useState<number>(8);
  const [deaths, setDeaths] = useState<number>(1);
  const [assists, setAssists] = useState<number>(7);
  const [cs, setCs] = useState<number>(260);
  const [lpChange, setLpChange] = useState<number>(22);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  const handlePlayerChange = (id: string) => {
    setSelectedPlayerId(id);
    const p = players.find((x) => x.id === id);
    if (p && p.champions[0]) {
      setChampionName(p.champions[0].championName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/players/simulate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          win: isWin,
          championName,
          kills,
          deaths,
          assists,
          cs,
          lpChange: isWin ? Math.abs(lpChange) : -Math.abs(lpChange),
        }),
      });

      const data = await res.json();
      if (data.success && data.players) {
        onGameSimulated(data.players);
        setSuccessMessage(data.message || 'Partida registrada con éxito');
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 1200);
      }
    } catch (err) {
      console.error('Error simulating game:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-amber-400">
          <PlusCircle className="h-5 w-5" />
          <h3 className="text-lg font-bold text-white">Registrar Nueva Partida Ranked</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Añade un resultado para comprobar cómo se recalculan en vivo los LP, el Winrate, la racha y los rankings de forma y elo.
        </p>

        {successMessage ? (
          <div className="my-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-semibold text-emerald-300">
            {successMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
            {/* Player Selection */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">Jugador</label>
              <select
                value={selectedPlayerId}
                onChange={(e) => handlePlayerChange(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.proName} ({p.role}) · {p.riotId} — {p.tier} {p.division} {p.lp} LP
                  </option>
                ))}
              </select>
            </div>

            {/* Outcome */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">Resultado de la partida</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsWin(true)}
                  className={`rounded-xl border py-2.5 font-bold transition ${
                    isWin
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Victoria (VICTORY)
                </button>
                <button
                  type="button"
                  onClick={() => setIsWin(false)}
                  className={`rounded-xl border py-2.5 font-bold transition ${
                    !isWin
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Derrota (DEFEAT)
                </button>
              </div>
            </div>

            {/* Champion & LP Change */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Campeón</label>
                <input
                  type="text"
                  value={championName}
                  onChange={(e) => setChampionName(e.target.value)}
                  placeholder="ej. Sylas, Draven, Gwen"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Variación LP</label>
                <input
                  type="number"
                  value={lpChange}
                  onChange={(e) => setLpChange(Number(e.target.value))}
                  placeholder="ej. 20"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* K / D / A / CS */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Kills</label>
                <input
                  type="number"
                  value={kills}
                  onChange={(e) => setKills(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Deaths</label>
                <input
                  type="number"
                  value={deaths}
                  onChange={(e) => setDeaths(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Assists</label>
                <input
                  type="number"
                  value={assists}
                  onChange={(e) => setAssists(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">CS</label>
                <input
                  type="number"
                  value={cs}
                  onChange={(e) => setCs(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-amber-500 px-5 py-2 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar y Recalcular'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
