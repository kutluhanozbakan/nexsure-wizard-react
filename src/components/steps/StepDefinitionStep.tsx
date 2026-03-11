import React from 'react';
import { useWizardState } from '../../WizardContext';

export const StepDefinitionStep: React.FC = () => {
  const { selectedFlowId, setActiveView } = useWizardState();

  React.useEffect(() => {
    // Redirect to flow view which now contains the steps tab
    if (selectedFlowId) {
      setActiveView('flow');
    }
  }, []);

  return (
    <div className="panel-view animate-fade-in">
      <div className="empty-state">
        <i className="bi bi-arrow-left"></i>
        <span>Adım yönetimi artık Akış detay sayfasında yer almaktadır. Lütfen bir akış seçin.</span>
      </div>
    </div>
  );
};
