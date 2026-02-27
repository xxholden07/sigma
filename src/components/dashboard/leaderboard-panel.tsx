
"use client";

import type { SimulationRun } from "@/lib/simulation-types";
import { Trophy, User, Zap } from 'lucide-react';

interface LeaderboardPanelProps {
    topRuns?: SimulationRun[];
    isLoading: boolean;
}

export function LeaderboardPanel({ topRuns, isLoading }: LeaderboardPanelProps) {

    if (isLoading) {
        return <div className="text-center p-4 text-sm text-muted-foreground">Carregando ranking...</div>;
    }
    
    if (!topRuns || topRuns.length === 0) {
        return <div className="text-center p-4 text-sm text-muted-foreground">Nenhuma pontuação registrada. Seja o primeiro!</div>;
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
                {topRuns.map((run, index) => (
                    <li key={run.id} className={`flex items-center justify-between p-2 rounded-md ${index === 0 ? 'bg-amber-400/20 border border-amber-400/30' : 'bg-slate-800/50'}`}>
                        <div className="flex items-center gap-3">
                            <span className={`font-bold text-sm w-6 text-center ${index < 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>{index + 1}</span>
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-mono truncate" title={run.userId}>{run.userId.substring(0, 8)}...</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="font-bold text-primary text-sm">{run.score ? Math.round(run.score) : 0}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
