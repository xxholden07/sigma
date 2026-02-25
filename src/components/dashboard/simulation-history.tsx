'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { History, Loader2, ServerCrash } from 'lucide-react';
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
      limit(10)
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-lg font-headline">Histórico</CardTitle>
          <CardDescription>Suas simulações recentes.</CardDescription>
        </div>
        <History className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] w-full">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
             <div className="flex flex-col items-center justify-center h-full text-center">
                <ServerCrash className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm font-medium text-destructive">Erro ao carregar histórico</p>
                <p className="text-xs text-muted-foreground">Verifique as regras de segurança.</p>
             </div>
          )}
          {!isLoading && !error && (!runs || runs.length === 0) && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Nenhuma simulação salva ainda.</p>
            </div>
          )}
          <div className="space-y-4">
            {runs?.map((run) => (
              <div key={run.id} className="flex justify-between items-start text-sm">
                <div className="space-y-1">
                  <p className="font-medium">
                    {run.totalEnergyGeneratedMeV.toFixed(1)} MeV em {run.durationSeconds.toFixed(1)}s
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <Badge variant={getOutcomeBadgeVariant(run.outcome)}>{run.outcome}</Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
