import React, { useState, useEffect } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import * as T from '../../types';

export const ExtractionPanel: React.FC = () => {
  const {
    selectedScenarioId,
    scenarios,
    extraction,
    refreshExtraction,
    scenarioFlowsMap,
    flows,
  } = useWizardState();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<T.ExtractionUpsertRequest>({
    flowDefinitionId: '',
    name: 'FinalResult',
    selectorType: T.SelectorType.Css,
    selectorValue: '',
    extractionType: T.ExtractionType.Text,
    returnMany: false,
  });

  const scenario = scenarios.find(s => s.id === selectedScenarioId);
  const scenarioFlows = scenarioFlowsMap[selectedScenarioId || ''] || flows;

  useEffect(() => {
    if (extraction) {
      setForm({
        flowDefinitionId: extraction.flowDefinitionId,
        name: extraction.name,
        selectorType: extraction.selectorType,
        selectorValue: extraction.selectorValue,
        extractionType: extraction.extractionType,
        returnMany: extraction.returnMany,
      });
    } else {
        // Default to last flow if possible
        if (scenarioFlows.length > 0 && !form.flowDefinitionId) {
            setForm(prev => ({ ...prev, flowDefinitionId: scenarioFlows[scenarioFlows.length - 1].id }));
        }
    }
  }, [extraction, scenarioFlows, form.flowDefinitionId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenarioId || !form.flowDefinitionId || !form.selectorValue) {
        alert('Lütfen tüm zorunlu alanları doldurun.');
        return;
    }

    setLoading(true);
    try {
      await api.upsertExtraction(selectedScenarioId, form);
      await refreshExtraction(selectedScenarioId);
      alert('Sonuç çıkarma tanımı başarıyla kaydedildi.');
    } catch (err) {
      console.error(err);
      alert('Kaydetme sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedScenarioId) {
    return (
      <div className="empty-state-panel">
        <i className="bi bi-info-circle"></i>
        <p>Lütfen önce bir senaryo seçin.</p>
      </div>
    );
  }

  return (
    <div className="panel-view animate-fade-in">
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-box-arrow-in-right panel-title-icon"></i>
          <div>
            <h3>Sonuç Çıkarma (Extraction)</h3>
            <p className="muted">Senaryo sonunda sayfadan hangi verinin çekileceğini belirleyin.</p>
          </div>
        </div>
        <div className="breadcrumb-bar">
          <span className="breadcrumb-item"><i className="bi bi-journal-text"></i> {scenario?.name}</span>
          <i className="bi bi-chevron-right breadcrumb-sep"></i>
          <span className="breadcrumb-item active">Sonuç Çıkarma</span>
        </div>
      </div>

      <div className="glass-card max-w-2xl">
        <form onSubmit={handleSave}>
          <div className="form-stack">
            <div className="form-group">
              <label>Hangi Akıştan Sonra? <span className="required">*</span></label>
              <select
                className="modern-input"
                value={form.flowDefinitionId}
                onChange={e => setForm({ ...form, flowDefinitionId: e.target.value })}
                required
              >
                <option value="">Akış seçin...</option>
                {scenarioFlows.map(f => (
                  <option key={f.id} value={f.id}>#{f.orderNo} {f.name}</option>
                ))}
              </select>
              <p className="field-hint">Veri çıkarma işlemi bu akış tamamlandıktan sonra yapılır.</p>
            </div>

            <div className="form-group">
              <label>Sonuç Değişken Adı <span className="required">*</span></label>
              <input
                type="text"
                className="modern-input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: TeklifNo, BasariMesaji"
                required
              />
            </div>

            <div className="grid-two">
              <div className="form-group">
                <label>Selector Tipi</label>
                <select
                  className="modern-input"
                  value={form.selectorType}
                  onChange={e => setForm({ ...form, selectorType: parseInt(e.target.value) })}
                >
                  {Object.entries(T.SelectorTypeLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Extraction Tipi</label>
                <select
                  className="modern-input"
                  value={form.extractionType}
                  onChange={e => setForm({ ...form, extractionType: parseInt(e.target.value) })}
                >
                  <option value={T.ExtractionType.Text}>Text Content</option>
                  <option value={T.ExtractionType.InnerHtml}>Inner HTML</option>
                  <option value={T.ExtractionType.OuterHtml}>Outer HTML</option>
                  <option value={T.ExtractionType.AttributeValue}>Attribute Value</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Selector Değeri <span className="required">*</span></label>
              <input
                type="text"
                className="modern-input"
                value={form.selectorValue}
                onChange={e => setForm({ ...form, selectorValue: e.target.value })}
                placeholder="#result-id, .price-text etc."
                required
              />
            </div>

            <div className="form-group checkbox-group-modern">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.returnMany}
                  onChange={e => setForm({ ...form, returnMany: e.target.checked })}
                />
                <span className="checkbox-custom"></span>
                <div>
                  <strong>Liste Olarak Çek (Multi-select)</strong>
                  <p className="muted">Eşleşen tüm elementleri dizi olarak döner.</p>
                </div>
              </label>
            </div>

            <div className="form-actions mt-6">
              <button
                type="submit"
                className="btn-modern primary w-full"
                disabled={loading}
              >
                <i className={`bi ${loading ? 'bi-hourglass-split' : 'bi-save'}`}></i>
                {loading ? 'Kaydediliyor...' : (extraction ? 'Güncelle' : 'Tanımı Kaydet')}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="info-box-modern mt-6">
        <i className="bi bi-lightbulb-fill"></i>
        <div>
          <h4>İpucu</h4>
          <p>
            Senaryonuzun bir sonuç üretmesi için "Sonuç Çıkarma" tanımı yapmanız zorunludur.
            Bu tanım olmadığında senaryo başarılı olsa bile JSON sonucu boş dönecektir.
          </p>
        </div>
      </div>
    </div>
  );
};
