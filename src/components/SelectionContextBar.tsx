import React from 'react';
import { useWizardState } from '../WizardContext';

export const SelectionContextBar: React.FC = () => {
  const { 
    selectedCompanyId, companies, 
    selectedScenarioId, scenarios, 
    selectedFlowId, flows 
  } = useWizardState();

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
  const selectedFlow = flows.find(f => f.id === selectedFlowId);

  if (!selectedCompanyId) return null;

  return (
    <div className="context-bar-modern animate-fade-in mb-4">
      <div className="context-item">
        <i className="bi bi-building text-primary"></i>
        <div className="context-info">
          <label>Seçili Firma</label>
          <span>{selectedCompany?.name || 'Yükleniyor...'}</span>
        </div>
      </div>

      {selectedScenarioId && (
        <>
          <div className="context-separator">
            <i className="bi bi-chevron-right"></i>
          </div>
          <div className="context-item">
            <i className="bi bi-file-earmark-play text-success"></i>
            <div className="context-info">
              <label>Senaryo</label>
              <span>{selectedScenario?.name || 'Yükleniyor...'}</span>
            </div>
          </div>
        </>
      )}

      {selectedFlowId && (
        <>
          <div className="context-separator">
            <i className="bi bi-chevron-right"></i>
          </div>
          <div className="context-item">
            <i className="bi bi-diagram-3 text-warning"></i>
            <div className="context-info">
              <label>Akış</label>
              <span>{selectedFlow?.name || 'Yükleniyor...'}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
