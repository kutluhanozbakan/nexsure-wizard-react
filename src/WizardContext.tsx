import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import * as T from './types';

interface WizardStateContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  companies: T.Company[];
  setCompanies: (companies: T.Company[]) => void;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  scenarios: T.Scenario[];
  setScenarios: (scenarios: T.Scenario[]) => void;
  selectedScenarioId: string | null;
  setSelectedScenarioId: (id: string | null) => void;
  flows: T.FlowDefinition[];
  setFlows: (flows: T.FlowDefinition[]) => void;
  selectedFlowId: string | null;
  setSelectedFlowId: (id: string | null) => void;
  htmlCandidates: T.HtmlCandidate[];
  setHtmlCandidates: (c: T.HtmlCandidate[]) => void;
  steps: T.StepDefinition[];
  setSteps: (steps: T.StepDefinition[]) => void;
  extraction: T.ExtractionDefinition | null;
  setExtraction: (e: T.ExtractionDefinition | null) => void;
  resetDownstreamFromCompany: () => void;
  resetDownstreamFromScenario: () => void;
  resetDownstreamFromFlow: () => void;
}

const WizardContext = createContext<WizardStateContextType | undefined>(undefined);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [companies, setCompanies] = useState<T.Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const [scenarios, setScenarios] = useState<T.Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  
  const [flows, setFlows] = useState<T.FlowDefinition[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  
  const [htmlCandidates, setHtmlCandidates] = useState<T.HtmlCandidate[]>([]);
  const [steps, setSteps] = useState<T.StepDefinition[]>([]);
  const [extraction, setExtraction] = useState<T.ExtractionDefinition | null>(null);

  const resetDownstreamFromCompany = () => {
    setSelectedScenarioId(null);
    setScenarios([]);
    resetDownstreamFromScenario();
  };

  const resetDownstreamFromScenario = () => {
    setSelectedFlowId(null);
    setFlows([]);
    setExtraction(null);
    resetDownstreamFromFlow();
  };

  const resetDownstreamFromFlow = () => {
    setSteps([]);
    setHtmlCandidates([]);
  };

  return (
    <WizardContext.Provider value={{
      currentStep, setCurrentStep,
      companies, setCompanies, selectedCompanyId, setSelectedCompanyId,
      scenarios, setScenarios, selectedScenarioId, setSelectedScenarioId,
      flows, setFlows, selectedFlowId, setSelectedFlowId,
      htmlCandidates, setHtmlCandidates,
      steps, setSteps,
      extraction, setExtraction,
      resetDownstreamFromCompany, resetDownstreamFromScenario, resetDownstreamFromFlow
    }}>
      {children}
    </WizardContext.Provider>
  );
};

export const useWizardState = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizardState must be used within a WizardProvider');
  }
  return context;
};
