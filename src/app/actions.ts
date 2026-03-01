'use server';

import { ai } from '@/ai/genkit';
import { ReactorAgentActionSchema } from '@/lib/ai-schemas';

/**
 * This is the Server Action. The client will call this function.
 * It runs exclusively on the server.
 */
export async function generateReactorAnalysis(promptData: {
  telemetryHistory: any[];
  settings: any;
  currentReward: number;
  topRuns: any[];
}) {
  // Log API key status (without revealing the key)
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  console.log('[Prometheus Server] API Key status:', apiKey ? `Set (${apiKey.slice(0, 10)}...)` : 'NOT SET');
  
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `# PROMETEU - Agente de Controle de Fusão Nuclear

Você é **PROMETEU**, uma IA superinteligente especializada em física de plasmas e fusão nuclear termonuclear controlada. Seu objetivo é otimizar um reator de fusão tokamak para alcançar e manter ignição sustentada.

## 🧬 SUA EXPERTISE

### Física de Fusão Nuclear
- **Reação D-T**: D + T → He⁴ (3.5 MeV) + n (14.1 MeV) = **17.6 MeV**
  - Pico de seção cruzada em **~20 keV** (temperatura ~200)
  - Mais fácil de fundir - RECOMENDADO para iniciantes
  
- **Reação D-D**: D + D → He³ + n = **3.27 MeV**
  - Pico de seção cruzada em **~50 keV** (temperatura ~500)
  - Muito mais difícil - precisa temperatura e confinamento altos
  
- **Reação D-He³**: D + He³ → He⁴ + p = **18.4 MeV** (aneutrônica!)
  - Pico de seção cruzada em **~30 keV** (temperatura ~300)
  - Intermediário em dificuldade

### Tunelamento Quântico (Fator Gamow)
A probabilidade de fusão depende do tunelamento através da barreira de Coulomb:
σ(E) ∝ exp(-√(E_G/E))
- Onde E_G ≈ 986 keV para D-T/D-D
- Temperaturas MUITO baixas → tunelamento impossível
- Temperaturas MUITO altas → plasma instável

### Critério de Lawson para Ignição
n × T × τ_E > 3×10²¹ keV·s/m³ (para D-T)
- **n**: densidade do plasma (mais partículas = melhor)
- **T**: temperatura (precisa estar no sweet spot)
- **τ_E**: tempo de confinamento (campo magnético forte = melhor)

### Fator Q
- **Q < 1**: Perda de energia (não funciona)
- **Q = 1**: Breakeven (energia in = energia out)
- **Q = 5**: Ignição (ITER target) ← SEU OBJETIVO
- **Q > 10**: Viável comercialmente

## ⚙️ SUAS DECISÕES

### 1. "adjust_parameters"
Ajustar temperatura e/ou confinamento. DEVE incluir "parameters" com valores exatos.

### 2. "restart_simulation"  
Reiniciar a simulação com novos parâmetros. Use quando:
- Q-factor = 0 por mais de 3 leituras consecutivas
- Taxa de fusão = 0 prolongadamente  
- Integridade da parede < 70%
- Configuração claramente não funciona

### 3. "no_change"
Manter configurações atuais. Use APENAS quando:
- Q-factor > 1.0 e estável
- Taxa de fusão positiva e crescente
- Sistema em equilíbrio ótimo

## 📊 ESTRATÉGIAS DE OTIMIZAÇÃO

### Para D-T (mais fácil):
1. Temperatura ideal: **150-250** (pico de fusão em ~200)
2. Confinamento: **0.5-1.0** (quanto maior melhor)
3. Densidade: 60-100 partículas

### Para D-D/D-He³ (muito mais difícil):
1. Temperatura ideal: **250-350** (precisa de mais energia)
2. Confinamento: **> 1.0** (essencial)
3. Densidade: > 80 partículas

### Diagnóstico de Problemas:
- **Q=0, Fusões=0**: Temperatura muito baixa OU partículas não colidindo
  → Aumentar temperatura em 20-30 pontos
  
- **Q oscilando**: Plasma instável (MHD instabilities)
  → Aumentar confinamento em 0.1-0.2
  
- **Parede danificada**: Partículas escapando
  → Confinamento insuficiente, aumentar B
  
- **Muitas fusões mas Q baixo**: Energia gasta > energia gerada
  → Reduzir temperatura (está acima do pico σ)

## 🎯 SUA MISSÃO
Alcançar Q > 5.0 (ignição) mantendo estabilidade do plasma. Seja decisivo. Se algo não funciona após 2-3 ajustes, REINICIE com estratégia diferente.`,
      prompt: `## 📡 ESTADO ATUAL DO REATOR

**Configurações Ativas:** 
- Temperatura do Plasma: ${promptData.settings.temperature} (~${(promptData.settings.temperature * 0.1).toFixed(1)} keV)
- Campo Magnético (B): ${promptData.settings.confinement} T
- Ciclo de Combustível: ${promptData.settings.reactionMode === 'DT' ? 'D-T (Deutério-Trítio)' : 'D-D / D-He³'}
- Densidade de Partículas: ${promptData.settings.initialParticleCount ?? 60}

**📈 Métricas em Tempo Real:**
${promptData.telemetryHistory.length > 0 ? (() => {
  const latest = promptData.telemetryHistory[promptData.telemetryHistory.length - 1];
  return `- **Fator Q**: ${latest.qFactor?.toFixed(2) ?? '0.00'} ${latest.qFactor >= 5 ? '🔥 IGNIÇÃO!' : latest.qFactor >= 1 ? '✓ Breakeven' : '⚠️ Abaixo do breakeven'}
- **Taxa de Fusão**: ${latest.fusionRate ?? 0} fusões/segundo
- **Partículas Ativas**: ${latest.particleCount ?? 'N/A'}
- **Fator q Magnético**: ${latest.magneticSafetyFactorQ?.toFixed(2) ?? 'N/A'}
- **Dimensão Fractal D**: ${latest.fractalDimensionD?.toFixed(2) ?? 'N/A'} ${latest.fractalDimensionD > 1.5 ? '⚠️ Turbulência alta' : ''}`;
})() : '⚠️ Sem dados de telemetria ainda - simulação recém iniciada'}

**📊 Tendência (últimas 5 leituras):**
${promptData.telemetryHistory.length > 0 ? JSON.stringify(promptData.telemetryHistory.slice(-5).map(t => ({
  Q: t.qFactor?.toFixed(2) ?? '0',
  fusões: t.fusionRate ?? 0,
  partículas: t.particleCount
})), null, 2) : 'Nenhum histórico disponível'}

**🏆 Melhores Runs Históricos (referência):**
${promptData.topRuns?.length > 0 ? JSON.stringify(promptData.topRuns.slice(0, 3).map(r => ({
  score: r.score?.toFixed(0),
  Q_final: r.finalQFactor?.toFixed(2),
  temperatura: r.initialTemperature,
  confinamento: r.initialConfinement?.toFixed(2),
  modo: r.reactionMode
})), null, 2) : 'Nenhum dado histórico'}

---

**🤖 PROMETEU, analise o estado do reator e decida a próxima ação.**

Considere:
1. O Q-factor está progredindo ou estagnado?
2. A temperatura está no range ótimo para ${promptData.settings.reactionMode === 'DT' ? 'D-T (150-250 para pico de fusão)' : 'D-D/D-He³ (250-350 necessário)'}?
3. O confinamento é suficiente? (mínimo 0.5 para D-T, 1.0 para D-D)
4. Vale a pena continuar ajustando ou é melhor reiniciar?`,
      output: {
        format: 'json',
        schema: ReactorAgentActionSchema,
      },
      config: { temperature: 0.4 },
    });

    const analysis = response.output;
    const usage = response.usage;

    // Return serializable data to the client
    return {
      analysis,
      usage,
    };
  } catch (error: any) {
    console.error("❌ Error in generateReactorAnalysis:", {
      message: error?.message || 'Unknown error',
      code: error?.code,
      status: error?.status,
      details: error?.details,
      stack: error?.stack?.slice(0, 500),
    });
    // Return the actual error message for debugging
    return { error: `Failed to get analysis from AI: ${error?.message || 'Unknown error'}` };
  }
}
