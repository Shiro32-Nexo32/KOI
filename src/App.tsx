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
import { INITIAL_PLAYERS } from './data/initialPlayers';
import { LiveTrackerPayload, PlayerProfile } from './types/lol';

const LIVE_DATA_URL =
  'https://raw.githubusercontent.com/Shiro32-Nexo32/KOI/main/data/live.json';
const COORDINATOR_URL =
  (import.meta.env.VITE_COORDINATOR_URL as string | undefined)?.replace(/\/+$/, '') || '';
const STATUS_API_URL = COORDINATOR_URL ? COORDINATOR_URL + '/api/status' : '';
const REFRESH_API_URL = COORDINATOR_URL
  ? COORDINATOR_URL + '/api/refresh'
  : (import.meta.env.VITE_REFRESH_API_URL as string | undefined) || '';
const LOCAL_CACHE_KEY = 'koi_tracker_live_cache_v1';

type SourceStatus = 'live' | 'cached' | 'seed';
type CoordinatorStatus = 'ok' | 'partial' | 'error' | 'unknown';

function clonePlayers(source: PlayerProfile[]): PlayerProfile[] {
  return JSON.parse(JSON.stringify(source)) as PlayerProfile[];
}

function readCachedPlayers(): { players: PlayerProfile[]; generatedAt: number | null; syncedAt: number | null } {
  if (typeof window === 'undefined') return { players: clonePlayers(INITIAL_PLAYERS), generatedAt: null, syncedAt: null };

  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return { players: clonePlayers(INITIAL_PLAYERS), generatedAt: null, syncedAt: null };

    const cached = JSON.parse(raw) as LiveTrackerPayload;
    if (Array.isArray(cached.players) && cached.players.length === 5) {
      return {
        players: cached.players,
        generatedAt: cached.generatedAt ? Date.parse(cached.generatedAt) : null,
        syncedAt: cached.syncedAt ? Date.parse(cached.syncedAt) : (cached.generatedAt ? Date.parse(cached.generatedAt) : null),
      };
    }
  } catch (error) {
    console.warn('No se pudo leer la caché del tracker:', error);
  }

  return { players: clonePlayers(INITIAL_PLAYERS), generatedAt: null, syncedAt: null };
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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('jojopyun');
  const [lastUpdated, setLastUpdated] = useState<number | null>(cached.syncedAt ?? cached.generatedAt);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [lastCheckStatus, setLastCheckStatus] = useState<CoordinatorStatus>('unknown');
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);
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

    const parsedTime = payload.syncedAt
      ? Date.parse(payload.syncedAt)
      : payload.generatedAt
        ? Date.parse(payload.generatedAt)
        : NaN;
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
          const stamp = payload.syncedAt
            ? Date.parse(payload.syncedAt)
            : payload.generatedAt
              ? Date.parse(payload.generatedAt)
              : null;
          showToast(
            stamp
              ? `OP.GG comprobado: ${formatSyncAge(stamp)}.`
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

  const fetchCoordinatorStatus = useCallback(async () => {
    if (!STATUS_API_URL) return;
    try {
      const response = await fetch(STATUS_API_URL + '?ts=' + Date.now(), {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = (await response.json()) as {
        checkedAt?: string | null;
        status?: CoordinatorStatus;
        message?: string | null;
        errors?: string[];
      };
      const checkedAt = result.checkedAt ? Date.parse(result.checkedAt) : NaN;
      if (Number.isFinite(checkedAt)) setLastCheckedAt(checkedAt);
      if (result.status && ['ok', 'partial', 'error', 'unknown'].includes(result.status)) {
        setLastCheckStatus(result.status);
      }
      setLastCheckMessage(
        result.message || (Array.isArray(result.errors) && result.errors.length ? result.errors.join(' · ') : null),
      );
    } catch (error) {
      console.warn('No se pudo consultar el estado del coordinador:', error);
    }
  }, []);

  useEffect(() => {
    fetchLiveData(true);
    fetchCoordinatorStatus();
  }, [fetchLiveData, fetchCoordinatorStatus]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = window.setInterval(() => {
      fetchLiveData(true);
      fetchCoordinatorStatus();
    }, 120000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchLiveData, fetchCoordinatorStatus]);

  const handleRefresh = async () => {
    if (!REFRESH_API_URL) {
      showToast(
        'La actualización manual requiere desplegar el coordinador de Cloudflare y configurar VITE_COORDINATOR_URL.',
        'info',
      );
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch(REFRESH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      const result = (await response.json()) as {
        ok: boolean;
        payload?: LiveTrackerPayload;
        dispatched?: boolean;
        alreadyRunning?: boolean;
        message?: string;
        error?: string;
        retryAfter?: number;
      };

      if (response.status === 429) {
        showToast(result.error || 'Espera un momento antes de solicitar otra actualización.', 'info');
        return;
      }
      if (!response.ok || !result.ok) {
        showToast(result.error || 'El coordinador no pudo iniciar la sincronización.', 'info');
        return;
      }

      if (COORDINATOR_URL) {
        await fetchCoordinatorStatus();
        showToast(
          result.dispatched
            ? 'Solicitud enviada. Los datos se actualizarán al terminar la consulta a OP.GG.'
            : 'Ya hay una sincronización en curso o recién solicitada. La web mostrará el snapshot publicado.',
          'info',
        );
        return;
      }

      if (!result.payload || !applyLivePayload(result.payload)) {
        throw new Error('Respuesta de sincronización inválida.');
      }
      const stamp = result.payload.generatedAt ? Date.parse(result.payload.generatedAt) : null;
      showToast(stamp ? 'OP.GG comprobado: ' + formatSyncAge(stamp) + '.' : 'OP.GG comprobado ahora.');
    } catch (error) {
      console.warn('No se pudo ejecutar la sincronización manual:', error);
      if (!COORDINATOR_URL) await fetchLiveData(false);
      showToast('No se pudo solicitar la sincronización. Se conserva el último snapshot disponible.', 'info');
    } finally {
      setIsRefreshing(false);
    }
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
        lastCheckedAt={lastCheckedAt}
        lastCheckStatus={lastCheckStatus}
        lastCheckMessage={lastCheckMessage}
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
            onSelectPlayer={handleSelectPlayerFromOverview}
            onNavigateToAnalyst={() => setActiveTab('analyst')}
            sourceStatus={sourceStatus}
            lastUpdated={lastUpdated}
        lastCheckedAt={lastCheckedAt}
        lastCheckStatus={lastCheckStatus}
        lastCheckMessage={lastCheckMessage}
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
        lastCheckedAt={lastCheckedAt}
        lastCheckStatus={lastCheckStatus}
        lastCheckMessage={lastCheckMessage}
        sourceStatus={sourceStatus}
        statusLabel={statusLabel}
      />
    </div>
  );
}
