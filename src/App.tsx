import { WizardProvider, useWizardState } from './WizardContext';
import { TreeSidebar } from './components/TreeSidebar';
import { CompanyStep } from './components/steps/CompanyStep';
import { ScenarioStep } from './components/steps/ScenarioStep';
import { FlowStep } from './components/steps/FlowStep';

import { ExecutionStep } from './components/steps/ExecutionStep';
import { HomeView } from './components/steps/HomeView';

const WizardContent = () => {
  const { activeView, setActiveView } = useWizardState();

  const renderContent = () => {
    switch (activeView) {
      case 'home': return <HomeView />;
      case 'company': return <CompanyStep />;
      case 'scenario': return <ScenarioStep />;
      case 'flow': return <FlowStep />;

      case 'execution': return <ExecutionStep />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="brand clickable" onClick={() => setActiveView('home')} title="Ana Sayfaya Dön">
          <div className="logo-box">
            <i className="bi bi-robot"></i>
          </div>
          <div>
            <h1>Nexsure Oto</h1>
            <div className="tagline">Next-Gen RPA Automation Platform</div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="app-body">
        <TreeSidebar />
        <main className="app-main">
          <div className="content-panel animate-fade-in" key={activeView}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
