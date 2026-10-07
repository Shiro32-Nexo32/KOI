/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { PlayersView } from './components/PlayersView';
import { MatchesView } from './components/MatchesView';
import { EvolutionView } from './components/EvolutionView';
import { AnalystView } from './components/AnalystView';
import { SimulateMatchModal } from './components/SimulateMatchModal';
import { EditAccountModal } from './components/EditAccountModal';
import { Footer } from './components/Footer';
import { INITIAL_PLAYERS, INITIAL_TEAM_REPORT } from './data/initialPlayers';
import { PlayerProfile, TeamOverviewReport } from './types/lol';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [players, setPlayers] = useState<PlayerProfile[]>(INITIAL_PLAYERS);
  const [report, setReport] = useState<TeamOverviewReport>(INITIAL_TEAM_REPORT);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('jojopyun');
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [hasRiotKey, setHasRiotKey] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerProfile | null>(null);
  const [analystInitialPrompt, setAnalystInitialPrompt] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Fetch initial data from server API
  const fetchPlayersData = async (silent = false) => {
    try {
      const res = await fetch('/api/players');
      if (res.ok) {
        const data = await res.json();
        if (data.players) setPlayers(data.players);
        if (data.latestReport) setReport(data.latestReport);
        if (data.lastUpdated) setLastUpdated(data.lastUpdated);
        setHasRiotKey(Boolean(data.hasRiotApiKey));
        if (silent) {
          // quiet auto-update
        }
      }
    } catch (err) {
      console.warn('API fetch players fell back to client cache:', err);
    }
  };

  useEffect(() => {
    fetchPlayersData();
  }, []);

  // Background Auto-Refresh Interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchPlayersData(true);
    }, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/players/refresh', { method: 'POST' });
      const data = await res.json();
      if (data.players) {
        setPlayers(data.players);
        setLastUpdated(data.lastUpdated || Date.now());
      }
      showToast(data.message || 'Métricas y snapshots actualizados con éxito.');
    } catch (err) {
      console.error('Refresh error:', err);
      showToast('Error al conectar con el servidor.', 'info');
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

  const handleGameSimulated = (updatedPlayers: PlayerProfile[]) => {
    setPlayers(updatedPlayers);
    setLastUpdated(Date.now());
    showToast('Partida registrada. LP y rankings actualizados.');
  };

  const handleAccountUpdated = (updatedPlayer: PlayerProfile) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p))
    );
    showToast(`Cuenta de ${updatedPlayer.proName} actualizada a ${updatedPlayer.riotId}.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        onOpenSimulate={() => setIsSimulateModalOpen(true)}
        isRefreshing={isRefreshing}
        hasRiotKey={hasRiotKey}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md transition-all">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <OverviewView
            players={players}
            report={report}
            onSelectPlayer={handleSelectPlayerFromOverview}
            onNavigateToAnalyst={() => setActiveTab('analyst')}
          />
        )}

        {activeTab === 'players' && (
          <PlayersView
            players={players}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            onOpenEditAccount={(p) => setEditingPlayer(p)}
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

      {/* Modals */}
      <SimulateMatchModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        players={players}
        onGameSimulated={handleGameSimulated}
      />

      <EditAccountModal
        isOpen={Boolean(editingPlayer)}
        player={editingPlayer}
        onClose={() => setEditingPlayer(null)}
        onAccountUpdated={handleAccountUpdated}
      />

      {/* Footer */}
      <Footer lastUpdated={lastUpdated} hasRiotKey={hasRiotKey} />
    </div>
  );
}
