import React from 'react';
import { api } from '../../api';
import { useWizardState } from '../../WizardContext';
import * as T from '../../types';

const runStatusLabels: Record<T.RunStatus, string> = {
  [T.RunStatus.Pending]: 'Pending',
  [T.RunStatus.Queued]: 'Queued',
  [T.RunStatus.Running]: 'Running',
  [T.RunStatus.Completed]: 'Completed',
  [T.RunStatus.Failed]: 'Failed',
  [T.RunStatus.Skipped]: 'Skipped',
};

const healthStatusLabels: Record<T.ScenarioHealthStatus, string> = {
  [T.ScenarioHealthStatus.Unknown]: 'Bilinmiyor',
  [T.ScenarioHealthStatus.Healthy]: 'Saglikli',
  [T.ScenarioHealthStatus.Degraded]: 'Riskli',
  [T.ScenarioHealthStatus.Outage]: 'Kesinti',
};

const healthStatusClassNames: Record<T.ScenarioHealthStatus, string> = {
  [T.ScenarioHealthStatus.Unknown]: 'unknown',
  [T.ScenarioHealthStatus.Healthy]: 'healthy',
  [T.ScenarioHealthStatus.Degraded]: 'degraded',
  [T.ScenarioHealthStatus.Outage]: 'outage',
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
};

export const OpsCenterView: React.FC = () => {
  const { companies, loadCompanies } = useWizardState();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>('');
  const [healthRows, setHealthRows] = React.useState<T.ScenarioHealthSnapshotResponse[]>([]);
  const [loadingHealth, setLoadingHealth] = React.useState(false);
  const [healthError, setHealthError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [selectedHealth, setSelectedHealth] = React.useState<T.ScenarioHealthSnapshotResponse | null>(null);

  const [runIdInput, setRunIdInput] = React.useState('');
  const [loadingRun, setLoadingRun] = React.useState(false);
  const [runError, setRunError] = React.useState<string | null>(null);
  const [runDetail, setRunDetail] = React.useState<T.ScenarioRunResponse | null>(null);
  const [flowRuns, setFlowRuns] = React.useState<T.FlowRunResponse[]>([]);
  const [selectedFlowRunId, setSelectedFlowRunId] = React.useState<string | null>(null);
  const [stepRuns, setStepRuns] = React.useState<T.StepRunResponse[]>([]);

  React.useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const loadHealth = React.useCallback(async () => {
    setLoadingHealth(true);
    setHealthError(null);

    try {
      const rows = await api.getScenarioHealth(selectedCompanyId || undefined);
      setHealthRows(rows);
      setSelectedHealth(current => {
        if (!current) {
          return rows[0] ?? null;
        }

        return rows.find(row => row.scenarioId === current.scenarioId) ?? rows[0] ?? null;
      });
    } catch (error) {
      console.error(error);
      setHealthError('Operasyon verisi alınamadı.');
    } finally {
      setLoadingHealth(false);
    }
  }, [selectedCompanyId]);

  React.useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  React.useEffect(() => {
    if (!selectedFlowRunId) {
      setStepRuns([]);
      return;
    }

    api.getStepRuns(selectedFlowRunId)
      .then(setStepRuns)
      .catch(error => {
        console.error(error);
        setStepRuns([]);
      });
  }, [selectedFlowRunId]);

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return healthRows;
    }

    return healthRows.filter(row =>
      row.companyName.toLowerCase().includes(query)
      || row.scenarioName.toLowerCase().includes(query)
      || (row.lastFailureFingerprint || '').toLowerCase().includes(query),
    );
  }, [healthRows, search]);

  const stats = React.useMemo(() => ({
    total: healthRows.length,
    healthy: healthRows.filter(row => row.status === T.ScenarioHealthStatus.Healthy).length,
    degraded: healthRows.filter(row => row.status === T.ScenarioHealthStatus.Degraded).length,
    outage: healthRows.filter(row => row.status === T.ScenarioHealthStatus.Outage).length,
  }), [healthRows]);

  const inspectRun = async () => {
    const normalizedRunId = runIdInput.trim();
    if (!normalizedRunId) {
      return;
    }

    setLoadingRun(true);
    setRunError(null);
    setSelectedFlowRunId(null);

    try {
      const [run, flows] = await Promise.all([
        api.getRun(normalizedRunId),
        api.getFlowRuns(normalizedRunId),
      ]);

      setRunDetail(run);
      setFlowRuns(flows);
      setSelectedFlowRunId(flows[0]?.id ?? null);
    } catch (error) {
      console.error(error);
      setRunDetail(null);
      setFlowRuns([]);
      setStepRuns([]);
      setRunError('Run detayları alınamadı. Run ID veya backend erişimini kontrol edin.');
    } finally {
      setLoadingRun(false);
    }
  };

  return (
    <div className="panel-view animate-fade-in">
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-activity panel-title-icon ops-panel-icon"></i>
          <div>
            <h3>Operasyon Merkezi</h3>
            <p className="muted">Mevcut akışları bozmadan sağlık durumunu ve run detaylarını izleyin.</p>
          </div>
        </div>
      </div>

      <div className="ops-hero-grid">
        <div className="ops-stat-card glass-card">
          <span className="ops-stat-label">Toplam Senaryo</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="ops-stat-card glass-card">
          <span className="ops-stat-label">Saglikli</span>
          <strong>{stats.healthy}</strong>
        </div>
        <div className="ops-stat-card glass-card">
          <span className="ops-stat-label">Riskli</span>
          <strong>{stats.degraded}</strong>
        </div>
        <div className="ops-stat-card glass-card">
          <span className="ops-stat-label">Kesinti</span>
          <strong>{stats.outage}</strong>
        </div>
      </div>

      <div className="grid-two mt-4">
        <div className="glass-card ops-health-card">
          <div className="ops-card-header">
            <h4><i className="bi bi-heart-pulse"></i> Sağlık Özeti</h4>
            <button className="btn-outline-modern" onClick={() => void loadHealth()}>
              Yenile
            </button>
          </div>

          <div className="ops-filter-row">
            <select
              className="modern-input"
              value={selectedCompanyId}
              onChange={event => setSelectedCompanyId(event.target.value)}
            >
              <option value="">Tum Firmalar</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <input
              className="modern-input"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Senaryo, firma veya fingerprint ara"
            />
          </div>

          {loadingHealth && <div className="empty-state"><span>Yukleniyor...</span></div>}
          {healthError && <div className="readiness-alert warning mt-4"><span>{healthError}</span></div>}

          {!loadingHealth && !healthError && (
            <div className="ops-health-list">
              {filteredRows.map(row => (
                <button
                  key={row.scenarioId}
                  className={`ops-health-row ${selectedHealth?.scenarioId === row.scenarioId ? 'selected' : ''}`}
                  onClick={() => setSelectedHealth(row)}
                  type="button"
                >
                  <div className="ops-health-main">
                    <strong>{row.scenarioName}</strong>
                    <span>{row.companyName}</span>
                  </div>
                  <span className={`ops-badge ${healthStatusClassNames[row.status]}`}>
                    {healthStatusLabels[row.status]}
                  </span>
                </button>
              ))}

              {filteredRows.length === 0 && (
                <div className="empty-state">
                  <span>Filtreye uygun operasyon kaydı bulunamadı.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-card ops-detail-card">
          <h4><i className="bi bi-journal-medical"></i> Sağlık Detayı</h4>

          {!selectedHealth && (
            <div className="empty-state">
              <span>Detay görmek için soldan bir senaryo seçin.</span>
            </div>
          )}

          {selectedHealth && (
            <div className="ops-detail-stack">
              <div className="ops-detail-block">
                <span className="muted">Durum</span>
                <strong>{healthStatusLabels[selectedHealth.status]}</strong>
              </div>
              <div className="ops-detail-grid">
                <div className="ops-detail-block">
                  <span className="muted">Son Run</span>
                  <strong>{formatDateTime(selectedHealth.lastRunAt)}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">Son Başarılı</span>
                  <strong>{formatDateTime(selectedHealth.lastSuccessfulRunAt)}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">Son Başarısız</span>
                  <strong>{formatDateTime(selectedHealth.lastFailedRunAt)}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">Consecutive Failures</span>
                  <strong>{selectedHealth.consecutiveFailureCount}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">24s Success</span>
                  <strong>{selectedHealth.successCount24h}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">24s Failure</span>
                  <strong>{selectedHealth.failureCount24h}</strong>
                </div>
              </div>

              <div className="ops-detail-block">
                <span className="muted">Son Failure Fingerprint</span>
                <code className="ops-code">{selectedHealth.lastFailureFingerprint || '-'}</code>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card mt-4">
        <div className="ops-card-header">
          <h4><i className="bi bi-search"></i> Run Inspector</h4>
          <button className="btn-modern" onClick={() => void inspectRun()} disabled={loadingRun || !runIdInput.trim()}>
            {loadingRun ? 'Yukleniyor...' : 'Run Getir'}
          </button>
        </div>

        <div className="ops-filter-row">
          <input
            className="modern-input"
            value={runIdInput}
            onChange={event => setRunIdInput(event.target.value)}
            placeholder="Scenario run ID girin"
          />
        </div>

        {runError && (
          <div className="readiness-alert warning mt-4">
            <span>{runError}</span>
          </div>
        )}

        {runDetail && (
          <div className="ops-run-layout">
            <div className="ops-run-summary">
              <div className="ops-detail-grid">
                <div className="ops-detail-block">
                  <span className="muted">Run Status</span>
                  <strong>{runStatusLabels[runDetail.status]}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">Triggered By</span>
                  <strong>{runDetail.triggeredBy || '-'}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">Started</span>
                  <strong>{formatDateTime(runDetail.startedAt)}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">Ended</span>
                  <strong>{formatDateTime(runDetail.endedAt)}</strong>
                </div>
              </div>

              <div className="ops-detail-block mt-4">
                <span className="muted">Failure Fingerprint</span>
                <code className="ops-code">{runDetail.failureFingerprint || '-'}</code>
              </div>

              <div className="ops-detail-grid mt-4">
                <div className="ops-detail-block">
                  <span className="muted">Error Code</span>
                  <strong>{runDetail.errorCode || '-'}</strong>
                </div>
                <div className="ops-detail-block">
                  <span className="muted">Error Category</span>
                  <strong>{runDetail.errorCategory || '-'}</strong>
                </div>
              </div>

              {runDetail.errorMessage && (
                <div className="ops-detail-block mt-4">
                  <span className="muted">Error Message</span>
                  <pre className="ops-pre">{runDetail.errorMessage}</pre>
                </div>
              )}
            </div>

            <div className="ops-run-steps">
              <div className="ops-subsection">
                <h5>Flow Runs</h5>
                <div className="ops-flow-list">
                  {flowRuns.map(flow => (
                    <button
                      key={flow.id}
                      className={`ops-flow-row ${selectedFlowRunId === flow.id ? 'selected' : ''}`}
                      type="button"
                      onClick={() => setSelectedFlowRunId(flow.id)}
                    >
                      <div>
                        <strong>#{flow.flowOrderNo} {flow.flowName}</strong>
                        <span>{runStatusLabels[flow.status]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ops-subsection">
                <h5>Step Runs</h5>
                <div className="ops-step-list">
                  {stepRuns.map(step => (
                    <div key={step.id} className="ops-step-card">
                      <div className="ops-step-header">
                        <strong>#{step.stepOrderNo} {step.stepName}</strong>
                        <span className={`ops-badge ${runStatusLabels[step.status].toLowerCase()}`}>{runStatusLabels[step.status]}</span>
                      </div>
                      <div className="ops-step-meta">
                        <span>Attempt: {step.attemptCount ?? 0}</span>
                        <span>Error Code: {step.errorCode || '-'}</span>
                      </div>
                      <div className="ops-step-meta">
                        <span>Category: {step.errorCategory || '-'}</span>
                        <span>Page: {step.pageUrl || '-'}</span>
                      </div>
                      {step.failureFingerprint && <code className="ops-code">{step.failureFingerprint}</code>}
                      {step.errorMessage && <pre className="ops-pre">{step.errorMessage}</pre>}
                    </div>
                  ))}

                  {selectedFlowRunId && stepRuns.length === 0 && (
                    <div className="empty-state">
                      <span>Bu flow için step run bulunamadı.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
