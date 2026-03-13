import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import * as T from './types';
import { api } from './api';
import {
  buildNavigationSearch,
  navigationStatesEqual,
  parseNavigationState,
  sanitizeNavigationState,
  type WizardNavigationState,
} from './navigationState';

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
  const initialNavigation = parseNavigationState(window.location.search);

  // Navigation
  const [activeView, setActiveViewState] = useState<T.ViewType>(initialNavigation.activeView);

  // Data
  const [companies, setCompanies] = useState<T.Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(initialNavigation.selectedCompanyId);
  const [scenarios, setScenarios] = useState<T.Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioIdState] = useState<string | null>(initialNavigation.selectedScenarioId);
  const [flows, setFlows] = useState<T.FlowDefinition[]>([]);
  const [selectedFlowId, setSelectedFlowIdState] = useState<string | null>(initialNavigation.selectedFlowId);
  const [htmlCandidates, setHtmlCandidates] = useState<T.HtmlCandidate[]>([]);
  const [steps, setSteps] = useState<T.StepDefinition[]>([]);
  const [extraction, setExtraction] = useState<T.ExtractionDefinition | null>(null);

  // Tree metadata
  const [scenarioFlowsMap, setScenarioFlowsMap] = useState<Record<string, T.FlowDefinition[]>>({});
  const [flowStepCountMap, setFlowStepCountMap] = useState<Record<string, number>>({});

  // Expand states
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(
    () => initialNavigation.selectedCompanyId ? new Set([initialNavigation.selectedCompanyId]) : new Set(),
  );
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(
    () => initialNavigation.selectedScenarioId ? new Set([initialNavigation.selectedScenarioId]) : new Set(),
  );
  const historyModeRef = useRef<'push' | 'replace' | 'skip'>('replace');

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

  const currentNavigationState = useCallback((): WizardNavigationState => (
    sanitizeNavigationState({
      activeView,
      selectedCompanyId,
      selectedScenarioId,
      selectedFlowId,
    })
  ), [activeView, selectedCompanyId, selectedScenarioId, selectedFlowId]);

  const applyNavigationState = useCallback((nextState: WizardNavigationState) => {
    setActiveViewState(nextState.activeView);
    setSelectedCompanyIdState(nextState.selectedCompanyId);
    setSelectedScenarioIdState(nextState.selectedScenarioId);
    setSelectedFlowIdState(nextState.selectedFlowId);
    setExpandedCompanies(prev => {
      if (!nextState.selectedCompanyId || prev.has(nextState.selectedCompanyId)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(nextState.selectedCompanyId);
      return next;
    });
    setExpandedScenarios(prev => {
      if (!nextState.selectedScenarioId || prev.has(nextState.selectedScenarioId)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(nextState.selectedScenarioId);
      return next;
    });
  }, []);

  const setActiveView = useCallback((view: T.ViewType) => {
    historyModeRef.current = 'push';
    setActiveViewState(view);
  }, []);

  const setSelectedCompanyId = useCallback((id: string | null) => {
    historyModeRef.current = 'push';
    setSelectedCompanyIdState(id);
    if (id) {
      setExpandedCompanies(prev => prev.has(id) ? prev : new Set(prev).add(id));
    }

    if (id !== selectedCompanyId) {
      setSelectedScenarioIdState(null);
      setSelectedFlowIdState(null);
      setFlows([]);
      setSteps([]);
      setHtmlCandidates([]);
      setExtraction(null);
    }
  }, [selectedCompanyId]);

  const setSelectedScenarioId = useCallback((id: string | null) => {
    historyModeRef.current = 'push';
    setSelectedScenarioIdState(id);
    if (id) {
      setExpandedScenarios(prev => prev.has(id) ? prev : new Set(prev).add(id));
    }

    if (id !== selectedScenarioId) {
      setSelectedFlowIdState(null);
      setFlows([]);
      setSteps([]);
      setHtmlCandidates([]);
      if (!id) {
        setExtraction(null);
      }
    }
  }, [selectedScenarioId]);

  const setSelectedFlowId = useCallback((id: string | null) => {
    historyModeRef.current = 'push';
    setSelectedFlowIdState(id);

    if (id !== selectedFlowId) {
      setSteps([]);
      setHtmlCandidates([]);
    }
  }, [selectedFlowId]);

  useEffect(() => {
    const syncFromHistory = () => {
      const nextState = parseNavigationState(window.location.search);
      if (navigationStatesEqual(nextState, currentNavigationState())) {
        return;
      }

      historyModeRef.current = 'skip';
      applyNavigationState(nextState);
    };

    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, [applyNavigationState, currentNavigationState]);

  useEffect(() => {
    const nextState = currentNavigationState();
    const nextSearch = buildNavigationSearch(nextState);
    const currentSearch = window.location.search || '';

    if (currentSearch === nextSearch) {
      historyModeRef.current = 'replace';
      return;
    }

    if (historyModeRef.current === 'skip') {
      historyModeRef.current = 'replace';
      return;
    }

    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    if (historyModeRef.current === 'push') {
      window.history.pushState(null, '', nextUrl);
    } else {
      window.history.replaceState(null, '', nextUrl);
    }

    historyModeRef.current = 'replace';
  }, [currentNavigationState]);

  const loadCompanies = useCallback(async () => {
    try {
      const data = await api.listCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  }, []);

  const selectCompany = useCallback((id: string) => {
    historyModeRef.current = 'push';
    setSelectedCompanyIdState(id);
    setSelectedScenarioIdState(null);
    setSelectedFlowIdState(null);
    setScenarios([]); // Clear stale scenarios
    setFlows([]);    // Clear stale flows
    setSteps([]);    // Clear stale steps
    setHtmlCandidates([]); // Clear stale candidates
    setActiveViewState('scenario'); // Navigate to scenarios panel for this company

    // Load scenarios for the company immediately
    api.listScenariosByCompany(id).then(setScenarios).catch(console.error);
  }, []);

  const selectScenario = useCallback((id: string, targetView: T.ViewType = 'flow') => {
    historyModeRef.current = 'push';
    setSelectedScenarioIdState(id);
    setSelectedFlowIdState(null);
    setFlows([]);    // Clear stale flows
    setSteps([]);    // Clear stale steps
    setHtmlCandidates([]); // Clear stale candidates
    setActiveViewState(targetView);

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
    historyModeRef.current = 'push';
    setSelectedFlowIdState(id || null);
    setSteps([]);
    setHtmlCandidates([]);
    setActiveViewState('flow');

    // Load steps and html candidates for this flow
    if (!id) {
      return;
    }

    api.listStepsByFlow(id).then(res => {
      setSteps(res.sort((a, b) => a.orderNo - b.orderNo));
      setFlowStepCountMap(prev => ({ ...prev, [id]: res.length }));
    }).catch(console.error);
    api.listHtmlCandidatesByFlow(id).then(res => {
      setHtmlCandidates(res.sort((a, b) => a.candidateOrder - b.candidateOrder));
    }).catch(console.error);
  }, []);

  const navigateToExecution = useCallback(() => {
    historyModeRef.current = 'push';
    setActiveViewState('execution');
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
