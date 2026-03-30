import axios from 'axios';
import * as T from './types';

const API_BASE = 'http://localhost:5177';

export const api = {
    // Companies
    listCompanies: () => axios.get<T.Company[]>(`${API_BASE}/companies`).then(res => res.data),
    createCompany: (data: T.CompanyCreateRequest) => axios.post<T.Company>(`${API_BASE}/companies`, data).then(res => res.data),
    updateCompany: (id: string, data: T.CompanyUpdateRequest) => axios.put<T.Company>(`${API_BASE}/companies/${id}`, data).then(res => res.data),

    // Scenarios
    listScenariosByCompany: (companyId: string) => axios.get<T.Scenario[]>(`${API_BASE}/scenarios/by-company/${companyId}`).then(res => res.data),
    createScenario: (data: T.ScenarioCreateRequest) => axios.post<T.Scenario>(`${API_BASE}/scenarios`, data).then(res => res.data),
    updateScenario: (id: string, data: T.ScenarioUpdateRequest) => axios.put<T.Scenario>(`${API_BASE}/scenarios/${id}`, data).then(res => res.data),
    deleteScenario: (id: string) => axios.delete(`${API_BASE}/scenarios/${id}`),

    // Flows
    listFlowsByScenario: (scenarioId: string) => axios.get<T.FlowDefinition[]>(`${API_BASE}/flows/by-scenario/${scenarioId}`).then(res => res.data),
    createFlow: (data: T.FlowCreateRequest) => axios.post<T.FlowDefinition>(`${API_BASE}/flows`, data).then(res => res.data),
    updateFlow: (id: string, data: T.FlowUpdateRequest) => axios.put<T.FlowDefinition>(`${API_BASE}/flows/${id}`, data).then(res => res.data),
    deleteFlow: (id: string) => axios.delete(`${API_BASE}/flows/${id}`),

    // Steps
    listStepsByFlow: (flowId: string) => axios.get<T.StepDefinition[]>(`${API_BASE}/steps/by-flow/${flowId}`).then(res => res.data),
    createStep: (data: T.StepCreateRequest) => axios.post<T.StepDefinition>(`${API_BASE}/steps`, data).then(res => res.data),
    updateStep: (id: string, data: T.StepUpdateRequest) => axios.put(`${API_BASE}/steps/${id}`, data),
    deleteStep: (id: string) => axios.delete(`${API_BASE}/steps/${id}`),

    // HTML Analysis
    analyzeHtml: (flowId: string, data: T.AnalyzeHtmlRequest) => axios.post<T.HtmlCandidate[]>(`${API_BASE}/flows/${flowId}/html-analysis`, data).then(res => res.data),
    listHtmlCandidatesByFlow: (flowId: string) => axios.get<T.HtmlCandidate[]>(`${API_BASE}/flows/${flowId}/html-analysis`).then(res => res.data),
    previewHtml: (data: T.AnalyzeHtmlRequest) => axios.post<T.HtmlCandidate[]>(`${API_BASE}/html-analysis/preview`, data).then(res => res.data),
    analyzeHtmlByUrl: (flowId: string, data: T.AnalyzeUrlRequest) => axios.post<T.HtmlAnalysisCaptureResponse>(`${API_BASE}/flows/${flowId}/html-analysis/runtime-url`, data).then(res => res.data),
    analyzeHtmlFromContext: (flowId: string, data: T.AnalyzeFlowContextRequest) => axios.post<T.HtmlAnalysisCaptureResponse>(`${API_BASE}/flows/${flowId}/html-analysis/runtime-context`, data).then(res => res.data),

    // Extractions
    getExtraction: (scenarioId: string) => axios.get<T.ExtractionDefinition>(`${API_BASE}/scenarios/${scenarioId}/extraction`).then(res => res.data).catch(() => null),
    upsertExtraction: (scenarioId: string, data: T.ExtractionUpsertRequest) => axios.put<T.ExtractionDefinition>(`${API_BASE}/scenarios/${scenarioId}/extraction`, data).then(res => res.data),
    previewExtractionCandidates: (scenarioId: string, data: T.ExtractionPreviewRequest) => axios.post<T.ExtractionPreviewResponse>(`${API_BASE}/scenarios/${scenarioId}/extraction/preview-candidates`, data).then(res => res.data),
    previewExtractionResult: (scenarioId: string, data: T.ExtractionResultPreviewRequest) => axios.post<T.ExtractionResultPreviewResponse>(`${API_BASE}/scenarios/${scenarioId}/extraction/preview-result`, data).then(res => res.data),

    // Execution
    runScenario: (scenarioId: string, data: T.RunScenarioRequest) => axios.post<{ scenarioRunId: string }>(`${API_BASE}/scenarios/${scenarioId}/run`, data).then(res => res.data.scenarioRunId),
    getRun: (runId: string) => axios.get<T.ScenarioRunResponse>(`${API_BASE}/runs/${runId}`).then(res => res.data),
    getRunResult: (runId: string) => axios.get<T.RunResultResponse>(`${API_BASE}/runs/${runId}/result`).then(res => res.data),
    getRunStatus: (runId: string) => axios.get<{ status: T.RunStatus }>(`${API_BASE}/runs/${runId}`).then(res => res.data),
    getFlowRuns: (runId: string) => axios.get<T.FlowRunResponse[]>(`${API_BASE}/runs/${runId}/flows`).then(res => res.data),
    getStepRuns: (flowRunId: string) => axios.get<T.StepRunResponse[]>(`${API_BASE}/flow-runs/${flowRunId}/steps`).then(res => res.data),
    getRepairSuggestions: (runId: string, stepRunId: string) => axios.post<T.RepairSuggestion[]>(`${API_BASE}/runs/${runId}/steps/${stepRunId}/repair-suggestions`).then(res => res.data),

    // Ops
    getScenarioHealth: (companyId?: string) => axios.get<T.ScenarioHealthSnapshotResponse[]>(`${API_BASE}/ops/health/scenarios`, {
        params: companyId ? { companyId } : undefined,
    }).then(res => res.data),
};
