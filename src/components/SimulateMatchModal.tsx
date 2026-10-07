import React, { useEffect, useState } from 'react';
import { PlayerProfile, MatchRecord, LPSnapshot } from '../types/lol';
import { X, PlusCircle } from 'lucide-react';

interface SimulateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerProfile[];
  onGameSimulated: (updatedPlayers: PlayerProfile[]) => void;
}

const TIER_WEIGHT: Record<string, number> = {
  CHALLENGER: 10000, GRANDMASTER: 9000, MASTER: 8000, DIAMOND: 7000,
  EMERALD: 6000, PLATINUM: 5000, GOLD: 4000, SILVER: 3000, BRONZE: 2000, IRON: 1000,
};

const DIV_WEIGHT: Record<string, number> = { I: 400, II: 300, III: 200, IV: 100 };

function recalculateLocalRankings(roster: PlayerProfile[]): void {
  const eloScore = (p: PlayerProfile) => (TIER_WEIGHT[p.tier] || 0) + (DIV_WEIGHT[p.division] || 0) + p.lp;
  const formScore = (p: PlayerProfile) =>
    p.winrate * 1.5 + p.streak * 4 + p.avgKda * 2.5 + (p.wins / Math.max(1, p.wins + p.losses)) * 50;

  [...roster].sort((a, b) => eloScore(b) - eloScore(a)).forEach((p, index) => {
    const target = roster.find((x) => x.id === p.id);
    if (target) target.eloRank = index + 1;
  });

  [...roster].sort((a, b) => formScore(b) - formScore(a)).forEach((p, index) => {
    const target = roster.find((x) => x.id === p.id);
    if (target) target.formRank = index + 1;
  });
}

function simulateLocally(
  sourcePlayers: PlayerProfile[],
  playerId: string,
  isWin: boolean,
  championName: string,
  kills: number,
  deaths: number,
  assists: number,
  cs: number,
  lpChange: number,
): PlayerProfile[] {
  const next = JSON.parse(JSON.stringify(sourcePlayers)) as PlayerProfile[];
  const player = next.find((p) => p.id === playerId);
  if (!player) throw new Error('Jugador no encontrado');

  const k = Math.max(0, Number(kills) || 0);
  const d = Math.max(0, Number(deaths) || 0);
  const a = Math.max(0, Number(assists) || 0);
  const newCs = Math.max(0, Number(cs) || 0);
  const safeDeaths = Math.max(1, d);
  const matchKda = Number(((k + a) / safeDeaths).toFixed(2));
  const deltaLp = Number.isFinite(lpChange) ? lpChange : (isWin ? 20 : -16);
  const now = Date.now();
  const champ = championName.trim() || player.champions[0]?.championName || 'Ahri';

  if (isWin) {
    player.wins += 1;
    player.streak = player.streak > 0 ? player.streak + 1 : 1;
  } else {
    player.losses += 1;
    player.streak = player.streak < 0 ? player.streak - 1 : -1;
  }

  const totalGames = player.wins + player.losses;
  player.winrate = Number(((player.wins / Math.max(1, totalGames)) * 100).toFixed(1));

  player.lp = Math.max(0, player.lp + deltaLp);
  if (player.tier === 'DIAMOND' && player.division === 'I' && player.lp >= 100) {
    player.tier = 'MASTER';
    player.division = 'I';
    player.lp -= 100;
  }

  const newMatch: MatchRecord = {
    matchId: `LOCAL_${now}`,
    gameCreation: now,
    gameDurationSeconds: 1560,
    queueType: 'Ranked Solo/Duo',
    win: isWin,
    championName: champ,
    championId: champ,
    champLevel: 15,
    role: player.role,
    kills: k,
    deaths: d,
    assists: a,
    kda: matchKda,
    cs: newCs,
    csPerMin: Number((newCs / 26).toFixed(1)),
    killParticipationPct: 65,
    damageDealt: 20000,
    damagePct: 25,
    visionScore: 30,
    spells: ['SummonerFlash', player.role === 'JUNGLE' ? 'SummonerSmite' : 'SummonerTeleport'],
    items: [3078, 3053, 3111, 3071, 0, 0, 3364],
    laneOpponentChamp: 'Opponent',
    tags: isWin ? ['MVP'] : [],
  };

  player.recentMatches.unshift(newMatch);
  player.recentMatches = player.recentMatches.slice(0, 20);

  const champStat = player.champions.find((c) => c.championName === champ);
  if (champStat) {
    champStat.games += 1;
    if (isWin) champStat.wins += 1;
    else champStat.losses += 1;
    champStat.winrate = Number(((champStat.wins / champStat.games) * 100).toFixed(1));
    champStat.kills += k;
    champStat.deaths += d;
    champStat.assists += a;
    champStat.kda = Number(((champStat.kills + champStat.assists) / Math.max(1, champStat.deaths)).toFixed(1));
    champStat.csPerMin = Number(((champStat.csPerMin + newMatch.csPerMin) / 2).toFixed(1));
  } else {
    player.champions.unshift({
      championName: champ,
      championId: champ,
      games: 1,
      wins: isWin ? 1 : 0,
      losses: isWin ? 0 : 1,
      winrate: isWin ? 100 : 0,
      kills: k,
      deaths: d,
      assists: a,
      kda: matchKda,
      csPerMin: newMatch.csPerMin,
    });
  }

  const matches = player.recentMatches;
  if (matches.length > 0) {
    player.avgKda = Number((matches.reduce((sum, m) => sum + m.kda, 0) / matches.length).toFixed(1));
    player.avgKills = Number((matches.reduce((sum, m) => sum + m.kills, 0) / matches.length).toFixed(1));
    player.avgDeaths = Number((matches.reduce((sum, m) => sum + m.deaths, 0) / matches.length).toFixed(1));
    player.avgAssists = Number((matches.reduce((sum, m) => sum + m.assists, 0) / matches.length).toFixed(1));
    player.avgCsPerMin = Number((matches.reduce((sum, m) => sum + m.csPerMin, 0) / matches.length).toFixed(1));
    player.avgKillParticipationPct = Number((matches.reduce((sum, m) => sum + m.killParticipationPct, 0) / matches.length).toFixed(1));
  }

  const snapshot: LPSnapshot = {
    timestamp: now,
    tier: player.tier,
    division: player.division,
    lp: player.lp,
    wins: player.wins,
    losses: player.losses,
    note: isWin ? `Victoria con ${champ} (${deltaLp >= 0 ? '+' : ''}${deltaLp} LP)` : `Derrota con ${champ} (${deltaLp} LP)`,
  };
  player.snapshots.push(snapshot);

  recalculateLocalRankings(next);
  return next;
}

export const SimulateMatchModal: React.FC<SimulateMatchModalProps> = ({
  isOpen,
  onClose,
  players,
  onGameSimulated,
}) => {
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

  useEffect(() => {
    if (!players.some((p) => p.id === selectedPlayerId) && players[0]) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players, selectedPlayerId]);

  useEffect(() => {
    if (!isOpen) return;
    const selected = players.find((p) => p.id === selectedPlayerId) || players[0];
    if (selected?.champions[0]) setChampionName(selected.champions[0].championName);
  }, [isOpen, players, selectedPlayerId]);

  if (!isOpen) return null;

  const handlePlayerChange = (id: string) => {
    setSelectedPlayerId(id);
    const p = players.find((x) => x.id === id);
    if (p?.champions[0]) setChampionName(p.champions[0].championName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    const payload = {
      playerId: selectedPlayerId,
      win: isWin,
      championName,
      kills,
      deaths,
      assists,
      cs,
      lpChange: isWin ? Math.abs(lpChange) : -Math.abs(lpChange),
    };

    try {
      const res = await fetch('/api/players/simulate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.players) {
          onGameSimulated(data.players);
          setSuccessMessage(data.message || 'Partida registrada con éxito');
          setTimeout(() => {
            onClose();
            setSuccessMessage(null);
          }, 1200);
          return;
        }
      }
    } catch (error) {
      console.warn('API de partidas no disponible; usando modo local.', error);
    }

    try {
      const updatedPlayers = simulateLocally(
        players,
        selectedPlayerId,
        isWin,
        championName,
        kills,
        deaths,
        assists,
        cs,
        payload.lpChange,
      );
      onGameSimulated(updatedPlayers);
      setSuccessMessage('Partida registrada localmente.');
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1200);
    } catch (error) {
      console.error('Error registrando partida local:', error);
      setSuccessMessage('No se pudo registrar la partida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-amber-400">
          <PlusCircle className="h-5 w-5" />
          <h3 className="text-lg font-bold text-white">Registrar Nueva Partida Ranked</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Añade un resultado para recalcular LP, Winrate, racha y rankings.
        </p>

        {successMessage ? (
          <div className="my-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-semibold text-emerald-300">
            {successMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Jugador</label>
              <select value={selectedPlayerId} onChange={(e) => handlePlayerChange(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500">
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.proName} ({p.role}) · {p.riotId} — {p.tier} {p.division} {p.lp} LP</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Resultado de la partida</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setIsWin(true)} className={`rounded-xl border py-2.5 font-bold transition ${isWin ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}`}>Victoria (VICTORY)</button>
                <button type="button" onClick={() => setIsWin(false)} className={`rounded-xl border py-2.5 font-bold transition ${!isWin ? 'border-rose-500 bg-rose-500/20 text-rose-300' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}`}>Derrota (DEFEAT)</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Campeón</label>
                <input type="text" value={championName} onChange={(e) => setChampionName(e.target.value)} placeholder="ej. Sylas, Draven, Gwen" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500" required />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Variación LP</label>
                <input type="number" value={lpChange} onChange={(e) => setLpChange(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500" required />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div><label className="block text-slate-400 mb-1">Kills</label><input type="number" value={kills} onChange={(e) => setKills(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white outline-none" min="0" /></div>
              <div><label className="block text-slate-400 mb-1">Deaths</label><input type="number" value={deaths} onChange={(e) => setDeaths(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white outline-none" min="0" /></div>
              <div><label className="block text-slate-400 mb-1">Assists</label><input type="number" value={assists} onChange={(e) => setAssists(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white outline-none" min="0" /></div>
              <div><label className="block text-slate-400 mb-1">CS</label><input type="number" value={cs} onChange={(e) => setCs(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-white outline-none" min="0" /></div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="rounded-lg bg-amber-500 px-5 py-2 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50">{isSubmitting ? 'Guardando...' : 'Guardar y Recalcular'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
