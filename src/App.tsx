/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, DatabaseZap } from 'lucide-react';
import { Navbar, NavTab } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { PlayersView } from './components/PlayersView';
import { MatchesView } from './components/MatchesView';
import { EvolutionView } from './components/EvolutionView';
import { AnalystView } from './components/AnalystView';
import { Footer } from './components/Footer';
import { INITIAL_PLAYERS, INITIAL_TEAM_REPORT } from './data/initialPlayers';
import { LiveTrackerPayload, PlayerProfile, TeamOverviewReport } from './types/lol';

const LIVE_DATA_URL =
  'https://raw.githubusercontent.com/Shiro32-Nexo32/KOI/main/data/live.json';
const LOCAL_CACHE_KEY = 'koi_tracker_live_cache_v1';

type SourceStatus = 'live' | 'cached' | 'seed';

function clonePlayers(source: PlayerProfile[]): PlayerProfile[] {
  return JSON.parse(JSON.stringify(source)) as PlayerProfile[];
}

function readCachedPlayers(): { players: PlayerProfile[]; generatedAt: number | null } {
  if (typeof window === 'undefined') return { players: clonePlayers(INITIAL_PLAYERS), generatedAt: null };

  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return { players: clonePlayers(INITIAL_PLAYERS), generatedAt: null };

    const cached = JSON.parse(raw) as LiveTrackerPayload;
    if (Array.isArray(cached.players) && cached.players.length === 5) {
      return {
        players: cached.players,
        generatedAt: cached.generatedAt ? Date.parse(cached.generatedAt) : null,
      };
    }
  } catch (error) {
    console.warn('No se pudo leer la caché del tracker:', error);
  }

  return { players: clonePlayers(INITIAL_PLAYERS), generatedAt: null };
}

function formatSyncAge(timestamp: number | null): string {
  if (!timestamp) return 'sin sincronización confirmada';
  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace menos de 1 min';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export default function App() {
  const cached = readCachedPlayers();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [players, setPlayers] = useState<PlayerProfile[]>(cached.players);
  const [report] = useState<TeamOverviewReport>(INITIAL_TEAM_REPORT);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('jojopyun');
  const [lastUpdated, setLastUpdated] = useState<number | null>(cached.generatedAt);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [analystInitialPrompt, setAnalystInitialPrompt] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus>(
    cached.generatedAt ? 'cached' : 'seed',
  );
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    window.setTimeout(() => setToastMessage(null), 3500);
  };

  const applyLivePayload = useCallback((payload: LiveTrackerPayload): boolean => {
    if (!Array.isArray(payload.players) || payload.players.length !== 5) return false;

    setPlayers(payload.players);
    setSourceStatus('live');

    const parsedTime = payload.generatedAt ? Date.parse(payload.generatedAt) : NaN;
    if (Number.isFinite(parsedTime)) {
      setLastUpdated(parsedTime);
    }

    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('No se pudo guardar la caché del tracker:', error);
    }

    return true;
  }, []);

  const fetchLiveData = useCallback(
    async (silent = false) => {
      try {
        const response = await fetch(`${LIVE_DATA_URL}?ts=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = (await response.json()) as LiveTrackerPayload;
        const applied = applyLivePayload(payload);

        if (!applied) {
          throw new Error('El archivo live.json todavía no contiene los cinco jugadores.');
        }

        if (!silent) {
          const stamp = payload.generatedAt ? Date.parse(payload.generatedAt) : null;
          showToast(
            stamp
              ? `Datos de OP.GG recibidos: ${formatSyncAge(stamp)}.`
              : 'Datos vivos recibidos desde OP.GG.',
          );
        }
      } catch (error) {
        console.warn('No se pudo obtener live.json desde GitHub:', error);
        setSourceStatus((current) => (current === 'live' ? current : cached.generatedAt ? 'cached' : 'seed'));
        if (!silent) {
          showToast(
            'No hay una sincronización nueva disponible. Se mantiene la última copia válida.',
            'info',
          );
        }
      }
    },
    [applyLivePayload, cached.generatedAt],
  );

  useEffect(() => {
    fetchLiveData(true);
  }, [fetchLiveData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = window.setInterval(() => {
      fetchLiveData(true);
    }, 120000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchLiveData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveData(false);
    setIsRefreshing(false);
  };

  const handleSelectPlayerFromOverview = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setActiveTab('players');
  };

  const handleAskAboutPlayer = (proName: string) => {
    setAnalystInitialPrompt(`¿Cómo va ${proName}?`);
    setActiveTab('analyst');
  };

  const statusLabel =
    sourceStatus === 'live'
      ? 'OP.GG · sincronización automática'
      : sourceStatus === 'cached'
        ? 'Copia local de la última sincronización'
        : 'Datos de respaldo del proyecto';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh((value) => !value)}
        sourceStatus={sourceStatus}
        lastUpdated={lastUpdated}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <DatabaseZap className="h-4 w-4 text-cyan-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <OverviewView
            players={players}
            report={report}
            onSelectPlayer={handleSelectPlayerFromOverview}
            onNavigateToAnalyst={() => setActiveTab('analyst')}
            sourceStatus={sourceStatus}
            lastUpdated={lastUpdated}
          />
        )}

        {activeTab === 'players' && (
          <PlayersView
            players={players}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            onAskAboutPlayer={handleAskAboutPlayer}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesView
            players={players}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
          />
        )}

        {activeTab === 'evolution' && (
          <EvolutionView
            players={players}
            onSelectPlayer={setSelectedPlayerId}
          />
        )}

        {activeTab === 'analyst' && (
          <AnalystView
            players={players}
            initialQuestion={analystInitialPrompt}
          />
        )}
      </main>

      <Footer
        lastUpdated={lastUpdated}
        sourceStatus={sourceStatus}
        statusLabel={statusLabel}
      />
    </div>
  );
}
