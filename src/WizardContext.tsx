import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import * as T from './types';
import { api } from './api';

interface WizardStateContextType {
  // Navigation
  activeView: T.ViewType;
  setActiveView: (view: T.ViewType) => void;

  // Company
  companies: T.Company[];
  setCompanies: (companies: T.Company[]) => void;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;

  // Scenario
  scenarios: T.Scenario[];
  setScenarios: (scenarios: T.Scenario[]) => void;
  selectedScenarioId: string | null;
  setSelectedScenarioId: (id: string | null) => void;

  // Flow
  flows: T.FlowDefinition[];
  setFlows: (flows: T.FlowDefinition[]) => void;
  selectedFlowId: string | null;
  setSelectedFlowId: (id: string | null) => void;

  // HTML & Steps
  htmlCandidates: T.HtmlCandidate[];
  setHtmlCandidates: (c: T.HtmlCandidate[]) => void;
  steps: T.StepDefinition[];
  setSteps: (steps: T.StepDefinition[]) => void;

  // Extraction
  extraction: T.ExtractionDefinition | null;
  setExtraction: (e: T.ExtractionDefinition | null) => void;

  // Tree data: scenarioId -> flows, flowId -> steps count, flowId -> hasHtml
  scenarioFlowsMap: Record<string, T.FlowDefinition[]>;
  flowStepCountMap: Record<string, number>;

  // Actions
  selectCompany: (id: string) => void;
  selectScenario: (id: string, view?: T.ViewType) => void;
  selectFlow: (id: string) => void;
  navigateToExecution: () => void;
  refreshFlowsForScenario: (scenarioId: string) => Promise<void>;
  refreshStepsForFlow: (flowId: string) => Promise<void>;
  loadCompanies: () => Promise<void>;
  refreshExtraction: (scenarioId: string) => Promise<void>;

  // Expanded state
  expandedCompanies: Set<string>;
  toggleCompanyExpand: (id: string) => void;
  expandedScenarios: Set<string>;
  toggleScenarioExpand: (id: string) => void;
}

const WizardContext = createContext<WizardStateContextType | undefined>(undefined);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  // Navigation
  const [activeView, setActiveView] = useState<T.ViewType>('home');

  // Data
  const [companies, setCompanies] = useState<T.Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<T.Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [flows, setFlows] = useState<T.FlowDefinition[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [htmlCandidates, setHtmlCandidates] = useState<T.HtmlCandidate[]>([]);
  const [steps, setSteps] = useState<T.StepDefinition[]>([]);
  const [extraction, setExtraction] = useState<T.ExtractionDefinition | null>(null);

  // Tree metadata
  const [scenarioFlowsMap, setScenarioFlowsMap] = useState<Record<string, T.FlowDefinition[]>>({});
  const [flowStepCountMap, setFlowStepCountMap] = useState<Record<string, number>>({});

  // Expand states
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  const toggleCompanyExpand = useCallback((id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleScenarioExpand = useCallback((id: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      const data = await api.listCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  }, []);

  const selectCompany = useCallback((id: string) => {
    setSelectedCompanyId(id);
    setSelectedScenarioId(null);
    setSelectedFlowId(null);
    setScenarios([]); // Clear stale scenarios
    setFlows([]);    // Clear stale flows
    setSteps([]);    // Clear stale steps
    setHtmlCandidates([]); // Clear stale candidates
    setActiveView('scenario'); // Navigate to scenarios panel for this company

    // Load scenarios for the company immediately
    api.listScenariosByCompany(id).then(setScenarios).catch(console.error);
  }, []);

  const selectScenario = useCallback((id: string, targetView: T.ViewType = 'flow') => {
    setSelectedScenarioId(id);
    setSelectedFlowId(null);
    setFlows([]);    // Clear stale flows
    setSteps([]);    // Clear stale steps
    setHtmlCandidates([]); // Clear stale candidates
    setActiveView(targetView);

    // Expand in tree & load flows
    setExpandedScenarios(prev => new Set(prev).add(id));
    api.listFlowsByScenario(id).then(res => {
      const sorted = res.sort((a, b) => a.orderNo - b.orderNo);
      setFlows(sorted);
      setScenarioFlowsMap(prev => ({ ...prev, [id]: sorted }));
    }).catch(console.error);

    // Load extraction
    api.getExtraction(id).then(setExtraction).catch(() => setExtraction(null));
  }, []);

  const selectFlow = useCallback((id: string) => {
    setSelectedFlowId(id);
    setSteps([]);
    setHtmlCandidates([]);
    setActiveView('flow');

    // Load steps and html candidates for this flow
    api.listStepsByFlow(id).then(res => {
      setSteps(res.sort((a, b) => a.orderNo - b.orderNo));
      setFlowStepCountMap(prev => ({ ...prev, [id]: res.length }));
    }).catch(console.error);
    api.listHtmlCandidatesByFlow(id).then(res => {
      setHtmlCandidates(res.sort((a, b) => a.candidateOrder - b.candidateOrder));
    }).catch(console.error);
  }, []);

  const navigateToExecution = useCallback(() => {
    setActiveView('execution');
  }, []);

  const refreshFlowsForScenario = useCallback(async (scenarioId: string) => {
    try {
      const res = await api.listFlowsByScenario(scenarioId);
      const sorted = res.sort((a, b) => a.orderNo - b.orderNo);
      setFlows(sorted);
      setScenarioFlowsMap(prev => ({ ...prev, [scenarioId]: sorted }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const refreshStepsForFlow = useCallback(async (flowId: string) => {
    try {
      const res = await api.listStepsByFlow(flowId);
      setSteps(res.sort((a, b) => a.orderNo - b.orderNo));
      setFlowStepCountMap(prev => ({ ...prev, [flowId]: res.length }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const refreshExtraction = useCallback(async (scenarioId: string) => {
    try {
      const e = await api.getExtraction(scenarioId);
      setExtraction(e);
    } catch (err) {
      console.error(err);
      setExtraction(null);
    }
  }, []);

  return (
    <WizardContext.Provider value={{
      activeView, setActiveView,
      companies, setCompanies, selectedCompanyId, setSelectedCompanyId,
      scenarios, setScenarios, selectedScenarioId, setSelectedScenarioId,
      flows, setFlows, selectedFlowId, setSelectedFlowId,
      htmlCandidates, setHtmlCandidates,
      steps, setSteps,
      extraction, setExtraction,
      scenarioFlowsMap, flowStepCountMap,
      selectCompany, selectScenario, selectFlow, navigateToExecution,
      refreshFlowsForScenario, refreshStepsForFlow, loadCompanies, refreshExtraction,
      expandedCompanies, toggleCompanyExpand,
      expandedScenarios, toggleScenarioExpand,
    }}>
      {children}
    </WizardContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWizardState = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizardState must be used within a WizardProvider');
  }
  return context;
};
