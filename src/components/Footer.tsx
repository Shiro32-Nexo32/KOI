import React from 'react';
import { ShieldCheck, Database } from 'lucide-react';

interface FooterProps {
  lastUpdated: number;
  hasRiotKey: boolean;
}

export const Footer: React.FC<FooterProps> = ({ lastUpdated, hasRiotKey }) => {
  const updatedDate = new Date(lastUpdated).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-950 py-10 text-xs text-slate-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">LoL Bootcamp Tracker & Pro Analyst</span>
            <span>·</span>
            <span>MAD Lions KOI (Myrwn, Elyoya, Jojopyun, Supa, Alvaro)</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span>Sincronizado en vivo con OP.GG</span>
            </span>
            <span>·</span>
            <span>Última sincronización: {updatedDate}</span>
          </div>
        </div>

        {/* Riot Games Mandatory Legal Disclaimer */}
        <div className="max-w-4xl text-[11px] leading-relaxed text-slate-500">
          <p>
            <strong>Aviso Legal de Riot Games:</strong> LoL Bootcamp Tracker isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
          </p>
          <p className="mt-2 text-slate-600">
            Los datos de partidas e imágenes de campeones proceden de la API oficial de Riot Games y del CDN Data Dragon (15.5.1).
          </p>
        </div>
      </div>
    </footer>
  );
};
