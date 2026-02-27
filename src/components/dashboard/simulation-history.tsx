
'use client';

import { History, Loader2, ServerCrash, Database, TrendingDown, Waves, Zap, Activity } from 'lucide-react';
import type { SimulationRun } from '@/lib/simulation-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SimulationHistoryPanelProps {
  runs?: SimulationRun[];
  isLoading: boolean;
}

export function SimulationHistoryPanel({ runs, isLoading }: SimulationHistoryPanelProps) {

  const getOutcomeBadgeVariant = (outcome?: string) => {
    switch (outcome) {
      case 'High Yield':
        return 'default';
      case 'Stable':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meu Histórico</span>
        </div>
        <Badge variant="outline" className="text-[9px] h-4 border-primary/30">
          {runs?.length || 0} EXECUÇÕES
        </Badge>
      </div>

      <ScrollArea className="h-[300px] w-full pr-4">
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        
        {!isLoading && (!runs || runs.length === 0) && (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-50 space-y-2">
            <Database className="h-6 w-6 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-tighter">Nenhum dado de simulação</p>
          </div>
        )}

        <div className="space-y-3">
          {runs?.map((run) => (
            <div key={run.id} className="group relative overflow-hidden rounded-md border border-white/5 bg-slate-900/40 p-3 transition-all hover:bg-slate-900/60 shadow-lg">
               <div className="flex items-center justify-between mb-2">
                <Badge variant={getOutcomeBadgeVariant(run.outcome)} className="text-[8px] h-3.5 px-1.5 uppercase tracking-tighter">
                  {run.outcome}
                </Badge>
                <span className="text-[8px] font-mono text-muted-foreground">
                  {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] mb-3">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground uppercase text-[7px] font-bold flex items-center gap-1"><Zap className="h-2 w-2" /> Energia</p>
                  <p className="font-mono font-bold text-white">{run.totalEnergyGeneratedMeV.toFixed(1)} MeV</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground uppercase text-[7px] font-bold flex items-center gap-1"><Activity className="h-2 w-2" /> Duração</p>
                  <p className="font-mono font-bold text-white">{run.durationSeconds.toFixed(1)}s</p>
                </div>
                 {run.finalLyapunovExponent !== undefined && (
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground uppercase text-[7px] font-bold flex items-center gap-1"><TrendingDown className="h-2 w-2" /> Lyapunov (λ)</p>
                    <p className={`font-mono font-bold ${run.finalLyapunovExponent > 0 ? 'text-red-400' : 'text-green-400'}`}>{run.finalLyapunovExponent.toFixed(3)}</p>
                  </div>
                )}
                {run.finalFractalDimensionD !== undefined && (
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground uppercase text-[7px] font-bold flex items-center gap-1"><Waves className="h-2 w-2" /> Fractal (D)</p>
                    <p className="font-mono font-bold text-cyan-400">{run.finalFractalDimensionD.toFixed(3)}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
