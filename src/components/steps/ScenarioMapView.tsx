import React from 'react';
import { api } from '../../api';
import * as T from '../../types';
import { useWizardState } from '../../WizardContext';

interface ScenarioJourney {
  scenario: T.Scenario;
  flows: T.FlowDefinition[];
  extraction: T.ExtractionDefinition | null;
}

interface CompanyJourney {
  company: T.Company;
  scenarios: ScenarioJourney[];
}

export const ScenarioMapView: React.FC = () => {
  const {
    companies,
    loadCompanies,
    selectCompany,
    selectScenario,
    selectFlow,
    navigateToExecution,
  } = useWizardState();

  const [journeys, setJourneys] = React.useState<CompanyJourney[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeCompanyId, setActiveCompanyId] = React.useState<string>('all');

  React.useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  React.useEffect(() => {
    let cancelled = false;

    const loadJourneyMap = async () => {
      if (companies.length === 0) {
        setJourneys([]);
        return;
      }

      setLoading(true);
      try {
        const nextJourneys = await Promise.all(
          companies.map(async company => {
            const scenarios = await api.listScenariosByCompany(company.id);
            const scenarioJourneys = await Promise.all(
              scenarios.map(async scenario => {
                const [flows, extraction] = await Promise.all([
                  api.listFlowsByScenario(scenario.id),
                  api.getExtraction(scenario.id),
                ]);

                return {
                  scenario,
                  flows: flows.sort((left, right) => left.orderNo - right.orderNo),
                  extraction,
                };
              }),
            );

            return {
              company,
              scenarios: scenarioJourneys,
            };
          }),
        );

        if (!cancelled) {
          setJourneys(nextJourneys);
        }
      } catch (error) {
        console.error('Harita verisi yuklenemedi:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadJourneyMap();

    return () => {
      cancelled = true;
    };
  }, [companies]);

  const filteredJourneys = React.useMemo(() => {
    if (activeCompanyId === 'all') {
      return journeys;
    }

    return journeys.filter(journey => journey.company.id === activeCompanyId);
  }, [activeCompanyId, journeys]);

  const totalScenarioCount = journeys.reduce((count, journey) => count + journey.scenarios.length, 0);
  const totalFlowCount = journeys.reduce(
    (count, journey) => count + journey.scenarios.reduce((scenarioCount, scenario) => scenarioCount + scenario.flows.length, 0),
    0,
  );

  const openScenario = (companyId: string, scenarioId: string) => {
    selectCompany(companyId);
    selectScenario(scenarioId);
  };

  const openFlow = (companyId: string, scenarioId: string, flowId: string) => {
    selectCompany(companyId);
    selectScenario(scenarioId, 'flow');
    selectFlow(flowId);
  };

  const openExtraction = (companyId: string, scenarioId: string) => {
    selectCompany(companyId);
    selectScenario(scenarioId, 'extraction');
  };

  const openExecution = (companyId: string, scenarioId: string) => {
    selectCompany(companyId);
    selectScenario(scenarioId, 'flow');
    navigateToExecution();
  };

  return (
    <div className="panel-view animate-fade-in">
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-signpost-split panel-title-icon"></i>
          <div>
            <h3>Senaryo Haritasi</h3>
            <p className="muted">Firma, senaryo ve akislari yatay bir yol olarak gorun. Bu ekran gorsel takip icin vardir; mevcut yonetim akisini degistirmez.</p>
          </div>
        </div>
      </div>

      <div className="map-toolbar glass-card">
        <div className="map-toolbar-summary">
          <div className="map-summary-pill">
            <span>{journeys.length}</span>
            <label>Firma</label>
          </div>
          <div className="map-summary-pill">
            <span>{totalScenarioCount}</span>
            <label>Senaryo</label>
          </div>
          <div className="map-summary-pill">
            <span>{totalFlowCount}</span>
            <label>Akis</label>
          </div>
        </div>

        <div className="map-filter-row">
          <button
            type="button"
            className={`map-filter-chip ${activeCompanyId === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCompanyId('all')}
          >
            Tum Firmalar
          </button>
          {journeys.map(journey => (
            <button
              key={journey.company.id}
              type="button"
              className={`map-filter-chip ${activeCompanyId === journey.company.id ? 'active' : ''}`}
              onClick={() => setActiveCompanyId(journey.company.id)}
            >
              {journey.company.name}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="glass-card">
          <div className="running-indicator">
            <span className="pulse-dot"></span>
            <span>Harita verisi hazirlaniyor...</span>
          </div>
        </div>
      )}

      {!loading && filteredJourneys.length === 0 && (
        <div className="empty-state-panel">
          <i className="bi bi-diagram-3"></i>
          <p>Haritada gosterilecek firma veya senaryo bulunmuyor.</p>
        </div>
      )}

      <div className="map-company-stack">
        {filteredJourneys.map(journey => (
          <section key={journey.company.id} className="map-company-section glass-card">
            <div className="map-company-header">
              <div>
                <h4><i className="bi bi-building"></i> {journey.company.name}</h4>
                <p className="muted">{journey.company.code} {journey.company.baseUrl ? `• ${journey.company.baseUrl}` : ''}</p>
              </div>
              <button type="button" className="btn-outline-modern" onClick={() => selectCompany(journey.company.id)}>
                <i className="bi bi-box-arrow-up-right"></i>
                Firmayi Ac
              </button>
            </div>

            {journey.scenarios.length === 0 && (
              <div className="empty-state">
                <i className="bi bi-journal-x"></i>
                <span>Bu firma icin senaryo bulunmuyor.</span>
              </div>
            )}

            <div className="map-lane-stack">
              {journey.scenarios.map(({ scenario, flows, extraction }) => {
                const extractionReady = !!extraction && extraction.fields.length > 0;

                return (
                  <div key={scenario.id} className="map-lane">
                    <div className="map-lane-title">
                      <span className={`status-pill ${scenario.statusDraftOrPublished === T.StatusDraftOrPublished.Published ? 'published' : 'draft'}`}>
                        {scenario.statusDraftOrPublished === T.StatusDraftOrPublished.Published ? 'YAYINDA' : 'TASLAK'}
                      </span>
                      <strong>{scenario.name}</strong>
                      <span className="muted">{scenario.description || 'Aciklama yok'}</span>
                    </div>

                    <div className="map-track">
                      <button
                        type="button"
                        className="map-node company"
                        onClick={() => selectCompany(journey.company.id)}
                      >
                        <span className="map-node-kicker">Firma</span>
                        <strong>{journey.company.name}</strong>
                        <span className="map-node-meta">{journey.company.code}</span>
                      </button>

                      <div className="map-connector"><i className="bi bi-arrow-right"></i></div>

                      <button
                        type="button"
                        className="map-node scenario"
                        onClick={() => openScenario(journey.company.id, scenario.id)}
                      >
                        <span className="map-node-kicker">Senaryo</span>
                        <strong>{scenario.name}</strong>
                        <span className="map-node-meta">{flows.length} akis</span>
                      </button>

                      {flows.map(flow => (
                        <React.Fragment key={flow.id}>
                          <div className="map-connector">
                            <i className="bi bi-arrow-right"></i>
                            <span>{flow.usePreviousFlowContext ? 'Context' : 'URL'}</span>
                          </div>

                          <button
                            type="button"
                            className="map-node flow"
                            onClick={() => openFlow(journey.company.id, scenario.id, flow.id)}
                          >
                            <span className="map-node-kicker">Flow #{flow.orderNo}</span>
                            <strong>{flow.name}</strong>
                            <div className="map-node-badges">
                              <span className={`mini-badge ${flow.startUrl ? 'info' : 'warning'}`}>
                                {flow.startUrl ? 'Start URL' : 'Prev Context'}
                              </span>
                              <span className={`mini-badge ${flow.htmlSnippet ? 'success' : 'danger'}`}>
                                {flow.htmlSnippet ? 'HTML Hazir' : 'HTML Eksik'}
                              </span>
                            </div>
                          </button>
                        </React.Fragment>
                      ))}

                      <div className="map-connector">
                        <i className="bi bi-arrow-right"></i>
                        <span>Sonuc</span>
                      </div>

                      <button
                        type="button"
                        className={`map-node extraction ${extractionReady ? 'ready' : 'missing'}`}
                        onClick={() => openExtraction(journey.company.id, scenario.id)}
                      >
                        <span className="map-node-kicker">Extraction</span>
                        <strong>{extractionReady ? 'Mapping Hazir' : 'Mapping Bekliyor'}</strong>
                        <span className="map-node-meta">
                          {extractionReady ? `${extraction?.fields.length ?? 0} alan secildi` : 'Tanim gerekli'}
                        </span>
                      </button>

                      <div className="map-connector">
                        <i className="bi bi-arrow-right"></i>
                      </div>

                      <button
                        type="button"
                        className="map-node execution"
                        onClick={() => openExecution(journey.company.id, scenario.id)}
                      >
                        <span className="map-node-kicker">Calistir</span>
                        <strong>Run Hazirligi</strong>
                        <span className="map-node-meta">Durumu kontrol et</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
