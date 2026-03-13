import * as T from './types';

export interface WizardNavigationState {
  activeView: T.ViewType;
  selectedCompanyId: string | null;
  selectedScenarioId: string | null;
  selectedFlowId: string | null;
}

const DEFAULT_STATE: WizardNavigationState = {
  activeView: 'home',
  selectedCompanyId: null,
  selectedScenarioId: null,
  selectedFlowId: null,
};

const NAVIGABLE_VIEWS = new Set<T.ViewType>([
  'home',
  'company',
  'scenario',
  'flow',
  'execution',
  'extraction',
  'map',
]);

const normalizeId = (value: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const sanitizeNavigationState = (
  state: Partial<WizardNavigationState>,
): WizardNavigationState => {
  const activeView = state.activeView && NAVIGABLE_VIEWS.has(state.activeView)
    ? state.activeView
    : DEFAULT_STATE.activeView;

  const selectedCompanyId = normalizeId(state.selectedCompanyId ?? null);
  const selectedScenarioId = selectedCompanyId
    ? normalizeId(state.selectedScenarioId ?? null)
    : null;
  const selectedFlowId = selectedScenarioId
    ? normalizeId(state.selectedFlowId ?? null)
    : null;

  return {
    activeView,
    selectedCompanyId,
    selectedScenarioId,
    selectedFlowId,
  };
};

export const parseNavigationState = (search: string): WizardNavigationState => {
  const params = new URLSearchParams(search);

  return sanitizeNavigationState({
    activeView: (params.get('view') as T.ViewType | null) ?? undefined,
    selectedCompanyId: params.get('companyId'),
    selectedScenarioId: params.get('scenarioId'),
    selectedFlowId: params.get('flowId'),
  });
};

export const buildNavigationSearch = (state: WizardNavigationState): string => {
  const params = new URLSearchParams();

  params.set('view', state.activeView);

  if (state.selectedCompanyId) {
    params.set('companyId', state.selectedCompanyId);
  }

  if (state.selectedScenarioId) {
    params.set('scenarioId', state.selectedScenarioId);
  }

  if (state.selectedFlowId) {
    params.set('flowId', state.selectedFlowId);
  }

  const search = params.toString();
  return search ? `?${search}` : '';
};

export const navigationStatesEqual = (
  left: WizardNavigationState,
  right: WizardNavigationState,
) => (
  left.activeView === right.activeView
  && left.selectedCompanyId === right.selectedCompanyId
  && left.selectedScenarioId === right.selectedScenarioId
  && left.selectedFlowId === right.selectedFlowId
);
