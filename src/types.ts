export interface Company {
    id: string;
    name: string;
    code: string;
    baseUrl: string;
}

export interface Scenario {
    id: string;
    companyId: string;
    name: string;
    description: string;
    statusDraftOrPublished: StatusDraftOrPublished;
}

export interface FlowDefinition {
    id: string;
    scenarioId: string;
    name: string;
    orderNo: number;
    startUrl?: string;
    usePreviousFlowContext: boolean;
    timeoutMs: number;
}

export interface StepDefinition {
    id: string;
    flowDefinitionId: string;
    name: string;
    orderNo: number;
    actionType: ActionType;
    selectorType: SelectorType;
    selectorValue: string;
    inputValueTemplate?: string;
    timeoutMs: number;
    retryCount: number;
}

export interface HtmlCandidate {
    id: string;
    candidateOrder: number;
    tagName: string;
    suggestedSelectorType: SelectorType;
    suggestedSelectorValue: string;
    displayText: string;
}

export interface ExtractionDefinition {
    id: string;
    flowDefinitionId: string;
    name: string;
    selectorType: SelectorType;
    selectorValue: string;
    extractionType: ExtractionType;
    returnMany: boolean;
}

export interface ScenarioRunResponse {
    id: string;
    status: RunStatus;
    startedAt?: string;
}

export interface FlowRunResponse {
    id: string;
    flowOrderNo: number;
    flowName: string;
    status: RunStatus;
}

export interface StepRunResponse {
    id: string;
    stepDefinitionId: string;
    stepName: string;
    status: RunStatus;
    selectorValueResolved?: string;
    errorMessage?: string;
    startedAt?: string;
}

export interface RepairSuggestion {
    suggestedSelector: string;
    confidenceScore: number;
    explanation: string;
}

export interface RunResultResponse {
    runId: string;
    resultJson: string;
}

export enum StatusDraftOrPublished {
    Draft = 0,
    Published = 1
}

export enum ActionType {
    Click = 0,
    TypeText = 1,
    ExtractData = 2,
    ExtractList = 3,
    VerifyElement = 4
}

export enum SelectorType {
    Css = 0,
    XPath = 1,
    Text = 2
}

export enum ExtractionType {
    Text = 0,
    AttributeValue = 1,
    InnerHtml = 2
}

export enum RunStatus {
    Pending = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    TimedOut = 4
}

export interface CompanyCreateRequest {
    name: string;
    code: string;
    baseUrl: string;
}

export interface ScenarioCreateRequest {
    companyId: string;
    name: string;
    description?: string;
    statusDraftOrPublished: StatusDraftOrPublished;
}

export interface ScenarioUpdateRequest {
    name: string;
    description?: string;
    statusDraftOrPublished: StatusDraftOrPublished;
    finalOutputMode?: string;
    isActive: boolean;
}

export interface FlowCreateRequest {
    scenarioId: string;
    name: string;
    orderNo: number;
    startUrl?: string;
    usePreviousFlowContext: boolean;
    timeoutMs: number;
}

export interface AnalyzeHtmlRequest {
    htmlSnippet: string;
}

export interface StepCreateRequest {
    flowDefinitionId: string;
    name: string;
    orderNo: number;
    actionType: ActionType;
    selectorType: SelectorType;
    selectorValue: string;
    inputValueTemplate?: string;
    timeoutMs: number;
    retryCount: number;
}

export interface StepUpdateRequest {
    name?: string;
    selectorValue?: string;
}

export interface ExtractionUpsertRequest {
    flowDefinitionId: string;
    name: string;
    selectorType: SelectorType;
    selectorValue: string;
    extractionType: ExtractionType;
    returnMany: boolean;
}

export interface RunScenarioRequest {
    triggeredBy: string;
    showBrowser: boolean;
}
