import React, { useMemo, useState } from 'react';
import { BarChart3, Check, Copy, MessageSquareText, Send } from 'lucide-react';
import { AnalystChatMessage, PlayerProfile } from '../types/lol';
import { formatRankLabel } from '../utils/ddragon';
import { getLocalAnalystAnswer } from '../utils/localAnalyst';

interface AnalystViewProps {
  players: PlayerProfile[];
  initialQuestion?: string;
}

const QUICK_QUESTIONS = [
  '¿Quién va líder ahora?',
  '¿Cómo ha ido el grupo en la última hora?',
  '¿Cómo ha ido el grupo en las últimas 24 horas?',
  '¿Quién ha ganado o perdido ladder hoy?',
  '¿Quién tiene mejor KDA?',
  '¿Cómo va Jojopyun?',
  '¿Qué campeones juega Myrwn?',
  '¿Cómo va la botlane?',
];

function renderContent(content: string): React.ReactNode {
  return content.split('\n').map((line, index, lines) => (
    <React.Fragment key={index}>
      {line.split('**').map((part, partIndex) =>
        partIndex % 2 === 1 ? (
          <strong key={partIndex} className="font-bold text-white">{part}</strong>
        ) : (
          <React.Fragment key={partIndex}>{part}</React.Fragment>
        ),
      )}
      {index < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}

function buildWelcome(players: PlayerProfile[]): AnalystChatMessage {
  const ordered = [...players].sort((a, b) => a.formRank - b.formRank);
  const lines = ordered.map(
    (player) =>
      '* **' +
      player.proName +
      '** · ' +
      formatRankLabel(player.tier, player.division, player.lp) +
      ' · ' +
      player.winrate +
      '% WR · KDA ' +
      player.avgKda,
  );

  return {
    id: 'welcome',
    role: 'assistant',
    content:
      'Consulta el estado actual de **KOI / MKOI** con preguntas rápidas.\n\n' +
      'Las respuestas son predefinidas y se calculan directamente con los datos sincronizados de OP.GG. No hay generación de texto libre.\n\n' +
      'Estado actual, ordenado por forma:\n' +
      lines.join('\n'),
    timestamp: Date.now(),
    suggestedFollowUps: QUICK_QUESTIONS,
  };
}

export const AnalystView: React.FC<AnalystViewProps> = ({ players, initialQuestion }) => {
  const welcome = useMemo(() => buildWelcome(players), [players]);
  const [messages, setMessages] = useState<AnalystChatMessage[]>([welcome]);
  const [inputQuestion, setInputQuestion] = useState(initialQuestion || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

    return QUICK_QUESTIONS.slice(0, 4);
  };

  const handleSend = (questionText: string) => {
    const question = questionText.trim();
    if (!question || isLoading) return;

    const now = Date.now();
    setMessages((current) => [
      ...current,
      {
        id: 'user_' + now,
        role: 'user',
        content: question,
        timestamp: now,
      },
    ]);
    setInputQuestion('');
    setIsLoading(true);

    const reply = getLocalAnalystAnswer(question, players);
    const replyTime = Date.now();

    setMessages((current) => [
      ...current,
      {
        id: 'tracker_' + replyTime,
        role: 'assistant',
        content: reply,
        timestamp: replyTime,
        suggestedFollowUps: generateFollowUps(question),
      },
    ]);

    window.setTimeout(() => setIsLoading(false), 120);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Consultas del tracker</h2>
                <p className="text-xs text-slate-500">
                  Respuestas predefinidas calculadas con las cinco cuentas y sus partidas sincronizadas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-600">
              <MessageSquareText className="h-3.5 w-3.5 text-amber-400" />
              Motor determinista
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            {QUICK_QUESTIONS.map((prompt, index) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className={
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ' +
                  (index === 0
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white')
                }
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {messages.map((message) => {
          const assistant = message.role === 'assistant';

          return (
            <article
              key={message.id}
              className={
                'rounded-2xl border p-5 ' +
                (assistant
                  ? 'border-slate-800 bg-slate-900/70'
                  : 'ml-6 border-amber-500/30 bg-amber-500/5 sm:ml-12')
              }
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={assistant ? 'text-amber-400' : 'text-slate-400'}>
                    {assistant ? 'Tracker' : 'Tú'}
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
                {renderContent(message.content)}
              </div>

              {assistant && message.suggestedFollowUps?.length ? (
                <div className="mt-4 border-t border-slate-800/80 pt-3">
                  <div className="mb-2 text-[11px] font-mono text-slate-600">Consultas relacionadas</div>
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
