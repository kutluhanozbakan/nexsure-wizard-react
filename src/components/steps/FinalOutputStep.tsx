import React, { useEffect, useState } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import { ExtractionType, SelectorType } from '../../types';

export const FinalOutputStep: React.FC = () => {
  const { selectedScenarioId, selectedFlowId, extraction, setExtraction } = useWizardState();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    selectorType: SelectorType.Css,
    selectorValue: '',
    extractionType: ExtractionType.Text,
    returnMany: false
  });

  useEffect(() => {
    if (selectedScenarioId && !extraction) {
      api.getExtraction(selectedScenarioId).then(data => {
        if (data) {
          setExtraction(data);
          setForm({
            name: data.name,
            selectorType: data.selectorType,
            selectorValue: data.selectorValue,
            extractionType: data.extractionType,
            returnMany: data.returnMany
          });
        }
      }).catch(console.error);
    }
  }, [selectedScenarioId]);

  const saveExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenarioId || !selectedFlowId) return;

    setLoading(true);
    try {
      const data = await api.upsertExtraction(selectedScenarioId, {
        flowDefinitionId: selectedFlowId,
        ...form
      });
      setExtraction(data);
      alert('Çıktı konfigürasyonu kaydedildi.');
    } catch (err) {
      console.error(err);
      alert('Kaydetme hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="panel-header-modern">
        <h3>Final Çıktı Konfigürasyonu</h3>
        <p className="muted">Senaryonun en sonunda çekilecek ana veriyi (örn: Sonuç Listesi) tanımlayın.</p>
      </div>

      <div className="panel-block-modern glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={saveExtraction}>
          <div className="form-stack-modern">
            <div className="form-group">
              <label>Çıktı Adı</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="modern-input" 
                placeholder="Örn: UrunListesi" 
                required 
              />
            </div>

            <div className="form-group">
              <label>Hedef Seçici (Selector)</label>
              <input 
                type="text" 
                value={form.selectorValue} 
                onChange={e => setForm({...form, selectorValue: e.target.value})} 
                className="modern-input" 
                placeholder=".product-item" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>Seçici Tipi</label>
                <select 
                  value={form.selectorType} 
                  onChange={e => setForm({...form, selectorType: parseInt(e.target.value)})} 
                  className="modern-input"
                >
                  <option value={SelectorType.Css}>CSS Selector</option>
                  <option value={SelectorType.XPath}>XPath</option>
                </select>
              </div>

              <div className="form-group">
                <label>Çıkarma Tipi</label>
                <select 
                  value={form.extractionType} 
                  onChange={e => setForm({...form, extractionType: parseInt(e.target.value)})} 
                  className="modern-input"
                >
                  <option value={ExtractionType.Text}>Sadece Metin (Text)</option>
                  <option value={ExtractionType.InnerHtml}>Inner HTML</option>
                  <option value={ExtractionType.AttributeValue}>Özellik Değeri (Attribute)</option>
                </select>
              </div>
            </div>

            <div className="form-group checkbox-group mt-2">
              <label className="checkbox-line flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={form.returnMany} 
                  onChange={e => setForm({...form, returnMany: e.target.checked})} 
                /> Birden Fazla Öğe Çıkar (Liste)
              </label>
            </div>

            <button className="btn-modern w-full" type="submit" disabled={loading || !selectedFlowId}>
              <i className="bi bi-cloud-arrow-up"></i> {loading ? 'Kaydediliyor...' : 'Çıktı Formatını Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
