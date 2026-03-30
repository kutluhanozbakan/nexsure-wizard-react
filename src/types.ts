// ───── View Types ─────
export type ViewType = 'home' | 'company' | 'scenario' | 'flow' | 'steps' | 'execution' | 'extraction' | 'map' | 'ops';

// ───── Domain Models ─────
export interface Company {
    id: string;
    name: string;
    code: string;
    baseUrl?: string;
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    extraConfigJson?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
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
    htmlSnippet?: string;
    parsedSummaryJson?: string;
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
    continueOnError: boolean;
    expectedValue?: string;
    outputVariableName?: string;
}

export interface HtmlCandidate {
    id: string;
    candidateOrder: number;
    tagName: string;
    suggestedSelectorType: SelectorType;
    suggestedSelectorValue: string;
    displayText: string;
    attributeName?: string;
    attributeValue?: string;
    rawElementSnippet?: string;
}

export interface ExtractionDefinition {
    id: string;
    scenarioId?: string;
    flowDefinitionId: string;
    name: string;
    selectorType?: SelectorType;
    selectorValue?: string;
    extractionType?: ExtractionType;
    attributeName?: string;
    returnMany: boolean;
    sourceMode: ExtractionSourceMode;
    captureUrl?: string;
    fields: ExtractionFieldMapping[];
}

export interface ExtractionFieldMapping {
    id: string;
    name: string;
    label: string;
    tagName?: string;
    selectorType: SelectorType;
    selectorValue: string;
    valueSourceType: ExtractionValueSourceType;
    attributeName?: string;
    returnMany: boolean;
}

export interface ExtractionCandidate {
    id: string;
    label: string;
    previewValue?: string;
    tagName?: string;
    selectorType: SelectorType;
    selectorValue: string;
    valueSourceType: ExtractionValueSourceType;
    attributeName?: string;
    returnMany: boolean;
}

export interface ExtractionPreviewRequest {
    flowDefinitionId: string;
    sourceMode: ExtractionSourceMode;
    captureUrl?: string;
    expandInteractiveElements: boolean;
    showBrowser: boolean;
}

export interface ExtractionPreviewResponse {
    pageUrl: string;
    candidates: ExtractionCandidate[];
}

export interface ExtractionResultPreviewRequest {
    flowDefinitionId: string;
    selectorType?: SelectorType;
    selectorValue?: string;
    extractionType?: ExtractionType;
    attributeName?: string;
    returnMany: boolean;
    sourceMode: ExtractionSourceMode;
    captureUrl?: string;
    expandInteractiveElements: boolean;
    showBrowser: boolean;
    fields: ExtractionFieldMapping[];
}

export interface ExtractionResultPreviewResponse {
    sourceMode: ExtractionSourceMode;
    pageUrl: string;
    value?: unknown;
    fields: Record<string, unknown>;
}

// ───── Run Models ─────
export interface ScenarioRunResponse {
    id: string;
    scenarioId: string;
    companyId: string;
    status: RunStatus;
    startedAt?: string;
    endedAt?: string;
    finalUrl?: string;
    resultJson?: string;
    errorMessage?: string;
    errorCode?: string;
    errorCategory?: string;
    failureFingerprint?: string;
    firstFailedStepId?: string;
    triggeredBy?: string;
}

export interface FlowRunResponse {
    id: string;
    scenarioRunId: string;
    flowDefinitionId: string;
    flowOrderNo: number;
    flowName: string;
    status: RunStatus;
    startedAt?: string;
    endedAt?: string;
    currentUrl?: string;
    errorMessage?: string;
}

export interface StepRunResponse {
    id: string;
    flowRunId: string;
    stepDefinitionId: string;
    stepOrderNo: number;
    stepName: string;
    status: RunStatus;
    attemptCount?: number;
    selectorValueResolved?: string;
    outputValue?: string;
    errorMessage?: string;
    errorCode?: string;
    errorCategory?: string;
    failureFingerprint?: string;
    pageUrl?: string;
    screenshotPath?: string;
    domSnapshotPath?: string;
    startedAt?: string;
    endedAt?: string;
}

export interface RepairSuggestion {
    suggestedSelector: string;
    confidenceScore: number;
    explanation: string;
}

export interface RunResultResponse {
    scenarioRunId: string;
    resultJson: string;
}

export interface ScenarioHealthSnapshotResponse {
    scenarioId: string;
    companyId: string;
    scenarioName: string;
    companyName: string;
    status: ScenarioHealthStatus;
    lastRunAt?: string;
    lastSuccessfulRunAt?: string;
    lastFailedRunAt?: string;
    consecutiveFailureCount: number;
    successCount24h: number;
    failureCount24h: number;
    lastFailureFingerprint?: string;
}

// ───── Enums (synced with backend) ─────
export enum StatusDraftOrPublished {
    Draft = 0,
    Published = 1
}

export enum ActionType {
    Click = 0,
    TypeText = 1,
    ClearAndType = 2,
    SelectOption = 3,
    Check = 4,
    Uncheck = 5,
    Wait = 6,
    WaitForSelector = 7,
    PressKey = 8,
    Navigate = 9,
    ExtractText = 10,
    ExtractAttribute = 11,
    ExtractHtml = 12,
    TypeOtp = 13
}

export const ActionTypeLabels: Record<number, string> = {
    [ActionType.Click]: 'Tıkla',
    [ActionType.TypeText]: 'Yazı Yaz',
    [ActionType.ClearAndType]: 'Temizle & Yaz',
    [ActionType.SelectOption]: 'Seçenek Seç',
    [ActionType.Check]: 'İşaretle',
    [ActionType.Uncheck]: 'İşareti Kaldır',
    [ActionType.Wait]: 'Bekle',
    [ActionType.WaitForSelector]: 'Selector Bekle',
    [ActionType.PressKey]: 'Tuş Bas',
    [ActionType.Navigate]: 'Yönlendir',
    [ActionType.ExtractText]: 'Metin Çek',
    [ActionType.ExtractAttribute]: 'Attribute Çek',
    [ActionType.ExtractHtml]: 'HTML Çek',
    [ActionType.TypeOtp]: 'OTP Gir',
};

export enum SelectorType {
    Css = 0,
    XPath = 1,
    Id = 2,
    Name = 3,
    Class = 4,
    Placeholder = 5,
    Text = 6,
    Role = 7,
    AttributePair = 8
}

export const SelectorTypeLabels: Record<number, string> = {
    [SelectorType.Css]: 'CSS',
    [SelectorType.XPath]: 'XPath',
    [SelectorType.Id]: 'ID',
    [SelectorType.Name]: 'Name',
    [SelectorType.Class]: 'Class',
    [SelectorType.Placeholder]: 'Placeholder',
    [SelectorType.Text]: 'Text',
    [SelectorType.Role]: 'Role',
    [SelectorType.AttributePair]: 'Attribute Pair',
};

export enum ExtractionType {
    Text = 0,
    InnerHtml = 1,
    OuterHtml = 2,
    AttributeValue = 3
}

export type ExtractionSourceMode = 'CurrentContext' | 'NavigateToUrl';
export type ExtractionValueSourceType =
    | 'Text'
    | 'InputValue'
    | 'SelectedOptionText'
    | 'SelectedOptionValue'
    | 'AttributeValue'
    | 'ListText';

export enum RunStatus {
    Pending = 0,
    Queued = 1,
    Running = 2,
    Completed = 3,
    Failed = 4,
    Skipped = 5
}

export enum ScenarioHealthStatus {
    Unknown = 0,
    Healthy = 1,
    Degraded = 2,
    Outage = 3
}

// ───── Request DTOs ─────
export interface CompanyCreateRequest {
    name: string;
    code: string;
    baseUrl?: string;
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    proxyPassword?: string;
    googleSecretKey?: string;
}

export interface CompanyUpdateRequest extends CompanyCreateRequest {
    isActive?: boolean;
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

export interface FlowUpdateRequest {
    name?: string;
    orderNo?: number;
    startUrl?: string;
    htmlSnippet?: string;
    timeoutMs?: number;
}

export interface AnalyzeHtmlRequest {
    htmlSnippet: string;
}

export interface AnalyzeUrlRequest {
    url: string;
    expandInteractiveElements: boolean;
    showBrowser: boolean;
}

export interface AnalyzeFlowContextRequest {
    expandInteractiveElements: boolean;
    showBrowser: boolean;
}

export interface HtmlAnalysisCaptureResponse {
    pageUrl: string;
    htmlSnippet: string;
    candidates: HtmlCandidate[];
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
    orderNo?: number;
    actionType?: ActionType;
    selectorType?: SelectorType;
    selectorValue?: string;
    inputValueTemplate?: string;
    timeoutMs?: number;
    retryCount?: number;
}

export interface ExtractionUpsertRequest {
    flowDefinitionId: string;
    name: string;
    selectorType?: SelectorType;
    selectorValue?: string;
    extractionType?: ExtractionType;
    attributeName?: string;
    returnMany: boolean;
    sourceMode: ExtractionSourceMode;
    captureUrl?: string;
    fields: ExtractionFieldMapping[];
}

export interface RunScenarioRequest {
    triggeredBy: string;
    showBrowser: boolean;
}

// ───── Tree Types ─────
export interface TreeNodeData {
    type: 'company' | 'scenario' | 'flow';
    id: string;
    label: string;
    data?: Company | Scenario | FlowDefinition;
    children?: TreeNodeData[];
    meta?: {
        flowCount?: number;
        stepCount?: number;
        hasHtml?: boolean;
        status?: StatusDraftOrPublished;
    };
}
