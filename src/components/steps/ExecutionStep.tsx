import React, { useEffect, useState, useRef } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import { HubConnectionBuilder, LogLevel, HubConnection } from '@microsoft/signalr';
import type { FlowRunResponse, StepRunResponse, RepairSuggestion } from '../../types';
import { RunStatus } from '../../types';export const ExecutionStep: React.FC = () => {
  const { selectedScenarioId } = useWizardState();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>(RunStatus.Pending);
  const [flowRuns, setFlowRuns] = useState<FlowRunResponse[]>([]);
  const [stepRuns, setStepRuns] = useState<Record<string, StepRunResponse[]>>({});
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showBrowser, setShowBrowser] = useState(true);

  // AI Repair State
  const [repairingStepId, setRepairingStepId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<RepairSuggestion[]>([]);

  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    // Setup SignalR
    const conn = new HubConnectionBuilder()
      .withUrl("http://localhost:5177/hubs/execution")
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    conn.on("RunStatusChanged", (rId: string, status: RunStatus) => {
      if (rId === activeRunId) setRunStatus(status);
    });

    conn.on("FlowRunUpdated", (rId: string, data: FlowRunResponse) => {
      if (rId === activeRunId) {
        setFlowRuns(prev => {
          const idx = prev.findIndex(f => f.id === data.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data;
            return next;
          }
          return [...prev, data];
        });
      }
    });

    conn.on("StepRunUpdated", (fRunId: string, data: StepRunResponse) => {
      setStepRuns(prev => {
        const next = { ...prev };
        if (!next[fRunId]) next[fRunId] = [];
        const steps = next[fRunId];
        const idx = steps.findIndex(s => s.id === data.id);
        if (idx >= 0) {
          steps[idx] = data;
        } else {
          steps.push(data);
        }
        return next;
      });
    });

    conn.start().catch(console.error);
    connectionRef.current = conn;

    return () => { conn.stop(); };
  }, [activeRunId]);

  const startExecution = async () => {
    if (!selectedScenarioId) return;

    setIsExecuting(true);
    setRunStatus(RunStatus.Pending);
    setFlowRuns([]);
    setStepRuns({});
    setFinalResult(null);
    setSuggestions([]);

    try {
      const runId = await api.runScenario(selectedScenarioId, {
        triggeredBy: 'React UI',
        showBrowser
      });
      setActiveRunId(runId);
      
      // Join group for this run
      if (connectionRef.current?.state === 'Connected') {
        await connectionRef.current.invoke("JoinRunGroup", runId);
      }
    } catch (err) {
      console.error(err);
      alert('Başlatılamadı.');
      setIsExecuting(false);
    }
  };

  const loadFinalResult = async () => {
    if (!activeRunId) return;
    try {
      const res = await api.getRunResult(activeRunId);
      setFinalResult(res.resultJson);
    } catch (err) {
      console.error("Result fetch error:", err);
    }
  };

  useEffect(() => {
    if (runStatus === RunStatus.Completed) {
      setIsExecuting(false);
      loadFinalResult();
    } else if (runStatus === RunStatus.Failed || runStatus === RunStatus.TimedOut) {
      setIsExecuting(false);
    }
  }, [runStatus]);

  const loadRepairSuggestions = async (stepRunId: string) => {
    if (!activeRunId) return;
    setRepairingStepId(stepRunId);
    setSuggestions([]);
    try {
      const data = await api.getRepairSuggestions(activeRunId, stepRunId);
      setSuggestions(data);
    } catch (err) {
      console.error(err);
      alert('Öneriler yüklenemedi.');
    }
  };

  const getStatusIcon = (status: RunStatus) => {
    switch (status) {
      case RunStatus.Pending: return <i className="bi bi-clock text-gray-400"></i>;
      case RunStatus.Running: return <i className="bi bi-arrow-repeat spin text-blue-400 animate-spin flex"></i>;
      case RunStatus.Completed: return <i className="bi bi-check-circle-fill text-green-500"></i>;
      case RunStatus.Failed: return <i className="bi bi-x-circle-fill text-red-500"></i>;
      case RunStatus.TimedOut: return <i className="bi bi-alarm text-orange-500"></i>;
      default: return null;
    }
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="panel-header-modern">
        <h3>Önizleme & Çalıştırma</h3>
        <p className="muted">Kurduğunuz senaryoyu gerçek zamanlı çalıştırın ve durumu izleyin.</p>
      </div>

      <div className="panel-block-modern glass-card flex flex-col items-center">
        <label className="flex items-center gap-2 mb-4">
          <input type="checkbox" checked={showBrowser} onChange={e => setShowBrowser(e.target.checked)} /> Browser Görünür Olsun (Headless: false)
        </label>
        
        <button className="btn-modern btn-lg" onClick={startExecution} disabled={isExecuting || !selectedScenarioId}>
          <i className="bi bi-play-circle-fill"></i> {isExecuting ? 'Senaryo Çalışıyor...' : 'Senaryoyu Başlat'}
        </button>

        {activeRunId && (
          <div className="run-status-badge mt-4">
            <span className="font-bold">Durum:</span> {RunStatus[runStatus]}
          </div>
        )}
      </div>

      {activeRunId && (
        <div className="grid-two mt-6">
          <div className="panel-block-modern glass-card">
            <h4>Canlı Akış Logları</h4>
            <div className="timeline-modern mt-4">
              {flowRuns.sort((a,b) => a.flowOrderNo - b.flowOrderNo).map(fRun => (
                <div key={fRun.id} className="timeline-node" data-status={RunStatus[fRun.status]}>
                  <div className="dot"></div>
                  <div className="font-bold flex gap-2 items-center">
                    {getStatusIcon(fRun.status)} Akış: {fRun.flowName}
                  </div>
                  
                  <div className="step-logs mt-2 pl-4 border-l border-[rgba(255,255,255,0.1)]">
                    {(stepRuns[fRun.id] || []).map(sRun => (
                      <div key={sRun.id} className="step-run-item mb-2 last:mb-0">
                        <div className="flex gap-2 items-center text-sm">
                          {getStatusIcon(sRun.status)} {sRun.stepName}
                        </div>
                        {sRun.selectorValueResolved && (
                          <div className="text-xs text-blue-300 ml-6 opacity-70">
                            Selector: {sRun.selectorValueResolved.substring(0, 40)}
                          </div>
                        )}
                        {sRun.errorMessage && (
                          <div className="text-xs text-red-400 ml-6 mt-1 flex flex-col gap-2 p-2 bg-red-500/10 rounded border-l-2 border-red-500">
                            <span>Hata: {sRun.errorMessage}</span>
                            {sRun.status === RunStatus.Failed && (
                              <button className="btn-modern w-fit font-bold text-xs px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 border-none rounded-2xl shadow-lg shadow-purple-500/30" onClick={() => loadRepairSuggestions(sRun.id)}>
                                <i className="bi bi-magic"></i> AI Tamir Önerisi Al
                              </button>
                            )}
                          </div>
                        )}
                        {repairingStepId === sRun.id && suggestions.length > 0 && (
                          <div className="mt-2 ml-6 p-4 rounded-xl bg-gray-900 border border-purple-500/30">
                            <h5 className="text-purple-400 flex items-center gap-2 mb-3">
                              <i className="bi bi-robot"></i> AI Tamir Önerileri
                            </h5>
                            <div className="grid gap-3">
                              {suggestions.map((s, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-purple-500/50 transition-colors">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.confidenceScore >= 0.8 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                      {(s.confidenceScore * 100).toFixed(0)}% Match
                                    </span>
                                  </div>
                                  <div className="font-mono text-sm bg-black/30 p-2 rounded mb-2 break-all">{s.suggestedSelector}</div>
                                  <div className="text-xs text-gray-400 mb-3">{s.explanation}</div>
                                  <button className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded">
                                    Bunu Uygula (Veritabanını Güncelle)
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-block-modern glass-card flex flex-col h-full">
            <h4>Sonuç / Çıktı</h4>
            <div className="result-viewer mt-4 flex-1 bg-black/30 rounded-lg border border-[rgba(255,255,255,0.05)] p-4 overflow-auto min-h-[300px]">
              {finalResult ? (
                <pre className="text-sm font-mono text-green-300 m-0">{JSON.stringify(JSON.parse(finalResult), null, 2)}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 italic">
                  Senaryo başarıyla tamamlandıktan sonra sonuçlar burada görüntülenecektir.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
