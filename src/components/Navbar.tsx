import React from 'react';
import { RefreshCw, PlusCircle, ShieldCheck } from 'lucide-react';

export type NavTab = 'overview' | 'players' | 'matches' | 'evolution' | 'analyst';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRefresh: () => void;
  onOpenSimulate: () => void;
  isRefreshing: boolean;
  hasRiotKey: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onRefresh,
  onOpenSimulate,
  isRefreshing,
  hasRiotKey,
  autoRefresh,
  onToggleAutoRefresh,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onTabChange('overview');
            }}
            className="text-lg font-bold tracking-tight text-white transition hover:text-amber-400"
          >
            LoL Bootcamp Tracker
          </a>
          <span className="hidden items-center text-xs text-slate-400 sm:flex">
            <span className="mx-2 text-slate-600">/</span>
            MAD Lions KOI · NA Bootcamp
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => onTabChange('overview')}
            className={`text-sm font-medium transition-colors hover:text-white ${
              activeTab === 'overview' ? 'text-amber-400 underline underline-offset-8' : 'text-slate-400'
            }`}
          >
            Resumen General
          </button>
          <button
            onClick={() => onTabChange('players')}
            className={`text-sm font-medium transition-colors hover:text-white ${
              activeTab === 'players' ? 'text-amber-400 underline underline-offset-8' : 'text-slate-400'
            }`}
          >
            Los 5 Jugadores
          </button>
          <button
            onClick={() => onTabChange('matches')}
            className={`text-sm font-medium transition-colors hover:text-white ${
              activeTab === 'matches' ? 'text-amber-400 underline underline-offset-8' : 'text-slate-400'
            }`}
          >
            Últimas 20 Rankeds
          </button>
          <button
            onClick={() => onTabChange('evolution')}
            className={`text-sm font-medium transition-colors hover:text-white ${
              activeTab === 'evolution' ? 'text-amber-400 underline underline-offset-8' : 'text-slate-400'
            }`}
          >
            Evolución LP
          </button>
          <button
            onClick={() => onTabChange('analyst')}
            className={`text-sm font-medium transition-colors hover:text-white ${
              activeTab === 'analyst' ? 'text-amber-400 underline underline-offset-8' : 'text-slate-400'
            }`}
          >
            Reportes & Analista
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleAutoRefresh}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              autoRefresh
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:text-slate-400'
            }`}
            title="Auto-actualizar cada 60 segundos"
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>Auto: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={onOpenSimulate}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            title="Registrar o simular partida para comprobar actualización en vivo"
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Nueva Partida</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
            title={hasRiotKey ? 'Sincronizar con Riot API oficial' : 'Actualizar métricas y snapshots'}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex overflow-x-auto border-t border-slate-800/80 px-4 py-2 md:hidden">
        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => onTabChange('overview')}
            className={activeTab === 'overview' ? 'font-bold text-amber-400' : 'text-slate-400'}
          >
            Resumen
          </button>
          <button
            onClick={() => onTabChange('players')}
            className={activeTab === 'players' ? 'font-bold text-amber-400' : 'text-slate-400'}
          >
            Jugadores (5)
          </button>
          <button
            onClick={() => onTabChange('matches')}
            className={activeTab === 'matches' ? 'font-bold text-amber-400' : 'text-slate-400'}
          >
            Rankeds (20)
          </button>
          <button
            onClick={() => onTabChange('evolution')}
            className={activeTab === 'evolution' ? 'font-bold text-amber-400' : 'text-slate-400'}
          >
            Evolución
          </button>
          <button
            onClick={() => onTabChange('analyst')}
            className={activeTab === 'analyst' ? 'font-bold text-amber-400' : 'text-slate-400'}
          >
            Analista
          </button>
        </div>
      </div>
    </header>
  );
};
