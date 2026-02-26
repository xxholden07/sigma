
'use client';

import { collection, query, limit } from 'firebase/firestore';
import { History, Loader2, ServerCrash, Database, TrendingDown, Waves, Zap, Activity } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { SimulationRun } from '@/lib/simulation-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMemo } from 'react';

export function SimulationHistoryPanel() {
  const { firestore, user } = useFirebase();

  // Removido orderBy para evitar necessidade de índices
  const simulationRunsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'simulationRuns'),
      limit(50)
    );
  }, [firestore, user]);

  const { data: rawRuns, isLoading, error } = useCollection<SimulationRun>(simulationRunsQuery);

  // Ordenação na memória
  const runs = useMemo(() => {
    if (!rawRuns) return [];
    return [...rawRuns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawRuns]);

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
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dataset de Treinamento (JAX)</span>
        </div>
        <Badge variant="outline" className="text-[9px] h-4 border-primary/30">
          {runs?.length || 0} REGISTROS
        </Badge>
      </div>

      <ScrollArea className="h-[300px] w-full pr-4">
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <ServerCrash className="h-6 w-6 text-destructive" />
            <p className="text-[10px] font-bold text-destructive uppercase">Erro de Sincronia</p>
          </div>
        )}

        {!isLoading && !error && (!runs || runs.length === 0) && (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-50 space-y-2">
            <Database className="h-6 w-6 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-tighter">Dataset Vazio</p>
          </div>
        )}

        <div className="space-y-3">
          {runs?.map((run) => (
            <div key={run.id} className="group relative overflow-hidden rounded-md border border-white/5 bg-slate-900/40 p-3 transition-all hover:bg-slate-900/60 shadow-lg">
              <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                 <Database className="h-3 w-3 text-primary" />
              </div>

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
                  <p className="text-muted-foreground uppercase text-[7px] font-bold flex items-center gap-1">
                    <Zap className="h-2 w-2" /> Energia
                  </p>
                  <p className="font-mono font-bold text-white">{run.totalEnergyGeneratedMeV.toFixed(1)} MeV</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground uppercase text-[7px] font-bold flex items-center gap-1">
                    <Activity className="h-2 w-2" /> Duração
                  </p>
                  <p className="font-mono font-bold text-white">{run.durationSeconds.toFixed(1)}s</p>
                </div>
                {run.finalLyapunovExponent !== undefined && (
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground uppercase text-[7px] font-bold flex items-center gap-1">
                      <TrendingDown className="h-2 w-2" /> Lyapunov (λ)
                    </p>
                    <p className={`font-mono font-bold ${run.finalLyapunovExponent > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {run.finalLyapunovExponent.toFixed(3)}
                    </p>
                  </div>
                )}
                {run.finalFractalDimensionD !== undefined && (
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground uppercase text-[7px] font-bold flex items-center gap-1">
                      <Waves className="h-2 w-2" /> Fractal (D)
                    </p>
                    <p className="font-mono font-bold text-cyan-400">{run.finalFractalDimensionD.toFixed(3)}</p>
                  </div>
                )}
              </div>

              <TooltipProvider>
                <div className="flex gap-1 items-center mt-1">
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden cursor-help">
                        <div 
                          className={`h-full ${run.outcome === 'High Yield' ? 'bg-amber-400' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, (run.totalEnergyGeneratedMeV / 50) * 100)}%` }} 
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-[9px] bg-slate-900 border-white/10">
                      Rendimento Energético: {(run.totalEnergyGeneratedMeV / 50 * 100).toFixed(0)}% da meta
                    </TooltipContent>
                   </Tooltip>
                </div>
              </TooltipProvider>

              {run.finalAiReward !== undefined && (
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                   <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">IA REWARD SCORE</span>
                   <span className={`text-[9px] font-mono font-bold ${run.finalAiReward > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {run.finalAiReward.toFixed(2)}
                   </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
