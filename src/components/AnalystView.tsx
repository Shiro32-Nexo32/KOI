import React, { useMemo, useState } from 'react';
import { BarChart3, Check, Copy, MessageSquareText, Send } from 'lucide-react';
import { AnalystChatMessage, PlayerProfile } from '../types/lol';
import { getLocalAnalystAnswer } from '../utils/localAnalyst';

interface AnalystViewProps {
  players: PlayerProfile[];
  initialQuestion?: string;
}

function renderAnalystContent(content: string): React.ReactNode {
  return content.split('\n').map((line, index) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\`[^\`]+\`)/g);
    return (
      <React.Fragment key={index}>
        {parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIndex} className="font-bold text-white">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={partIndex} className="rounded bg-slate-950 px-1 py-0.5 font-mono text-[11px] text-cyan-300">{part.slice(1, -1)}</code>;
          }
          return <React.Fragment key={partIndex}>{part}</React.Fragment>;
        })}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    );
  });
}

function buildWelcome(players: PlayerProfile[]): AnalystChatMessage {
  const ordered = [...players].sort((a, b) => a.formRank - b.formRank);
  const lines = ordered.map(
    (player) =>
      `* **${player.proName}** (\`${player.riotId}\`) · ${player.tier} ${player.division} ${player.lp} LP · ${player.winrate}% WR · KDA ${player.avgKda}`,
  );

  return {
    id: 'welcome',
    role: 'assistant',
    content: `Consulta el estado actual de **KOI / MKOI** con preguntas rápidas.

Las respuestas salen de reglas predefinidas y de los datos sincronizados desde OP.GG. No hay generación de texto libre: cada respuesta es un cálculo del tracker.

Estado actual, ordenado por forma:
${lines.join('\n')}`,
    timestamp: Date.now(),
    suggestedFollowUps: [
      'Reporte de los 5',
      '¿Cómo va la botlane (Supa y Alvaro)?',
      '¿Quién tiene mejor racha y KDA?',
      '¿Qué campeones está jugando Jojopyun?',
      '¿Cómo va Myrwn?',
    ],
  };
}

export const AnalystView: React.FC<AnalystViewProps> = ({ players, initialQuestion }) => {
  const welcome = useMemo(() => buildWelcome(players), [players]);
  const [messages, setMessages] = useState<AnalystChatMessage[]>([welcome]);
  const [inputQuestion, setInputQuestion] = useState(initialQuestion || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSend = async (questionText: string) => {
    const question = questionText.trim();
    if (!question || isLoading) return;

    const userMsg: AnalystChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
    };

    setMessages((current) => [...current, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const reply = getLocalAnalystAnswer(question, players);

      setMessages((current) => [
        ...current,
        {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
          suggestedFollowUps: generateFollowUps(question),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFollowUps = (question: string): string[] => {
    const lower = question.toLowerCase();

    if (lower.includes('hora') || lower.includes('24') || lower.includes('hoy')) {
      return [
        '¿Quién va líder ahora?',
        '¿Quién ha subido o bajado ladder hoy?',
        '¿Quién ha ganado más partidas hoy?',
      ];
    }

    if (lower.includes('jojo') || lower.includes('jojopyun')) {
      return [
        '¿Qué campeones juega Jojopyun?',
        '¿Cómo ha ido Jojopyun en las últimas 24 horas?',
        '¿Quién va líder ahora?',
      ];
    }

    if (lower.includes('supa') || lower.includes('alvaro') || lower.includes('bot')) {
      return [
        '¿Cómo va la botlane?',
        '¿Quién tiene mejor KDA?',
        '¿Cómo ha ido el grupo en la última hora?',
      ];
    }

    return [
      '¿Quién va líder ahora?',
      '¿Cómo ha ido el grupo en la última hora?',
      '¿Cómo ha ido el grupo en las últimas 24 horas?',
    ];
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Analista del tracker</h2>
              <p className="text-xs text-slate-500">
                Respuestas predefinidas calculadas con las cinco cuentas y sus partidas sincronizadas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSend('¿Quién va líder ahora?')}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              Reporte de los 5
            </button>
            <button
              onClick={() => handleSend('¿Cómo ha ido el grupo en la última hora?')}
              disabled={isLoading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
            >
              Botlane
            </button>
            <button
              onClick={() => handleSend('¿Cómo ha ido el grupo en las últimas 24 horas?')}
              disabled={isLoading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
            >
              Rachas & KDA
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {messages.map((message) => {
          const assistant = message.role === 'assistant';

          return (
            <article
              key={message.id}
              className={`rounded-2xl border p-5 ${
                assistant
                  ? 'border-slate-800 bg-slate-900/70'
                  : 'ml-6 border-amber-500/30 bg-amber-500/5 sm:ml-12'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={assistant ? 'text-amber-400' : 'text-slate-400'}>
                    {assistant ? 'Analista' : 'Tú'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-600">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {assistant && (
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-slate-500 transition hover:bg-slate-800 hover:text-white"
                  >
                    {copiedId === message.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copiar
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="mt-3 text-sm leading-relaxed text-slate-200">
                {renderAnalystContent(message.content)}
              </div>

              {assistant && message.suggestedFollowUps?.length ? (
                <div className="mt-4 border-t border-slate-800/80 pt-3">
                  <div className="mb-2 text-[11px] font-mono text-slate-600">Preguntas sugeridas</div>
                  <div className="flex flex-wrap gap-1.5">
                    {message.suggestedFollowUps.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        disabled={isLoading}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {isLoading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-xs text-slate-400">
            Calculando...
          </div>
        )}
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(inputQuestion);
        }}
        className="sticky bottom-4 z-20 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md focus-within:border-amber-500"
      >
        <input
          value={inputQuestion}
          onChange={(event) => setInputQuestion(event.target.value)}
          placeholder="Escribe una pregunta o elige una consulta rápida..."
          disabled={isLoading}
          className="flex-1 bg-transparent px-4 py-2 text-sm text-white outline-none placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={!inputQuestion.trim() || isLoading}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-40"
        >
          Preguntar
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
};
