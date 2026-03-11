import { WizardProvider, useWizardState } from './WizardContext';
import { WizardStepper } from './components/WizardStepper';
import { CompanyStep } from './components/steps/CompanyStep';
import { ScenarioStep } from './components/steps/ScenarioStep';
import { FlowStep } from './components/steps/FlowStep';
import { HtmlAnalysisStep } from './components/steps/HtmlAnalysisStep';
import { StepDefinitionStep } from './components/steps/StepDefinitionStep';
import { FinalOutputStep } from './components/steps/FinalOutputStep';
import { ExecutionStep } from './components/steps/ExecutionStep';
import { SelectionContextBar } from './components/SelectionContextBar';

const stepsTitles = [
  "Firma",
  "Senaryo",
  "Akış",
  "HTML Analiz",
  "Adımlar",
  "Çıktı",
  "Çalıştır"
];

const WizardContent = () => {
  const { currentStep, setCurrentStep } = useWizardState();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return <CompanyStep />;
      case 1: return <ScenarioStep />;
      case 2: return <FlowStep />;
      case 3: return <HtmlAnalysisStep />;
      case 4: return <StepDefinitionStep />;
      case 5: return <FinalOutputStep />;
      case 6: return <ExecutionStep />;
      default: return <CompanyStep />;
    }
  };

  return (
    <div className="wizard-modern-layout">
      {/* Header */}
      <header className="wizard-header text-white">
        <div className="brand">
          <div className="logo-box">
            <i className="bi bi-robot"></i>
          </div>
          <div>
            <h1>Nexsure Oto Wizard</h1>
            <div className="tagline">Next-Gen RPA Developer Client</div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="glass-main animate-fade-in">
        <WizardStepper 
          steps={stepsTitles} 
          currentStep={currentStep} 
          onStepClicked={setCurrentStep} 
        />
        <SelectionContextBar />
        <main className="wizard-main">
          {renderCurrentStep()}
        </main>

        <footer className="wizard-footer-modern">
          <button 
            className="btn-outline-modern" 
            disabled={currentStep === 0} 
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            <i className="bi bi-arrow-left"></i> Geri
          </button>
          
          <button 
            className="btn-modern" 
            disabled={currentStep === stepsTitles.length - 1} 
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            İleri <i className="bi bi-arrow-right"></i>
          </button>
        </footer>
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
