
"use client";

import type { SimulationRun } from "@/lib/simulation-types";
import { Trophy, User, Zap, Crown, Medal } from 'lucide-react';

interface LeaderboardPanelProps {
    topRuns?: SimulationRun[];
    isLoading: boolean;
}

export function LeaderboardPanel({ topRuns, isLoading }: LeaderboardPanelProps) {

    if (isLoading) {
        return (
          <div className="flex flex-col items-center justify-center p-6 gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs text-muted-foreground">Carregando ranking...</span>
          </div>
        );
    }
    
    if (!topRuns || topRuns.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-6 gap-3 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma pontuação registrada.</p>
            <p className="text-xs text-primary">Seja o primeiro a pontuar!</p>
          </div>
        );
    }

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="h-4 w-4 text-amber-400" />;
        if (index === 1) return <Medal className="h-4 w-4 text-slate-300" />;
        if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />;
        return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{index + 1}</span>;
    };

    const getRankStyle = (index: number) => {
        if (index === 0) return 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-400/40 shadow-lg shadow-amber-500/10';
        if (index === 1) return 'bg-gradient-to-r from-slate-400/15 to-slate-400/5 border-slate-400/30';
        if (index === 2) return 'bg-gradient-to-r from-amber-600/15 to-amber-600/5 border-amber-600/30';
        return 'bg-slate-800/30 border-white/5 hover:bg-slate-800/50';
    };

    return (
        <div className="flex flex-col gap-2">
            {topRuns.map((run, index) => (
                <div 
                  key={run.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${getRankStyle(index)}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${index < 3 ? 'bg-white/10' : 'bg-slate-700/50'}`}>
                          {getRankIcon(index)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Jogador</span>
                          <span className="text-xs font-mono font-medium text-white truncate max-w-[80px]" title={run.userId}>
                            {run.userId.substring(0, 8)}...
                          </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
                        <div className="flex items-center gap-1">
                          <Zap className={`h-3.5 w-3.5 ${index === 0 ? 'text-amber-400' : 'text-primary'}`} />
                          <span className={`font-mono font-black text-lg tabular-nums ${index === 0 ? 'text-amber-400' : 'text-white'}`}>
                            {run.score ? Math.round(run.score).toLocaleString() : 0}
                          </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
