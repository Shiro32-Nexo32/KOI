import React from 'react';
import { Database, ExternalLink } from 'lucide-react';

interface FooterProps {
  lastUpdated: number | null;
  sourceStatus: 'live' | 'cached' | 'seed';
  statusLabel: string;
}

export const Footer: React.FC<FooterProps> = ({
  lastUpdated,
  sourceStatus,
  statusLabel,
}) => {
  const updatedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Pendiente';

  const sourceText =
    sourceStatus === 'live'
      ? 'OP.GG · datos vivos publicados por el sincronizador'
      : sourceStatus === 'cached'
        ? 'Caché local · última sincronización válida'
        : 'Datos de respaldo · esperando primera sincronización';

  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-950 py-10 text-xs text-slate-500">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-800/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold text-slate-300">KOI Tracker · MKOI</div>
            <div className="mt-1 text-slate-500">
              Myrwn · Elyoya · Jojopyun · Supa · Alvaro
            </div>
          </div>

          <div className="text-right font-mono text-[11px] text-slate-400">
            <div className="flex items-center justify-end gap-1.5">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span>{sourceText}</span>
            </div>
            <div className="mt-1 text-slate-600">
              Última actualización de datos: {updatedDate}
            </div>
            <div className="mt-1 text-slate-600">{statusLabel}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-[11px] leading-relaxed text-slate-600 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-3xl">
            La aplicación monitoriza exclusivamente las cinco cuentas configuradas en
            <code className="mx-1 text-slate-500">data/monitored.json</code>.
            Los datos se sincronizan automáticamente desde OP.GG mediante GitHub Actions.
            El endpoint usado no es una API pública documentada por OP.GG, por lo que puede
            requerir ajustes si el servicio cambia.
          </p>

          <a
            href="https://op.gg/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 text-cyan-500 transition hover:text-cyan-300"
          >
            Fuente: OP.GG
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <p className="max-w-4xl text-[11px] leading-relaxed text-slate-600">
          <strong className="text-slate-500">Aviso Riot Games:</strong> LoL Tracker isn't
          endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or
          anyone officially involved in producing or managing Riot Games properties. Riot Games
          and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
};
