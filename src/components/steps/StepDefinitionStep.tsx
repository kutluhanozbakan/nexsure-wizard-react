import React, { useState } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import { ActionType } from '../../types';

export const StepDefinitionStep: React.FC = () => {
  const { selectedFlowId, htmlCandidates, steps, setSteps } = useWizardState();
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ 
    stepName: '', 
    action: ActionType.Click, 
    selectedCandidateId: '', 
    inputText: '' 
  });

  React.useEffect(() => {
    if (selectedFlowId) {
      api.listStepsByFlow(selectedFlowId).then(setSteps).catch(console.error);
    }
  }, [selectedFlowId]);

  const createStep = async () => {
    if (!selectedFlowId || !form.selectedCandidateId) return;

    const candidate = htmlCandidates.find(x => x.id === form.selectedCandidateId);
    if (!candidate) return;

    setProcessing(true);
    try {
      const step = await api.createStep({
        flowDefinitionId: selectedFlowId,
        orderNo: steps.length + 1,
        name: form.stepName.trim() ? form.stepName : `${ActionType[form.action]} - ${candidate.tagName}`,
        actionType: form.action,
        selectorType: candidate.suggestedSelectorType,
        selectorValue: candidate.suggestedSelectorValue,
        inputValueTemplate: form.action === ActionType.TypeText ? form.inputText : undefined,
        timeoutMs: 30000,
        retryCount: 0
      });
      setSteps([...steps, step]);
      setForm({ ...form, stepName: '', inputText: '' });
    } catch (err) {
      console.error(err);
      alert('Adım eklenirken hata oluştu.');
    } finally {
      setProcessing(false);
    }
  };

  const deleteStep = async (id: string) => {
    try {
      await api.deleteStep(id);
      setSteps(steps.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="panel-header-modern">
        <h3>Adım Tanımlama</h3>
        <p className="muted">Seçili akış için tıklama, yazı yazma gibi otomasyon adımlarını ekleyin.</p>
      </div>

      <div className="grid-two">
        <div className="panel-block-modern glass-card">
          <h4>Yeni Adım Ekle</h4>
          <div className="form-stack-modern">
            <div className="form-group">
              <label>Adım Adı</label>
              <input 
                type="text" 
                value={form.stepName} 
                onChange={e => setForm({...form, stepName: e.target.value})} 
                className="modern-input" 
                placeholder="Örn: Butona Tıkla" 
              />
            </div>

            <div className="form-group">
              <label>Eylem Tipi</label>
              <select 
                value={form.action} 
                onChange={e => setForm({...form, action: parseInt(e.target.value)})} 
                className="modern-input"
              >
                <option value={ActionType.Click}>Tıkla</option>
                <option value={ActionType.TypeText}>Yazı Yaz</option>
              </select>
            </div>

            <div className="form-group">
              <label>Hedef Öğeyi Seç (HTML Adaylarından)</label>
              <select 
                value={form.selectedCandidateId} 
                onChange={e => setForm({...form, selectedCandidateId: e.target.value})} 
                className="modern-input"
              >
                <option value="">Aday seçin...</option>
                {htmlCandidates.map(c => (
                  <option key={c.id} value={c.id}>
                    #{c.candidateOrder} [{c.tagName}] {c.displayText.substring(0, 30)}
                  </option>
                ))}
              </select>
            </div>

            {form.action === ActionType.TypeText && (
              <div className="form-group">
                <label>Yazılacak Metin</label>
                <input 
                  type="text" 
                  value={form.inputText} 
                  onChange={e => setForm({...form, inputText: e.target.value})} 
                  className="modern-input" 
                  placeholder="Değer..." 
                />
              </div>
            )}

            <button 
              className="btn-modern w-full" 
              onClick={createStep} 
              disabled={!selectedFlowId || !form.selectedCandidateId || processing}
            >
              <i className="bi bi-plus-circle"></i> {processing ? 'Ekleniyor...' : 'Adımı Kaydet'}
            </button>
          </div>
        </div>

        <div className="panel-block-modern glass-card">
          <h4>Kayıtlı Adımlar ({steps.length})</h4>
          <div className="select-list-modern">
            {steps.sort((a,b) => a.orderNo - b.orderNo).map(step => (
              <div key={step.id} className="select-card-modern step-item-modern flex justify-between">
                <div className="step-info">
                  <strong>#{step.orderNo} - {step.name}</strong>
                  <div className="text-xs bg-blue-500 bg-opacity-20 text-blue-300 w-fit px-2 py-0.5 mt-1 rounded">
                    {ActionType[step.actionType]}
                  </div>
                  <small className="muted mt-1 block font-mono text-xs">{step.selectorValue.substring(0,40)}</small>
                </div>
                <button className="btn-danger btn-sm h-fit self-center" onClick={() => deleteStep(step.id)}>
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
