import React from 'react';
import { WizardProvider, useWizardState } from './WizardContext';
import { TreeSidebar } from './components/TreeSidebar';
import { CompanyStep } from './components/steps/CompanyStep';
import { ScenarioStep } from './components/steps/ScenarioStep';
import { FlowStep } from './components/steps/FlowStep';

import { ExecutionStep } from './components/steps/ExecutionStep';
import { HomeView } from './components/steps/HomeView';
import { ExtractionPanel } from './components/steps/ExtractionPanel';
import { ScenarioMapView } from './components/steps/ScenarioMapView';
import { OpsCenterView } from './components/steps/OpsCenterView';

type ThemeMode = 'dark' | 'light';
const themeStorageKey = 'nexsure-theme';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const savedTheme = window.localStorage.getItem(themeStorageKey);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const WizardContent = () => {
  const { activeView, setActiveView } = useWizardState();
  const [theme, setTheme] = React.useState<ThemeMode>(getInitialTheme);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const renderContent = () => {
    switch (activeView) {
      case 'home': return <HomeView />;
      case 'company': return <CompanyStep />;
      case 'scenario': return <ScenarioStep />;
      case 'flow': return <FlowStep />;
      case 'extraction': return <ExtractionPanel />;
      case 'execution': return <ExecutionStep />;
      case 'map': return <ScenarioMapView />;
      case 'ops': return <OpsCenterView />;
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
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
        >
          <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`}></i>
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
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
