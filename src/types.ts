// ───── View Types ─────
export type ViewType = 'home' | 'company' | 'scenario' | 'flow' | 'steps' | 'execution' | 'extraction';

// ───── Domain Models ─────
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
    flowDefinitionId: string;
    name: string;
    selectorType: SelectorType;
    selectorValue: string;
    extractionType: ExtractionType;
    returnMany: boolean;
}

// ───── Run Models ─────
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
    ExtractHtml = 12
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

export enum RunStatus {
    Pending = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Skipped = 4
}

// ───── Request DTOs ─────
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
    selectorType: SelectorType;
    selectorValue: string;
    extractionType: ExtractionType;
    returnMany: boolean;
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
