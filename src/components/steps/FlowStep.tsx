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
    companies, selectedCompanyId, scenarios, selectedScenarioId: scenId,
    flowStepCountMap
  } = useWizardState();

  const [activeTab, setActiveTab] = useState<'flows' | 'html' | 'steps'>('flows');
  const [loading, setLoading] = useState(false);
  const [flowForm, setFlowForm] = useState({ name: '', orderNo: 1, startUrl: '', usePreviousFlowContext: false, timeoutMs: 30000 });

  // HTML Analysis
  const [htmlSnippet, setHtmlSnippet] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Step Form
  const [stepForm, setStepForm] = useState({
    stepName: '',
    action: T.ActionType.Click,
    selectedCandidateId: '',
    inputText: '',
    selectorType: T.SelectorType.Css,
    selectorValue: '',
    timeoutMs: 30000,
    retryCount: 0
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
  }, [selectedScenarioId]);

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
      // Load HTML snippet if exists
      const flow = flows.find(f => f.id === selectedFlowId);
      if (flow?.htmlSnippet) {
        setHtmlSnippet(flow.htmlSnippet);
      } else {
        setHtmlSnippet('');
      }
    }
  }, [selectedFlowId]);

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
      const flow = await api.createFlow({
        ...flowForm,
        scenarioId: selectedScenarioId,
        startUrl: flowForm.startUrl || undefined
      });
      const updatedFlows = [...flows, flow].sort((a, b) => a.orderNo - b.orderNo);
      setFlows(updatedFlows);
      setFlowForm({ name: '', orderNo: updatedFlows.length + 1, startUrl: '', usePreviousFlowContext: false, timeoutMs: 30000 });
      selectFlow(flow.id);
      refreshFlowsForScenario(selectedScenarioId);
    } catch (err) {
      console.error(err);
      alert('Akış oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const deleteFlow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Bu akışı silmek istediğinize emin misiniz?')) return;
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
          inputValueTemplate: stepForm.action === T.ActionType.TypeText || stepForm.action === T.ActionType.ClearAndType
            ? stepForm.inputText : undefined,
          timeoutMs: stepForm.timeoutMs,
          retryCount: stepForm.retryCount,
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
          inputValueTemplate: stepForm.action === T.ActionType.TypeText || stepForm.action === T.ActionType.ClearAndType
            ? stepForm.inputText : undefined,
          timeoutMs: stepForm.timeoutMs,
          retryCount: stepForm.retryCount,
        });
        setSteps([...steps, step]);
      }
      setStepForm({ stepName: '', action: T.ActionType.Click, selectedCandidateId: '', inputText: '', selectorType: T.SelectorType.Css, selectorValue: '', timeoutMs: 30000, retryCount: 0 });
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
    });
    setActiveTab('steps');
  };

  const deleteStep = async (id: string) => {
    try {
      await api.deleteStep(id);
      setSteps(steps.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const cancelEditStep = () => {
    setEditingStepId(null);
    setStepForm({ stepName: '', action: T.ActionType.Click, selectedCandidateId: '', inputText: '', selectorType: T.SelectorType.Css, selectorValue: '', timeoutMs: 30000, retryCount: 0 });
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
                    <button className="icon-btn danger" onClick={(e) => deleteFlow(e, f.id)} title="Sil">
                      <i className="bi bi-trash"></i>
                    </button>
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
            <h4><i className="bi bi-plus-circle"></i> Yeni Akış Ekle</h4>
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
                    onChange={e => setFlowForm({ ...flowForm, orderNo: parseInt(e.target.value) })}
                    className="modern-input"
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
                <button className="btn-modern w-full" type="submit" disabled={loading}>
                  <i className="bi bi-node-plus"></i> {loading ? 'Ekleniyor...' : 'Akış Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'html' && selectedFlowId && (
        <div className="animate-fade-in">
          <div className="glass-card">
            <h4><i className="bi bi-code-slash"></i> HTML Sayfası — {selectedFlow?.name}</h4>
            <p className="muted small">Otomasyonun etkileşime gireceği sayfanın HTML'ini yapıştırın ve analiz edin.</p>
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
                  <i className="bi bi-magic"></i> {analyzing ? 'Analiz Ediliyor...' : 'Analiz Et & Kaydet'}
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

              {(stepForm.action === T.ActionType.TypeText || stepForm.action === T.ActionType.ClearAndType) && (
                <div className="form-group">
                  <label>Yazılacak Metin / Değer</label>
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
                      <button className="icon-btn danger" onClick={() => deleteStep(step.id)} title="Sil">
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
