import React from 'react';
import { RefreshCw, Radio, WifiOff } from 'lucide-react';

export type NavTab = 'overview' | 'players' | 'matches' | 'evolution' | 'analyst';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  sourceStatus: 'live' | 'cached' | 'seed';
  lastUpdated: number | null;
}

function syncLabel(lastUpdated: number | null): string {
  if (!lastUpdated) return 'Sin sincronización';
  const mins = Math.floor(Math.max(0, Date.now() - lastUpdated) / 60000);
  if (mins < 1) return 'Comprobado ahora';
  if (mins < 60) return `Comprobado hace ${mins} min`;
  return `Comprobado hace ${Math.floor(mins / 60)} h`;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  autoRefresh,
  onToggleAutoRefresh,
  sourceStatus,
  lastUpdated,
}) => {
  const isLive = sourceStatus === 'live';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => onTabChange('overview')}
            className="shrink-0 text-lg font-bold tracking-tight text-white transition hover:text-amber-400"
          >
            KOI Tracker
          </button>

          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="text-slate-700">/</span>
            <span className="truncate text-xs font-medium text-slate-400">MKOI · 5 cuentas monitorizadas</span>
          </div>
        </div>

        <nav className="hidden items-center gap-5 lg:flex">
          {([
            ['overview', 'Resumen'],
            ['players', 'Jugadores'],
            ['matches', 'Partidas'],
            ['evolution', 'Evolución LP'],
            ['analyst', 'Analista'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`text-sm font-medium transition-colors hover:text-white ${
                activeTab === tab
                  ? 'text-amber-400 underline underline-offset-8'
                  : 'text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAutoRefresh}
            className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition sm:flex ${
              autoRefresh
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-800 bg-slate-900/50 text-slate-500'
            }`}
            title="Comprobar el archivo live.json cada 2 minutos"
          >
            {autoRefresh ? (
              <Radio className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            <span>Auto</span>
          </button>

          <div
            className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1.5 text-[11px] text-slate-400 xl:flex"
            title="Muestra cuándo fue la última comprobación correcta de OP.GG"
          >
            <span className={`h-2 w-2 rounded-full ${
              isLive ? 'bg-emerald-400' : sourceStatus === 'cached' ? 'bg-amber-400' : 'bg-slate-600'
            }`} />
            <span>{isLive ? 'OP.GG' : sourceStatus === 'cached' ? 'Caché' : 'Respaldo'}</span>
            <span className="text-slate-600">·</span>
            <span>{syncLabel(lastUpdated)}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
            title="Intentar una comprobación manual de OP.GG"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Comprobando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto border-t border-slate-800/80 px-4 py-2 lg:hidden">
        <div className="flex items-center gap-5 text-xs">
          {([
            ['overview', 'Resumen'],
            ['players', 'Jugadores (5)'],
            ['matches', 'Partidas'],
            ['evolution', 'Evolución'],
            ['analyst', 'Analista'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={activeTab === tab ? 'font-bold text-amber-400' : 'text-slate-400'}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
