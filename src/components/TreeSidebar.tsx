import React, { useEffect } from 'react';
import { useWizardState } from '../WizardContext';
import { api } from '../api';

export const TreeSidebar: React.FC = () => {
  const {
    companies, scenarios, flows, loadCompanies,
    selectedCompanyId, selectedScenarioId, selectedFlowId,
    selectCompany, selectScenario, selectFlow, navigateToExecution,
    expandedCompanies, toggleCompanyExpand,
    expandedScenarios, toggleScenarioExpand,
    scenarioFlowsMap, flowStepCountMap,
    activeView, setActiveView,
  } = useWizardState();
  const [companyScenariosMap, setCompanyScenariosMap] = React.useState<Record<string, typeof scenarios>>({});

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Load scenarios when company is expanded
  const handleCompanyExpand = (companyId: string) => {
    toggleCompanyExpand(companyId);
    if (!expandedCompanies.has(companyId)) {
      if (!companyScenariosMap[companyId]) {
        api.listScenariosByCompany(companyId)
          .then(result => {
            setCompanyScenariosMap(prev => ({ ...prev, [companyId]: result }));
          })
          .catch(console.error);
      }
      selectCompany(companyId);
    }
  };

  // Load flows when scenario is expanded
  const handleScenarioExpand = (scenarioId: string) => {
    toggleScenarioExpand(scenarioId);
    if (!expandedScenarios.has(scenarioId)) {
      selectScenario(scenarioId);
    }
  };

  const companyScenariosFor = (companyId: string) => {
    if (companyScenariosMap[companyId]) {
      return companyScenariosMap[companyId];
    }

    if (selectedCompanyId === companyId) {
      return scenarios;
    }

    return [];
  };

  const scenarioFlowsFor = (scenarioId: string) => {
    if (scenarioFlowsMap[scenarioId]) return scenarioFlowsMap[scenarioId];
    if (selectedScenarioId === scenarioId) return flows;
    return [];
  };

  return (
    <aside className="tree-sidebar">
      <div className="tree-sidebar-header">
        <h3><i className="bi bi-diagram-3"></i> Proje Ağacı</h3>
        <button
          className="tree-add-btn"
          onClick={() => setActiveView('company')}
          title="Yeni Firma Ekle"
        >
          <i className="bi bi-plus-lg"></i>
        </button>
      </div>

      <div className="tree-content">
        {/* Home Link */}
        <div
          className={`tree-node ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => setActiveView('home')}
        >
          <i className="bi bi-house tree-icon home-icon"></i>
          <span className="tree-label">Ana Sayfa</span>
        </div>

        <div
          className={`tree-node ${activeView === 'map' ? 'active' : ''}`}
          onClick={() => setActiveView('map')}
        >
          <i className="bi bi-signpost-split tree-icon map-icon"></i>
          <span className="tree-label">Senaryo Haritasi</span>
        </div>

        <div
          className={`tree-node ${activeView === 'ops' ? 'active' : ''}`}
          onClick={() => setActiveView('ops')}
        >
          <i className="bi bi-activity tree-icon ops-icon"></i>
          <span className="tree-label">Operasyon Merkezi</span>
        </div>

        <div className="tree-divider"></div>

        {companies.length === 0 && (
          <div className="tree-empty">
            <i className="bi bi-building"></i>
            <div>
              <span>Henüz bir firma yok.</span>
              <button
                className="tree-inline-link"
                onClick={() => setActiveView('company')}
              >
                İlk firmanızı ekleyin
              </button>
            </div>
          </div>
        )}

        {companies.map(company => (
          <div key={company.id} className="tree-node-group">
            {/* Company Node */}
            <div
              className={`tree-node company-node ${selectedCompanyId === company.id ? 'active' : ''}`}
              onClick={() => {
                selectCompany(company.id);
              }}
            >
              <button
                className="tree-expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompanyExpand(company.id);
                }}
              >
                <i className={`bi bi-chevron-${expandedCompanies.has(company.id) ? 'down' : 'right'}`}></i>
              </button>
              <i className="bi bi-building tree-icon company-icon"></i>
              <span className="tree-label">{company.name}</span>
              <span className="tree-badge">{company.code}</span>
            </div>

            {/* Scenarios */}
            {expandedCompanies.has(company.id) && (
              <div className="tree-children">
                {companyScenariosFor(company.id).map(scenario => (
                  <div key={scenario.id} className="tree-node-group">
                    <div
                      className={`tree-node scenario-node ${selectedScenarioId === scenario.id ? 'active' : ''}`}
                      onClick={() => selectScenario(scenario.id)}
                    >
                      <button
                        className="tree-expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScenarioExpand(scenario.id);
                        }}
                      >
                        <i className={`bi bi-chevron-${expandedScenarios.has(scenario.id) ? 'down' : 'right'}`}></i>
                      </button>
                      <i className="bi bi-journal-text tree-icon scenario-icon"></i>
                      <span className="tree-label">{scenario.name}</span>
                      <span className={`tree-status ${scenario.statusDraftOrPublished === 0 ? 'draft' : 'published'}`}>
                        {scenario.statusDraftOrPublished === 0 ? '◯' : '●'}
                      </span>
                    </div>

                    {/* Scenario Sub-items */}
                    {expandedScenarios.has(scenario.id) && (
                      <div className="tree-children">
                        {/* New: Extraction Node */}
                        <div
                          className={`tree-node extraction-node ${activeView === 'extraction' && selectedScenarioId === scenario.id ? 'active' : ''}`}
                          onClick={() => {
                            selectScenario(scenario.id, 'extraction');
                          }}
                        >
                          <i className="bi bi-arrow-return-right tree-connector"></i>
                          <i className="bi bi-box-arrow-in-right tree-icon extraction-icon"></i>
                          <span className="tree-label">Sonuç Çıkarma</span>
                        </div>

                        {/* Flows */}
                        {scenarioFlowsFor(scenario.id).map(flow => (
                          <div
                            key={flow.id}
                            className={`tree-node flow-node ${selectedFlowId === flow.id ? 'active' : ''}`}
                            onClick={() => selectFlow(flow.id)}
                          >
                            <i className="bi bi-arrow-return-right tree-connector"></i>
                            <i className="bi bi-shuffle tree-icon flow-icon"></i>
                            <span className="tree-label">#{flow.orderNo} {flow.name}</span>
                            <div className="tree-flow-badges">
                              <span className={`tree-mini-badge ${flow.htmlSnippet ? 'has-html' : 'no-html'}`} title={flow.htmlSnippet ? 'HTML Yüklü' : 'HTML Yüklenmedi'}>
                                {flow.htmlSnippet ? '✓' : '✗'} HTML
                              </span>
                              {flowStepCountMap[flow.id] !== undefined && (
                                <span className="tree-mini-badge step-count" title="Adım sayısı">
                                  {flowStepCountMap[flow.id]} adım
                                </span>
                              )}
                            </div>
                          </div>
                        ))}

                        {scenarioFlowsFor(scenario.id).length === 0 && (
                          <div className="tree-empty-child">Akış yok</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {companyScenariosFor(company.id).length === 0 && (
                  <div className="tree-empty-child">Senaryo yok</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Execution Button */}
      <div className="tree-sidebar-footer">
        <button
          className={`tree-execute-btn ${activeView === 'execution' ? 'active' : ''}`}
          onClick={navigateToExecution}
        >
          <i className="bi bi-play-circle"></i>
          <span>Çalıştır</span>
        </button>
      </div>
    </aside>
  );
};
