import React, { useState } from 'react';
import { PlayerProfile, AnalystChatMessage } from '../types/lol';
import { Bot, Send, Sparkles, Copy, Check, MessageSquare, Flame, Trophy, ShieldAlert } from 'lucide-react';

interface AnalystViewProps {
  players: PlayerProfile[];
  initialQuestion?: string;
}

export const AnalystView: React.FC<AnalystViewProps> = ({ players, initialQuestion }) => {
  const [messages, setMessages] = useState<AnalystChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `¡Hola! Soy el **Analista Principal de MAD Lions KOI** para este bootcamp en Norteamérica (NA).

Tengo registrados los 5 Riot ID oficiales:
* **Myrwn** (\`Shirin#ilmgf\`) · Diamante II 97 LP (11-2, 84.6% WR)
* **Elyoya** (\`Yoyadeodo#tuki\`) · Diamante I 57 LP (13-2, 86.7% WR)
* **Jojopyun** (\`jojooooooooo#9999\`) · Diamante II 27 LP (8-0, 100% WR)
* **Supa** (\`Charmander#MKOI\`) · Master 62 LP (15-2, 88.2% WR)
* **Alvaro** (\`Treecko#MKOI\`) · Diamante I 97 LP (13-1, 92.9% WR)

Puedes pedirme un **"Reporte de los 5"**, preguntarme por un jugador concreto (**"¿Cómo va Jojopyun?"**), o consultar sinergias y comparativas. ¿En qué nos enfocamos hoy?`,
      timestamp: Date.now(),
      suggestedFollowUps: [
        'Reporte de los 5',
        '¿Cómo va la botlane (Supa y Alvaro)?',
        '¿Quién tiene mejor racha y KDA?',
        '¿Qué campeones está jugando Jojopyun?',
        '¿Cómo va Myrwn en Top?',
      ],
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState(initialQuestion || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const buildLocalAnswer = (question: string): string => {
    const lower = question.toLowerCase();
    const findPlayer = (name: string) => players.find((p) => p.proName.toLowerCase() === name.toLowerCase());

    if (lower.includes('reporte de los 5') || lower.includes('como van') || lower.includes('cómo van')) {
      return players
        .map((p, index) => `${index + 1}. ${p.proName}: ${p.tier} ${p.division} ${p.lp} LP · ${p.wins}-${p.losses} (${p.winrate}% WR) · KDA ${p.avgKda}`)
        .join('\n');
    }

    const names = ['Myrwn', 'Elyoya', 'Jojopyun', 'Supa', 'Alvaro'];
    const found = names.map(findPlayer).find((p) => p && lower.includes(p.proName.toLowerCase()));
    if (found) {
      return `**${found.proName}** está en ${found.tier} ${found.division} con ${found.lp} LP. Balance: **${found.wins}-${found.losses} (${found.winrate}% WR)**, KDA medio ${found.avgKda} y ${found.avgCsPerMin} CS/min. Su ranking actual es #${found.formRank} en forma y #${found.eloRank} en Elo.`;
    }

    if (lower.includes('botlane') || lower.includes('botlane') || lower.includes('duo')) {
      const supa = findPlayer('Supa');
      const alvaro = findPlayer('Alvaro');
      if (supa && alvaro) {
        const wins = supa.wins + alvaro.wins;
        const losses = supa.losses + alvaro.losses;
        return `La botlane acumula ${wins}-${losses} de forma combinada. Supa está en ${supa.tier} ${supa.division} ${supa.lp} LP y Alvaro en ${alvaro.tier} ${alvaro.division} ${alvaro.lp} LP.`;
      }
    }

    if (lower.includes('kda') || lower.includes('mejor')) {
      const best = [...players].sort((a, b) => b.avgKda - a.avgKda)[0];
      if (best) return `${best.proName} tiene actualmente el mejor KDA medio del grupo: ${best.avgKda}.`;
    }

    return `Modo local activo. ${players.length} jugadores cargados. Puedes consultar por jugador, KDA, botlane o pedir un "Reporte de los 5".`;
  };

  const handleSend = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isLoading) return;

    const userMsg: AnalystChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/analyst/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) throw new Error('API analyst unavailable');
      const data = await res.json();
      const reply = data.answer || buildLocalAnswer(q);

      const botMsg: AnalystChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        suggestedFollowUps: generateFollowUps(q),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.warn('Analyst API unavailable; using local analysis.', err);
      const botMsg: AnalystChatMessage = {
        id: `bot_local_${Date.now()}`,
        role: 'assistant',
        content: buildLocalAnswer(q),
        timestamp: Date.now(),
        suggestedFollowUps: generateFollowUps(q),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFollowUps = (question: string): string[] => {
    const lower = question.toLowerCase();
    if (lower.includes('reporte de los 5') || lower.includes('como van')) {
      return ['¿Cómo va la botlane (Supa y Alvaro)?', '¿Qué campeones está jugando Jojopyun?', '¿A cuánto está Alvaro de Master?'];
    }
    if (lower.includes('jojo')) {
      return ['¿Cómo va Supa?', 'Reporte de los 5', '¿Quién tiene mejor KDA?'];
    }
    if (lower.includes('bot') || lower.includes('supa') || lower.includes('alvaro')) {
      return ['¿Cómo va Elyoya en la jungla?', 'Reporte de los 5', '¿A cuánto está Alvaro de Master?'];
    }
    return ['Reporte de los 5', '¿Cómo va Myrwn?', '¿Quién tiene mejor racha y KDA?'];
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Analista Táctico en Vivo</h2>
              <p className="text-xs text-slate-400">
                Informes automáticos del estilo de coaching profesional: ranking de forma, evolución de LP y sinergias
              </p>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSend('Reporte de los 5')}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Reporte de los 5</span>
            </button>
            <button
              onClick={() => handleSend('¿Cómo va la botlane (Supa y Alvaro)?')}
              disabled={isLoading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
            >
              Botlane (28-3)
            </button>
            <button
              onClick={() => handleSend('¿Quién tiene mejor racha y KDA?')}
              disabled={isLoading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
            >
              Rachas & KDAs
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="space-y-4">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';

          return (
            <div
              key={msg.id}
              className={`rounded-2xl border p-5 transition ${
                isAssistant
                  ? 'border-slate-800 bg-slate-900/70 text-slate-200'
                  : 'border-amber-500/30 bg-amber-500/5 text-amber-100 ml-6 sm:ml-12'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={isAssistant ? 'text-amber-400' : 'text-slate-400'}>
                    {isAssistant ? 'Analista de Bootcamp' : 'Tú'}
                  </span>
                  <span className="text-slate-600 font-mono text-[10px]">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isAssistant && (
                  <button
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Copiar reporte"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Render formatted message content */}
              <div className="mt-3 space-y-2 text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-200">
                {msg.content}
              </div>

              {/* Suggested follow-up buttons */}
              {isAssistant && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="mt-4 border-t border-slate-800/80 pt-3">
                  <span className="text-[11px] font-mono text-slate-500">Preguntas sugeridas:</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {msg.suggestedFollowUps.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        disabled={isLoading}
                        className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-300 transition hover:border-amber-500/40 hover:text-amber-300 hover:bg-slate-900 disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-slate-400">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <span className="text-xs font-medium text-slate-300">
                Analizando telemetría de SoloQ y redactando informe...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Chat Input Bar */}
      <div className="sticky bottom-4 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputQuestion);
          }}
          className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md focus-within:border-amber-500"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Pregunta algo al analista (ej. 'Reporte de los 5', '¿Cómo va Myrwn?', '¿Qué campeones está jugando Jojopyun?')..."
            className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-slate-500 outline-none"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-40"
          >
            <span>Preguntar</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
