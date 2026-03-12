import React, { useEffect, useState } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import { SearchableDropdown } from '../SearchableDropdown';
import * as T from '../../types';

interface FlowReadiness {
  flowId: string;
  flowName: string;
  orderNo: number;
  hasHtml: boolean;
  stepCount: number;
}

export const ExecutionStep: React.FC = () => {
  const {
    companies, selectedCompanyId, selectedScenarioId, extraction, refreshExtraction, selectScenario
  } = useWizardState();

  const [execCompanyId, setExecCompanyId] = useState<string>(selectedCompanyId || '');
  const [execScenarioId, setExecScenarioId] = useState<string>(selectedScenarioId || '');
  const [execScenarios, setExecScenarios] = useState<T.Scenario[]>([]);
  const [flowReadiness, setFlowReadiness] = useState<FlowReadiness[]>([]);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showBrowser, setShowBrowser] = useState(true);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<T.RunStatus>(T.RunStatus.Pending);

  // Load scenarios when company changes
  useEffect(() => {
    if (execCompanyId) {
      api.listScenariosByCompany(execCompanyId).then(setExecScenarios).catch(console.error);
    } else {
      setExecScenarios([]);
    }
    setExecScenarioId('');
    setFlowReadiness([]);
  }, [execCompanyId]);

  // Load flow readiness when scenario changes
  useEffect(() => {
    if (execScenarioId) {
      checkReadiness(execScenarioId);
      refreshExtraction(execScenarioId);
    } else {
      setFlowReadiness([]);
    }
  }, [execScenarioId, refreshExtraction]);

  const checkReadiness = async (scenarioId: string) => {
    setLoadingReadiness(true);
    try {
      const flowList = await api.listFlowsByScenario(scenarioId);
      const readiness: FlowReadiness[] = [];

      for (const flow of flowList.sort((a, b) => a.orderNo - b.orderNo)) {
        const steps = await api.listStepsByFlow(flow.id);
        readiness.push({
          flowId: flow.id,
          flowName: flow.name,
          orderNo: flow.orderNo,
          hasHtml: !!flow.htmlSnippet,
          stepCount: steps.length,
        });
      }

      setFlowReadiness(readiness);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReadiness(false);
    }
  };

  const isReady = flowReadiness.length > 0 &&
    flowReadiness.every(f => f.hasHtml && f.stepCount > 0) &&
    !!extraction;

  const missingItems = flowReadiness.filter(f => !f.hasHtml || f.stepCount === 0);
  const extractionMissing = !extraction;

  const runScenario = async () => {
    if (!execScenarioId || !isReady) return;

    setIsExecuting(true);
    setRunResult(null);
    try {
      const runId = await api.runScenario(execScenarioId, {
        triggeredBy: 'wizard',
        showBrowser,
      });
      setActiveRunId(runId);
      setRunStatus(T.RunStatus.Running);

      // Poll for status
      const poll = setInterval(async () => {
        try {
          // First check the overall run status
          const runInfo = await api.getRunStatus(runId);
          setRunStatus(runInfo.status);
          
          if (runInfo.status === T.RunStatus.Completed || runInfo.status === T.RunStatus.Failed) {
            clearInterval(poll);
            setIsExecuting(false);
            
            // If it finished, try to fetch the result JSON (it might be missing if it failed)
            try {
              const result = await api.getRunResult(runId);
              if (result && result.resultJson) {
                setRunResult(result.resultJson);
              }
            } catch (err) {
              console.warn("Sonuç getirilemedi:", err);
            }
          }
        } catch (err) {
          console.error("Durum kontrolü hatası:", err);
          // Don't stop polling on a single network error, but log it
        }
      }, 3000);

      // Timeout after 5 min
      setTimeout(() => {
        clearInterval(poll);
        if (isExecuting) {
          setIsExecuting(false);
          setRunStatus(T.RunStatus.Failed);
        }
      }, 300000);

    } catch (err) {
      console.error(err);
      alert('Çalıştırma sırasında hata oluştu.');
      setIsExecuting(false);
    }
  };

  const companyOptions = companies.map(c => ({
    value: c.id,
    label: c.name,
    subLabel: c.code,
    icon: 'bi-building',
  }));

  const scenarioOptions = execScenarios.map(s => ({
    value: s.id,
    label: s.name,
    subLabel: s.description || '',
    icon: 'bi-journal-text',
  }));

  return (
    <div className="panel-view animate-fade-in">
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-play-circle panel-title-icon execution-icon"></i>
          <div>
            <h3>Senaryo Çalıştır</h3>
            <p className="muted">Firma ve senaryo seçerek otomasyonu başlatın.</p>
          </div>
        </div>
      </div>

      <div className="grid-two">
        {/* Selection Panel */}
        <div className="glass-card">
          <h4><i className="bi bi-gear"></i> Çalıştırma Ayarları</h4>
          <div className="form-stack">
            <div className="form-group">
              <label>Firma</label>
              <SearchableDropdown
                options={companyOptions}
                value={execCompanyId}
                onChange={setExecCompanyId}
                placeholder="Firma seçin..."
              />
            </div>

            <div className="form-group">
              <label>Senaryo</label>
              <SearchableDropdown
                options={scenarioOptions}
                value={execScenarioId}
                onChange={setExecScenarioId}
                placeholder="Senaryo seçin..."
                disabled={!execCompanyId}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showBrowser}
                  onChange={e => setShowBrowser(e.target.checked)}
                />
                Tarayıcıyı göster
              </label>
            </div>

            <button
              className={`btn-modern w-full ${isReady ? '' : 'disabled'}`}
              onClick={runScenario}
              disabled={!isReady || isExecuting}
            >
              <i className={`bi ${isExecuting ? 'bi-hourglass-split' : 'bi-play-fill'}`}></i>
              {isExecuting ? 'Çalışıyor...' : 'Senaryoyu Çalıştır'}
            </button>
          </div>
        </div>

        {/* Readiness Panel */}
        <div className="glass-card">
          <h4><i className="bi bi-clipboard-check"></i> Hazırlık Kontrolü</h4>

          {!execScenarioId && (
            <div className="empty-state">
              <i className="bi bi-arrow-left"></i>
              <span>Kontrol için senaryo seçin.</span>
            </div>
          )}

          {loadingReadiness && (
            <div className="empty-state">
              <i className="bi bi-hourglass-split"></i>
              <span>Kontrol ediliyor...</span>
            </div>
          )}

          {execScenarioId && !loadingReadiness && flowReadiness.length === 0 && (
            <div className="readiness-alert warning">
              <i className="bi bi-exclamation-triangle"></i>
              <span>Bu senaryoda henüz akış tanımlanmamış.</span>
            </div>
          )}

          {flowReadiness.length > 0 && (
            <>
              {isReady ? (
                <div className="readiness-alert success">
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Tüm gereksinimler karşılandı. Senaryo çalıştırılabilir.</span>
                </div>
              ) : (
                <div className="readiness-alert warning">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{missingItems.length} akışta eksiklik var.</span>
                </div>
              )}

              <div className="readiness-list">
                {flowReadiness.map(f => (
                  <div key={f.flowId} className={`readiness-item ${f.hasHtml && f.stepCount > 0 ? 'ready' : 'not-ready'}`}>
                    <div className="readiness-flow-info">
                      <span className="readiness-order">#{f.orderNo}</span>
                      <span className="readiness-name">{f.flowName}</span>
                    </div>
                    <div className="readiness-checks">
                      <span className={`readiness-check ${f.hasHtml ? 'pass' : 'fail'}`}>
                        <i className={`bi ${f.hasHtml ? 'bi-check-circle' : 'bi-x-circle'}`}></i> HTML
                      </span>
                      <span className={`readiness-check ${f.stepCount > 0 ? 'pass' : 'fail'}`}>
                        <i className={`bi ${f.stepCount > 0 ? 'bi-check-circle' : 'bi-x-circle'}`}></i> {f.stepCount} Adım
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="readiness-list mt-2">
                <div className={`readiness-item ${!extractionMissing ? 'ready' : 'not-ready'}`}>
                  <div className="readiness-flow-info">
                    <span className="readiness-order"><i className="bi bi-box-arrow-in-right"></i></span>
                    <span className="readiness-name">Sonuç Çıkarma (Extraction)</span>
                  </div>
                  <div className="readiness-checks">
                    <span className={`readiness-check ${!extractionMissing ? 'pass' : 'fail'}`}>
                      <i className={`bi ${!extractionMissing ? 'bi-check-circle' : 'bi-x-circle'}`}></i> {extraction ? 'Tanımlı' : 'Tanımsız'}
                    </span>
                    {extractionMissing && (
                      <button 
                        className="btn-mini-primary ml-2" 
                        onClick={() => selectScenario(execScenarioId, 'extraction')}
                      >
                        Tanımla
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Run Status & Result */}
      {activeRunId && (
        <div className="glass-card mt-4">
          <h4><i className="bi bi-info-circle"></i> Çalıştırma Durumu</h4>
          
          {runStatus === T.RunStatus.Running && (
            <div className="running-indicator mt-4">
              <div className="pulse-dot"></div>
              <span>Senaryo çalışıyor... (Run ID: {activeRunId})</span>
            </div>
          )}

          {runStatus === T.RunStatus.Completed && (
            <div className="readiness-alert success mt-4">
              <i className="bi bi-check-circle-fill"></i>
              <span>Senaryo başarıyla tamamlandı.</span>
            </div>
          )}

          {runStatus === T.RunStatus.Failed && (
            <div className="readiness-alert warning mt-4">
              <i className="bi bi-x-circle-fill"></i>
              <span>Senaryo çalıştırılırken bir hata oluştu veya başarısız oldu.</span>
            </div>
          )}

          {runResult && (
            <div className="mt-4">
              <h5 className="mb-2"><i className="bi bi-terminal"></i> Çıkarılan Sonuç (JSON)</h5>
              <pre className="result-pre">{runResult}</pre>
            </div>
          )}
          
          {!runResult && runStatus === T.RunStatus.Completed && (
            <div className="mt-4 text-muted small">
              <i className="bi bi-info-circle"></i> Sonuç çıkarılamadı veya boş döndü. Extraction (Sonuç Çıkarma) ayarlarınızı kontrol edin.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
