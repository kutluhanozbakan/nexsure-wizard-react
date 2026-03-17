import React, { useEffect, useState } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import { SearchableDropdown } from '../SearchableDropdown';
import * as T from '../../types';

// Interactive tags that we want to capture from HTML
const INTERACTIVE_TAGS = ['input', 'select', 'button', 'textarea', 'a', 'label', 'option'];

export const FlowStep: React.FC = () => {
  const {
    flows, setFlows, selectedScenarioId, selectedFlowId, selectFlow,
    htmlCandidates, setHtmlCandidates, steps, setSteps,
    refreshFlowsForScenario, refreshStepsForFlow,
    companies, selectedCompanyId, scenarios,
    flowStepCountMap
  } = useWizardState();

  const [activeTab, setActiveTab] = useState<'flows' | 'html' | 'steps'>('flows');
  const [loading, setLoading] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [flowForm, setFlowForm] = useState({ name: '', orderNo: 1, startUrl: '', usePreviousFlowContext: false, timeoutMs: 30000 });

  // HTML Analysis
  const [htmlSnippet, setHtmlSnippet] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [runtimeUrl, setRuntimeUrl] = useState('');
  const [showRuntimeBrowser, setShowRuntimeBrowser] = useState(false);
  const [expandInteractiveElements, setExpandInteractiveElements] = useState(true);
  const [analyzedPageUrl, setAnalyzedPageUrl] = useState('');

  // Step Form
  const [stepForm, setStepForm] = useState({
    stepName: '',
    action: T.ActionType.Click,
    selectedCandidateId: '',
    inputText: '',
    selectorType: T.SelectorType.Css,
    selectorValue: '',
    timeoutMs: 30000,
    retryCount: 0,
    orderNo: 1,
  });
  const [stepProcessing, setStepProcessing] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
  const selectedFlow = flows.find(f => f.id === selectedFlowId);

  useEffect(() => {
    if (selectedScenarioId) {
      api.listFlowsByScenario(selectedScenarioId).then(res => {
        const sorted = res.sort((a, b) => a.orderNo - b.orderNo);
        setFlows(sorted);
        setFlowForm(f => ({ ...f, orderNo: sorted.length + 1 }));
      }).catch(console.error);
    }
  }, [selectedScenarioId, setFlows]);

  useEffect(() => {
    if (selectedFlowId) {
      // Load HTML candidates
      api.listHtmlCandidatesByFlow(selectedFlowId).then(res => {
        setHtmlCandidates(res.sort((a, b) => a.candidateOrder - b.candidateOrder));
      }).catch(console.error);
      // Load steps
      api.listStepsByFlow(selectedFlowId).then(res => {
        setSteps(res.sort((a, b) => a.orderNo - b.orderNo));
      }).catch(console.error);
    }
  }, [selectedFlowId, setHtmlCandidates, setSteps]);

  // Separate effect to handle html snippet syncing when flows or selectedFlowId change
  useEffect(() => {
    if (selectedFlowId) {
      const flow = flows.find(f => f.id === selectedFlowId);
      if (flow?.htmlSnippet) {
        setHtmlSnippet(flow.htmlSnippet);
      } else {
        setHtmlSnippet('');
      }
      setRuntimeUrl(flow?.startUrl || '');
    } else {
      setHtmlSnippet('');
      setRuntimeUrl('');
      setAnalyzedPageUrl('');
    }
  }, [selectedFlowId, flows]);

  // Filter to only interactive candidates
  const interactiveCandidates = htmlCandidates.filter(c =>
    INTERACTIVE_TAGS.includes(c.tagName?.toLowerCase() || '')
  );

  // Create dropdown options from candidates (deduplicated)
  const candidateOptions = interactiveCandidates.map(c => ({
    value: c.id,
    label: `[${c.tagName}] ${c.displayText || c.suggestedSelectorValue}`.substring(0, 60),
    subLabel: `${T.SelectorTypeLabels[c.suggestedSelectorType]}: ${c.suggestedSelectorValue}`,
    icon: c.tagName === 'input' ? 'bi-input-cursor-text' :
      c.tagName === 'button' ? 'bi-hand-index' :
        c.tagName === 'select' ? 'bi-menu-down' :
          c.tagName === 'a' ? 'bi-link-45deg' :
            c.tagName === 'textarea' ? 'bi-textarea-t' : 'bi-code'
  }));

  // ─── Flow CRUD ───
  const createFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenarioId || !flowForm.name) return;

    setLoading(true);
    try {
      if (editingFlowId) {
        const updated = await api.updateFlow(editingFlowId, {
          ...flowForm,
          startUrl: flowForm.startUrl || undefined
        });
        setFlows(flows.map(f => f.id === editingFlowId ? updated : f).sort((a, b) => a.orderNo - b.orderNo));
        setEditingFlowId(null);
        if (selectedScenarioId) refreshFlowsForScenario(selectedScenarioId);
      } else {
        const flow = await api.createFlow({
          ...flowForm,
          scenarioId: selectedScenarioId,
          startUrl: flowForm.startUrl || undefined
        });
        const updatedFlows = [...flows, flow].sort((a, b) => a.orderNo - b.orderNo);
        setFlows(updatedFlows);
        selectFlow(flow.id);
        refreshFlowsForScenario(selectedScenarioId);
      }
      setFlowForm({ name: '', orderNo: flows.length + (editingFlowId ? 1 : 2), startUrl: '', usePreviousFlowContext: false, timeoutMs: 30000 });
    } catch (err) {
      console.error(err);
      alert('Akış işlemi sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const startEditFlow = (e: React.MouseEvent, flow: T.FlowDefinition) => {
    e.stopPropagation();
    setEditingFlowId(flow.id);
    setFlowForm({
      name: flow.name,
      orderNo: flow.orderNo,
      startUrl: flow.startUrl || '',
      usePreviousFlowContext: flow.usePreviousFlowContext,
      timeoutMs: flow.timeoutMs
    });
  };

  const cancelEditFlow = () => {
    setEditingFlowId(null);
    setFlowForm({ name: '', orderNo: flows.length + 1, startUrl: '', usePreviousFlowContext: false, timeoutMs: 30000 });
  };

  const deleteFlow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Bu akışı ve içindeki TÜM adımları silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteFlow(id);
      setFlows(flows.filter(f => f.id !== id));
      if (selectedFlowId === id) {
        selectFlow('');
      }
      if (selectedScenarioId) refreshFlowsForScenario(selectedScenarioId);
    } catch (err) {
      console.error(err);
      alert('Silme sırasında hata oluştu.');
    }
  };

  // ─── HTML Analysis ───
  const performAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlowId || !htmlSnippet) return;

    setAnalyzing(true);
    try {
      const candidates = await api.analyzeHtml(selectedFlowId, { htmlSnippet });
      setHtmlCandidates(candidates.sort((a, b) => a.candidateOrder - b.candidateOrder));
      setAnalyzedPageUrl('');
      // Try to save the HTML snippet to the flow
      try {
        await api.updateFlow(selectedFlowId, { htmlSnippet });
        if (selectedScenarioId) refreshFlowsForScenario(selectedScenarioId);
      } catch {
        // updateFlow might not exist on backend yet, that's OK
      }
    } catch (err) {
      console.error(err);
      alert('Analiz sırasında hata oluştu.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRuntimeAnalysisResult = async (result: T.HtmlAnalysisCaptureResponse) => {
    setHtmlSnippet(result.htmlSnippet);
    setAnalyzedPageUrl(result.pageUrl);
    setHtmlCandidates(result.candidates.sort((a, b) => a.candidateOrder - b.candidateOrder));

    if (selectedScenarioId) {
      await refreshFlowsForScenario(selectedScenarioId);
    }
  };

  const analyzeCurrentFlowContext = async () => {
    if (!selectedFlowId) return;

    setAnalyzing(true);
    try {
      const result = await api.analyzeHtmlFromContext(selectedFlowId, {
        expandInteractiveElements,
        showBrowser: showRuntimeBrowser,
      });
      await handleRuntimeAnalysisResult(result);
    } catch (err) {
      console.error(err);
      alert('Canlı sayfa analizi sırasında hata oluştu.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeRuntimeUrl = async () => {
    if (!selectedFlowId || !runtimeUrl.trim()) return;

    setAnalyzing(true);
    try {
      const result = await api.analyzeHtmlByUrl(selectedFlowId, {
        url: runtimeUrl.trim(),
        expandInteractiveElements,
        showBrowser: showRuntimeBrowser,
      });
      await handleRuntimeAnalysisResult(result);
    } catch (err) {
      console.error(err);
      alert('URL üzerinden analiz sırasında hata oluştu.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Step CRUD ───
  const createStep = async () => {
    if (!selectedFlowId) return;

    let selectorType = stepForm.selectorType;
    let selectorValue = stepForm.selectorValue;

    // If a candidate is selected, use its selector
    if (stepForm.selectedCandidateId) {
      const candidate = htmlCandidates.find(x => x.id === stepForm.selectedCandidateId);
      if (candidate) {
        selectorType = candidate.suggestedSelectorType;
        selectorValue = candidate.suggestedSelectorValue;
      }
    }

    if (!selectorValue) {
      alert('Lütfen bir hedef öğe seçin veya selector değeri girin.');
      return;
    }

    setStepProcessing(true);
    try {
      if (editingStepId) {
        await api.updateStep(editingStepId, {
          name: stepForm.stepName,
          actionType: stepForm.action,
          selectorType: selectorType,
          selectorValue: selectorValue,
          inputValueTemplate: stepForm.action === T.ActionType.TypeText || stepForm.action === T.ActionType.ClearAndType || stepForm.action === T.ActionType.SelectOption
            ? stepForm.inputText : undefined,
          timeoutMs: stepForm.timeoutMs,
          retryCount: stepForm.retryCount,
          orderNo: stepForm.orderNo,
        });
        await refreshStepsForFlow(selectedFlowId);
        setEditingStepId(null);
      } else {
        const step = await api.createStep({
          flowDefinitionId: selectedFlowId,
          orderNo: steps.length + 1,
          name: stepForm.stepName.trim() || `${T.ActionTypeLabels[stepForm.action]} - Adım ${steps.length + 1}`,
          actionType: stepForm.action,
          selectorType: selectorType,
          selectorValue: selectorValue,
          inputValueTemplate: stepForm.action === T.ActionType.TypeText || stepForm.action === T.ActionType.ClearAndType || stepForm.action === T.ActionType.SelectOption
            ? stepForm.inputText : undefined,
          timeoutMs: stepForm.timeoutMs,
          retryCount: stepForm.retryCount,
        });
        setSteps([...steps, step]);
      }
      setStepForm({ stepName: '', action: T.ActionType.Click, selectedCandidateId: '', inputText: '', selectorType: T.SelectorType.Css, selectorValue: '', timeoutMs: 30000, retryCount: 0, orderNo: steps.length + 1 });
    } catch (err) {
      console.error(err);
      alert('Adım işlemi sırasında hata oluştu.');
    } finally {
      setStepProcessing(false);
    }
  };

  const startEditStep = (step: T.StepDefinition) => {
    setEditingStepId(step.id);
    setStepForm({
      stepName: step.name,
      action: step.actionType,
      selectedCandidateId: '',
      inputText: step.inputValueTemplate || '',
      selectorType: step.selectorType,
      selectorValue: step.selectorValue,
      timeoutMs: step.timeoutMs,
      retryCount: step.retryCount,
      orderNo: step.orderNo,
    });
    setActiveTab('steps');
  };

  const deleteStep = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Bu adımı silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteStep(id);
      setSteps(steps.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      alert('Adım silinirken hata oluştu.');
    }
  };

  const cancelEditStep = () => {
    setEditingStepId(null);
    setStepForm({ stepName: '', action: T.ActionType.Click, selectedCandidateId: '', inputText: '', selectorType: T.SelectorType.Css, selectorValue: '', timeoutMs: 30000, retryCount: 0, orderNo: 1 });
  };

  return (
    <div className="panel-view animate-fade-in">
      {/* Header & Breadcrumb */}
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-shuffle panel-title-icon"></i>
          <div>
            <h3>Akış Detayı</h3>
            <p className="muted">
              {selectedFlow
                ? `#${selectedFlow.orderNo} ${selectedFlow.name} akışını yönetin`
                : 'Senaryoya ait akışları ekleyin ve yönetin'}
            </p>
          </div>
        </div>
        <div className="breadcrumb-bar">
          {selectedCompany && (
            <>
              <span className="breadcrumb-item"><i className="bi bi-building"></i> {selectedCompany.name}</span>
              <i className="bi bi-chevron-right breadcrumb-sep"></i>
            </>
          )}
          {selectedScenario && (
            <>
              <span className="breadcrumb-item"><i className="bi bi-journal-text"></i> {selectedScenario.name}</span>
              <i className="bi bi-chevron-right breadcrumb-sep"></i>
            </>
          )}
          <span className="breadcrumb-item active">Akışlar</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'flows' ? 'active' : ''}`} onClick={() => setActiveTab('flows')}>
          <i className="bi bi-list-ul"></i> Akışlar ({flows.length})
        </button>
        {selectedFlowId && (
          <>
            <button className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`} onClick={() => setActiveTab('html')}>
              <i className="bi bi-code-slash"></i> HTML Analiz
              {htmlCandidates.length > 0 && <span className="tab-badge">{interactiveCandidates.length}</span>}
            </button>
            <button className={`tab-btn ${activeTab === 'steps' ? 'active' : ''}`} onClick={() => setActiveTab('steps')}>
              <i className="bi bi-list-check"></i> Adımlar ({steps.length})
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'flows' && (
        <div className="grid-two animate-fade-in">
          <div className="glass-card">
            <h4><i className="bi bi-shuffle"></i> Mevcut Akışlar</h4>
            <div className="card-list">
              {flows.map(f => (
                <div
                  key={f.id}
                  className={`select-card flow-card ${selectedFlowId === f.id ? 'selected' : ''}`}
                  onClick={() => {
                    selectFlow(f.id);
                    setActiveTab('html');
                  }}
                >
                  <div className="select-card-main">
                    <div className="flow-order">#{f.orderNo}</div>
                    <div className="select-card-info">
                      <strong>{f.name}</strong>
                      <span className="url-badge small">{f.startUrl || 'Önceki bağlam'}</span>
                    </div>
                    <div className="flow-badges">
                      <span className={`mini-badge ${f.htmlSnippet ? 'success' : 'warning'}`}>
                        {f.htmlSnippet ? '✓ HTML' : '✗ HTML'}
                      </span>
                      {flowStepCountMap[f.id] !== undefined && (
                        <span className="mini-badge info">{flowStepCountMap[f.id]} adım</span>
                      )}
                    </div>
                    <div className="select-card-actions">
                      <button className="icon-btn edit" onClick={(e) => startEditFlow(e, f)} title="Düzenle">
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button className="icon-btn danger" onClick={(e) => deleteFlow(e, f.id)} title="Sil">
                        <i className="bi bi-trash"></i>
                      </button>
                      {selectedFlowId === f.id && (
                        <i className="bi bi-check-circle-fill select-card-check"></i>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {flows.length === 0 && (
                <div className="empty-state">
                  <i className="bi bi-shuffle"></i>
                  <span>Henüz akış bulunmuyor.</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card sticky-form">
            <h4><i className={`bi ${editingFlowId ? 'bi-pencil' : 'bi-plus-circle'}`}></i> {editingFlowId ? 'Akışı Düzenle' : 'Yeni Akış Ekle'}</h4>
            <form onSubmit={createFlow}>
              <div className="form-stack">
                <div className="form-group">
                  <label>Akış Adı</label>
                  <input
                    type="text"
                    value={flowForm.name}
                    onChange={e => setFlowForm({ ...flowForm, name: e.target.value })}
                    className="modern-input"
                    placeholder="Örn: Giriş Yap"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Sıra No</label>
                  <input
                    type="number"
                    value={flowForm.orderNo}
                    onChange={e => setFlowForm({ ...flowForm, orderNo: parseInt(e.target.value) || 1 })}
                    className="modern-input"
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Başlangıç URL (Opsiyonel)</label>
                  <input
                    type="text"
                    value={flowForm.startUrl}
                    onChange={e => setFlowForm({ ...flowForm, startUrl: e.target.value })}
                    className="modern-input"
                    placeholder="https://..."
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={flowForm.usePreviousFlowContext}
                      onChange={e => setFlowForm({ ...flowForm, usePreviousFlowContext: e.target.checked })}
                    />
                    Önceki akış bağlamını kullan
                  </label>
                </div>
                <div className="form-actions">
                  {editingFlowId && (
                    <button className="btn-outline-modern" type="button" onClick={cancelEditFlow}>
                      İptal
                    </button>
                  )}
                  <button className={`btn-modern ${editingFlowId ? '' : 'w-full'}`} type="submit" disabled={loading}>
                    <i className={`bi ${editingFlowId ? 'bi-check-lg' : 'bi-plus-lg'}`}></i>
                    {loading ? 'İşleniyor...' : (editingFlowId ? 'Güncelle' : 'Akış Ekle')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'html' && selectedFlowId && (
        <div className="animate-fade-in">
          <div className="glass-card">
            <h4><i className="bi bi-code-slash"></i> HTML Sayfası — {selectedFlow?.name}</h4>
            <p className="muted small">HTML içeriği Playwright DOM analizi ile taranır; görünür ve etkileşimli öğeler aday olarak çıkarılır.</p>
            <div className="glass-card mt-4">
              <h5><i className="bi bi-lightning-charge"></i> Playwright Canlı Analiz</h5>
              <div className="form-stack">
                <div className="form-group">
                  <label>URL ile analiz et</label>
                  <input
                    type="text"
                    value={runtimeUrl}
                    onChange={e => setRuntimeUrl(e.target.value)}
                    className="modern-input"
                    placeholder="https://ornek-site/sayfa"
                  />
                  <p className="field-hint">İlk akışlarda doğrudan URL verilebilir. Sonraki akışlarda akış bağlamı analizi daha doğru sonuç verir.</p>
                </div>

                <div className="form-group checkbox-group-modern">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={expandInteractiveElements}
                      onChange={e => setExpandInteractiveElements(e.target.checked)}
                    />
                    <span className="checkbox-custom"></span>
                    <div>
                      <strong>Dropdown ve gizli alanları açmayı dene</strong>
                      <p className="muted">Combobox, summary ve `aria-expanded` tetikleyicileri best-effort olarak açılır.</p>
                    </div>
                  </label>
                </div>

                <div className="form-group checkbox-group-modern">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showRuntimeBrowser}
                      onChange={e => setShowRuntimeBrowser(e.target.checked)}
                    />
                    <span className="checkbox-custom"></span>
                    <div>
                      <strong>Tarayıcıyı göster</strong>
                      <p className="muted">Analiz sırasında canlı tarayıcıyı açar.</p>
                    </div>
                  </label>
                </div>

                <div className="form-actions">
                  <button className="btn-outline-modern" type="button" onClick={analyzeRuntimeUrl} disabled={analyzing || !runtimeUrl.trim()}>
                    <i className="bi bi-globe2"></i> URL'den Analiz Et
                  </button>
                  <button className="btn-modern" type="button" onClick={analyzeCurrentFlowContext} disabled={analyzing}>
                    <i className="bi bi-diagram-3"></i> Bu Akışın Sayfasını Getir
                  </button>
                </div>

                {analyzedPageUrl && (
                  <div className="info-box-modern">
                    <i className="bi bi-link-45deg"></i>
                    <div>
                      <h4>Analiz Edilen Sayfa</h4>
                      <p>{analyzedPageUrl}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <form onSubmit={performAnalysis}>
              <div className="form-stack">
                <div className="form-group">
                  <textarea
                    value={htmlSnippet}
                    onChange={e => setHtmlSnippet(e.target.value)}
                    className="modern-input code-textarea"
                    placeholder='<form id="login-form">...'
                    rows={10}
                    required
                  />
                  <div className="textarea-footer">
                    <small className="muted">{htmlSnippet.length.toLocaleString()} karakter</small>
                  </div>
                </div>
                <button className="btn-modern" type="submit" disabled={analyzing || !selectedFlowId}>
                  <i className="bi bi-magic"></i> {analyzing ? 'Analiz Ediliyor...' : 'Playwright ile Analiz Et & Kaydet'}
                </button>
              </div>
            </form>
          </div>

          {interactiveCandidates.length > 0 && (
            <div className="glass-card mt-4">
              <div className="card-header-row">
                <h4><i className="bi bi-bullseye"></i> Etkileşimli Elementler</h4>
                <span className="count-badge">{interactiveCandidates.length} / {htmlCandidates.length} toplam</span>
              </div>
              <div className="candidate-grid">
                {interactiveCandidates.map(c => (
                  <div key={c.id} className="candidate-card">
                    <div className="candidate-header">
                      <span className="tag-badge">{c.tagName}</span>
                      <span className="selector-type-label">{T.SelectorTypeLabels[c.suggestedSelectorType]}</span>
                    </div>
                    <div className="candidate-selector">{c.suggestedSelectorValue}</div>
                    <div className="candidate-text">{c.displayText || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {interactiveCandidates.length > 0 && (
            <div className="mt-4">
              <button className="btn-modern" onClick={() => setActiveTab('steps')}>
                <i className="bi bi-arrow-right"></i> Adımlara Geç
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'steps' && selectedFlowId && (
        <div className="grid-two animate-fade-in">
          <div className="glass-card">
            <h4><i className={`bi ${editingStepId ? 'bi-pencil' : 'bi-plus-circle'}`}></i> {editingStepId ? 'Adımı Düzenle' : 'Yeni Adım Ekle'}</h4>
            <div className="form-stack">
              <div className="form-group">
                <label>Adım Adı</label>
                <input
                  type="text"
                  value={stepForm.stepName}
                  onChange={e => setStepForm({ ...stepForm, stepName: e.target.value })}
                  className="modern-input"
                  placeholder="Örn: Kullanıcı Adı Yaz"
                />
              </div>

              <div className="form-group">
                <label>Sıra No</label>
                <input
                  type="number"
                  value={stepForm.orderNo}
                  onChange={e => setStepForm({ ...stepForm, orderNo: parseInt(e.target.value) || 1 })}
                  className="modern-input"
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Eylem Tipi</label>
                <SearchableDropdown
                  options={Object.entries(T.ActionTypeLabels).map(([val, label]) => ({
                    value: val,
                    label: label
                  }))}
                  value={String(stepForm.action)}
                  onChange={val => setStepForm({ ...stepForm, action: parseInt(val) })}
                  placeholder="Eylem seçin..."
                />
              </div>

              {interactiveCandidates.length > 0 && (
                <div className="form-group">
                  <label>Hedef Öğe (HTML Adaylarından)</label>
                  <SearchableDropdown
                    options={candidateOptions}
                    value={stepForm.selectedCandidateId}
                    onChange={val => {
                      setStepForm({ ...stepForm, selectedCandidateId: val });
                      // Auto-fill selector
                      const c = htmlCandidates.find(x => x.id === val);
                      if (c) {
                        setStepForm(prev => ({
                          ...prev,
                          selectedCandidateId: val,
                          selectorType: c.suggestedSelectorType,
                          selectorValue: c.suggestedSelectorValue,
                        }));
                      }
                    }}
                    placeholder="HTML adayı seçin..."
                    deduplicate
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Selector Tipi</label>
                  <SearchableDropdown
                    options={Object.entries(T.SelectorTypeLabels).map(([val, label]) => ({
                      value: val,
                      label: label
                    }))}
                    value={String(stepForm.selectorType)}
                    onChange={val => setStepForm({ ...stepForm, selectorType: parseInt(val) })}
                    placeholder="Selector tipi..."
                  />
                </div>
                <div className="form-group flex-2">
                  <label>Selector Değeri</label>
                  <input
                    type="text"
                    value={stepForm.selectorValue}
                    onChange={e => setStepForm({ ...stepForm, selectorValue: e.target.value })}
                    className="modern-input"
                    placeholder="#login-btn, .submit, ..."
                  />
                </div>
              </div>

              {(stepForm.action === T.ActionType.TypeText || stepForm.action === T.ActionType.ClearAndType || stepForm.action === T.ActionType.SelectOption) && (
                <div className="form-group">
                  <label>Yazılacak Metin / Seçilecek Değer</label>
                  <input
                    type="text"
                    value={stepForm.inputText}
                    onChange={e => setStepForm({ ...stepForm, inputText: e.target.value })}
                    className="modern-input"
                    placeholder="Değer..."
                  />
                </div>
              )}

              <div className="form-actions">
                {editingStepId && (
                  <button className="btn-outline-modern" type="button" onClick={cancelEditStep}>
                    İptal
                  </button>
                )}
                <button
                  className={`btn-modern ${editingStepId ? '' : 'w-full'}`}
                  onClick={createStep}
                  disabled={stepProcessing}
                >
                  <i className={`bi ${editingStepId ? 'bi-check-lg' : 'bi-plus-circle'}`}></i>
                  {stepProcessing ? 'İşleniyor...' : (editingStepId ? 'Güncelle' : 'Adımı Kaydet')}
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header-row">
              <h4><i className="bi bi-list-check"></i> Kayıtlı Adımlar</h4>
              <span className="count-badge">{steps.length}</span>
            </div>
            <div className="card-list scrollable">
              {steps.sort((a, b) => a.orderNo - b.orderNo).map(step => (
                <div key={step.id} className="select-card step-card">
                  <div className="select-card-main">
                    <div className="flow-order">#{step.orderNo}</div>
                    <div className="select-card-info">
                      <strong>{step.name}</strong>
                      <span className="action-badge">{T.ActionTypeLabels[step.actionType] || 'Bilinmeyen'}</span>
                      <span className="selector-mono">{step.selectorValue?.substring(0, 40)}</span>
                    </div>
                    <div className="select-card-actions">
                      <button className="icon-btn edit" onClick={() => startEditStep(step)} title="Düzenle">
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button className="icon-btn danger" onClick={(e) => deleteStep(e, step.id)} title="Sil">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {steps.length === 0 && (
                <div className="empty-state">
                  <i className="bi bi-list-check"></i>
                  <span>Henüz adım bulunmuyor.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
