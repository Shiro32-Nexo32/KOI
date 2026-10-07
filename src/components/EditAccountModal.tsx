import React, { useState } from 'react';
import { PlayerProfile } from '../types/lol';
import { X, Save, Edit3 } from 'lucide-react';

interface EditAccountModalProps {
  player: PlayerProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onAccountUpdated: (player: PlayerProfile) => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  player,
  isOpen,
  onClose,
  onAccountUpdated,
}) => {
  if (!isOpen || !player) return null;

  const [riotId, setRiotId] = useState(player.riotId);
  const [region, setRegion] = useState(player.region);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riotId.includes('#')) {
      alert('El Riot ID debe contener el formato Nombre#TAG (ej. Shirin#ilmgf)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/players/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          riotId,
          region,
        }),
      });

      const data = await res.json();
      if (data.success && data.player) {
        onAccountUpdated(data.player);
        onClose();
      }
    } catch (err) {
      console.error('Error updating account:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-amber-400">
          <Edit3 className="h-5 w-5" />
          <h3 className="text-lg font-bold text-white">Editar Cuenta de {player.proName}</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Modifica el Riot ID (Nombre#TAG) o región para adaptar el seguimiento si el jugador renombra o cambia de cuenta en NA/EUW.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Riot ID Completo (Nombre#TAG)</label>
            <input
              type="text"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              placeholder="Nombre#TAG (ej. Shirin#ilmgf)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Región del Servidor</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500"
            >
              <option value="NA">NA (Norteamérica)</option>
              <option value="EUW">EUW (Europa Oeste)</option>
              <option value="KR">KR (Corea)</option>
              <option value="EUNE">EUNE (Europa Nórdica y Este)</option>
            </select>
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
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Cuenta'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
