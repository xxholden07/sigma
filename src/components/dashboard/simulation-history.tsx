
'use client';

import { collection, query, orderBy, limit } from 'firebase/firestore';
import { History, Loader2, ServerCrash, Database } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { SimulationRun } from '@/lib/simulation-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SimulationHistoryPanel() {
  const { firestore, user } = useFirebase();

  const simulationRunsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'simulationRuns'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [firestore, user]);

  const { data: runs, isLoading, error } = useCollection<SimulationRun>(simulationRunsQuery);

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
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Últimos Experimentos</span>
        </div>
        <Badge variant="outline" className="text-[9px] h-4 border-primary/30">
          {runs?.length || 0} REGISTROS
        </Badge>
      </div>

      <ScrollArea className="h-[250px] w-full pr-4">
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
            <div key={run.id} className="group relative overflow-hidden rounded-md border border-white/5 bg-slate-900/40 p-2 transition-all hover:bg-slate-900/60">
              <div className="flex items-center justify-between mb-1.5">
                <Badge variant={getOutcomeBadgeVariant(run.outcome)} className="text-[8px] h-3 px-1">
                  {run.outcome}
                </Badge>
                <span className="text-[8px] font-mono text-muted-foreground">
                  {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground uppercase text-[8px] font-bold">Energia:</p>
                  <p className="font-mono font-bold text-white">{run.totalEnergyGeneratedMeV.toFixed(1)} MeV</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground uppercase text-[8px] font-bold">Duração:</p>
                  <p className="font-mono font-bold text-white">{run.durationSeconds.toFixed(1)}s</p>
                </div>
              </div>

              <div className="mt-2 flex gap-1 items-center">
                 <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${Math.min(100, (run.totalEnergyGeneratedMeV / 50) * 100)}%` }} 
                    />
                 </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
