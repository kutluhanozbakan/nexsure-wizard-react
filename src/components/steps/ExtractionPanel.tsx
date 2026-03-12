import React, { useEffect, useMemo, useState } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import * as T from '../../types';

const slugifyName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'response_field';

const valueSourceLabel = (valueSourceType: T.ExtractionValueSourceType) => {
  switch (valueSourceType) {
    case 'InputValue': return 'Input Değeri';
    case 'SelectedOptionText': return 'Seçili Metin';
    case 'SelectedOptionValue': return 'Seçili Değer';
    case 'AttributeValue': return 'Attribute';
    case 'ListText': return 'Liste';
    default: return 'Metin';
  }
};

export const ExtractionPanel: React.FC = () => {
  const {
    selectedScenarioId,
    scenarios,
    extraction,
    refreshExtraction,
    scenarioFlowsMap,
    flows,
  } = useWizardState();

  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewCandidates, setPreviewCandidates] = useState<T.ExtractionCandidate[]>([]);
  const [previewPageUrl, setPreviewPageUrl] = useState('');
  const [selectedFields, setSelectedFields] = useState<T.ExtractionFieldMapping[]>([]);
  const [form, setForm] = useState({
    flowDefinitionId: '',
    sourceMode: 'CurrentContext' as T.ExtractionSourceMode,
    captureUrl: '',
    showBrowser: false,
    expandInteractiveElements: true,
  });

  const scenario = scenarios.find(s => s.id === selectedScenarioId);
  const scenarioFlows = scenarioFlowsMap[selectedScenarioId || ''] || flows;

  useEffect(() => {
    if (!extraction) {
      if (scenarioFlows.length > 0) {
        setForm(prev => ({
          ...prev,
          flowDefinitionId: prev.flowDefinitionId || scenarioFlows[scenarioFlows.length - 1].id,
        }));
      }
      setSelectedFields([]);
      return;
    }

    setForm(prev => ({
      ...prev,
      flowDefinitionId: extraction.flowDefinitionId,
      sourceMode: extraction.sourceMode || 'CurrentContext',
      captureUrl: extraction.captureUrl || '',
    }));

    if (extraction.fields.length > 0) {
      setSelectedFields(extraction.fields);
      return;
    }

    if (extraction.selectorValue) {
      setSelectedFields([
        {
          id: 'legacy-extraction',
          name: slugifyName(extraction.name || 'result'),
          label: extraction.name || 'Legacy Result',
          tagName: undefined,
          selectorType: extraction.selectorType ?? T.SelectorType.Css,
          selectorValue: extraction.selectorValue,
          valueSourceType: extraction.extractionType === T.ExtractionType.AttributeValue ? 'AttributeValue' : 'Text',
          attributeName: extraction.attributeName,
          returnMany: extraction.returnMany,
        },
      ]);
    }
  }, [extraction, scenarioFlows]);

  const selectedCandidateIds = useMemo(
    () => new Set(selectedFields.map(field => `${field.valueSourceType}|${field.selectorType}|${field.selectorValue}|${field.attributeName || ''}`)),
    [selectedFields]
  );

  const previewResult = useMemo(() => {
    const result: Record<string, string> = {};
    selectedFields.forEach(field => {
      const candidate = previewCandidates.find(x =>
        x.valueSourceType === field.valueSourceType
        && x.selectorType === field.selectorType
        && x.selectorValue === field.selectorValue
        && (x.attributeName || '') === (field.attributeName || '')
      );
      result[field.name || field.label] = candidate?.previewValue || '(önizleme yok)';
    });
    return JSON.stringify(result, null, 2);
  }, [previewCandidates, selectedFields]);

  const addCandidate = (candidate: T.ExtractionCandidate) => {
    const candidateKey = `${candidate.valueSourceType}|${candidate.selectorType}|${candidate.selectorValue}|${candidate.attributeName || ''}`;
    if (selectedCandidateIds.has(candidateKey)) {
      return;
    }

    const baseName = slugifyName(candidate.label);
    let name = baseName;
    let suffix = 2;
    const existingNames = new Set(selectedFields.map(field => field.name));
    while (existingNames.has(name)) {
      name = `${baseName}_${suffix}`;
      suffix += 1;
    }

    setSelectedFields(prev => [
      ...prev,
      {
        id: candidate.id,
        name,
        label: candidate.label,
        tagName: candidate.tagName,
        selectorType: candidate.selectorType,
        selectorValue: candidate.selectorValue,
        valueSourceType: candidate.valueSourceType,
        attributeName: candidate.attributeName,
        returnMany: candidate.returnMany,
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<T.ExtractionFieldMapping>) => {
    setSelectedFields(prev => prev.map(field => field.id === id ? { ...field, ...patch } : field));
  };

  const removeField = (id: string) => {
    setSelectedFields(prev => prev.filter(field => field.id !== id));
  };

  const handlePreview = async () => {
    if (!selectedScenarioId || !form.flowDefinitionId) {
      alert('Önce akış seçin.');
      return;
    }

    if (form.sourceMode === 'NavigateToUrl' && !form.captureUrl.trim()) {
      alert('URL ile analiz için hedef adres gerekli.');
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await api.previewExtractionCandidates(selectedScenarioId, {
        flowDefinitionId: form.flowDefinitionId,
        sourceMode: form.sourceMode,
        captureUrl: form.sourceMode === 'NavigateToUrl' ? form.captureUrl.trim() : undefined,
        expandInteractiveElements: form.expandInteractiveElements,
        showBrowser: form.showBrowser,
      });

      setPreviewCandidates(result.candidates);
      setPreviewPageUrl(result.pageUrl);
    } catch (err) {
      console.error(err);
      alert('Response adayları alınırken hata oluştu.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenarioId || !form.flowDefinitionId) {
      alert('Lütfen akış seçin.');
      return;
    }

    if (selectedFields.length === 0) {
      alert('Kaydedilecek en az bir cevap alanı seçin.');
      return;
    }

    if (selectedFields.some(field => !field.name.trim())) {
      alert('Tüm cevap alanlarına isim vermelisiniz.');
      return;
    }

    setSaving(true);
    try {
      await api.upsertExtraction(selectedScenarioId, {
        flowDefinitionId: form.flowDefinitionId,
        name: 'FinalResult',
        returnMany: false,
        sourceMode: form.sourceMode,
        captureUrl: form.sourceMode === 'NavigateToUrl' ? form.captureUrl.trim() : undefined,
        fields: selectedFields.map(field => ({
          ...field,
          name: field.name.trim(),
          label: field.label.trim(),
        })),
      });
      await refreshExtraction(selectedScenarioId);
      alert('Sonuç mapping kaydedildi.');
    } catch (err) {
      console.error(err);
      alert('Kaydetme sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
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
            <h3>Sonuç Mapping</h3>
            <p className="muted">Son ekrandaki response alanlarını tarayın, içlerinden sonuç olarak saklanacak cevapları seçin.</p>
          </div>
        </div>
        <div className="breadcrumb-bar">
          <span className="breadcrumb-item"><i className="bi bi-journal-text"></i> {scenario?.name}</span>
          <i className="bi bi-chevron-right breadcrumb-sep"></i>
          <span className="breadcrumb-item active">Sonuç Mapping</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="form-stack">
        <div className="glass-card">
          <h4><i className="bi bi-diagram-3"></i> Kaynak</h4>
          <div className="grid-two">
            <div className="form-group">
              <label>Hangi Akıştan Sonra?</label>
              <select
                className="modern-input"
                value={form.flowDefinitionId}
                onChange={e => setForm(prev => ({ ...prev, flowDefinitionId: e.target.value }))}
              >
                <option value="">Akış seçin...</option>
                {scenarioFlows.map(flow => (
                  <option key={flow.id} value={flow.id}>#{flow.orderNo} {flow.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Veri Kaynağı</label>
              <select
                className="modern-input"
                value={form.sourceMode}
                onChange={e => setForm(prev => ({ ...prev, sourceMode: e.target.value as T.ExtractionSourceMode }))}
              >
                <option value="CurrentContext">Seçili akıştan sonraki mevcut bağlam</option>
                <option value="NavigateToUrl">Ayrı URL'ye gidip tara</option>
              </select>
            </div>
          </div>

          {form.sourceMode === 'NavigateToUrl' && (
            <div className="form-group">
              <label>Hedef URL</label>
              <input
                type="text"
                className="modern-input"
                value={form.captureUrl}
                onChange={e => setForm(prev => ({ ...prev, captureUrl: e.target.value }))}
                placeholder="https://... veya {{degisken}} kullanabilirsiniz"
              />
            </div>
          )}

          <div className="grid-two">
            <div className="form-group checkbox-group-modern">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.expandInteractiveElements}
                  onChange={e => setForm(prev => ({ ...prev, expandInteractiveElements: e.target.checked }))}
                />
                <span className="checkbox-custom"></span>
                <div>
                  <strong>Dropdown ve gizli alanları açmayı dene</strong>
                  <p className="muted">Liste, combobox ve açılır yapılar best-effort olarak genişletilir.</p>
                </div>
              </label>
            </div>

            <div className="form-group checkbox-group-modern">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.showBrowser}
                  onChange={e => setForm(prev => ({ ...prev, showBrowser: e.target.checked }))}
                />
                <span className="checkbox-custom"></span>
                <div>
                  <strong>Tarayıcıyı göster</strong>
                  <p className="muted">Preview sırasında canlı tarayıcı açılır.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-modern" type="button" onClick={handlePreview} disabled={previewLoading}>
              <i className={`bi ${previewLoading ? 'bi-hourglass-split' : 'bi-search'}`}></i>
              {previewLoading ? 'Response alanları taranıyor...' : 'Response Alanlarını Tara'}
            </button>
          </div>

          {previewPageUrl && (
            <div className="info-box-modern mt-4">
              <i className="bi bi-link-45deg"></i>
              <div>
                <h4>Taranan Sayfa</h4>
                <p>{previewPageUrl}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid-two">
          <div className="glass-card">
            <div className="card-header-row">
              <h4><i className="bi bi-list-ul"></i> Bulunan Response Adayları</h4>
              <span className="count-badge">{previewCandidates.length}</span>
            </div>

            <div className="card-list scrollable">
              {previewCandidates.map(candidate => {
                const candidateKey = `${candidate.valueSourceType}|${candidate.selectorType}|${candidate.selectorValue}|${candidate.attributeName || ''}`;
                const isSelected = selectedCandidateIds.has(candidateKey);

                return (
                  <div
                    key={candidate.id}
                    className={`select-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => addCandidate(candidate)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addCandidate(candidate);
                      }
                    }}
                  >
                    <div className="select-card-main">
                      <div className="select-card-info">
                        <strong>{candidate.label}</strong>
                        <span className="action-badge">{valueSourceLabel(candidate.valueSourceType)}</span>
                        {candidate.tagName && <span className="action-badge">{candidate.tagName}</span>}
                        <span className="selector-mono">{candidate.selectorValue}</span>
                      </div>
                      <div className="select-card-actions">
                        <button
                          className="icon-btn primary"
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            addCandidate(candidate);
                          }}
                          disabled={isSelected}
                          title="Cevap olarak ekle"
                        >
                          <i className={`bi ${isSelected ? 'bi-check-lg' : 'bi-plus-lg'}`}></i>
                        </button>
                      </div>
                    </div>
                    <p className="select-card-desc">{candidate.previewValue || 'Önizleme değeri yok.'}</p>
                  </div>
                );
              })}

              {previewCandidates.length === 0 && (
                <div className="empty-state">
                  <i className="bi bi-search"></i>
                  <span>Henüz taranan response adayı yok.</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header-row">
              <h4><i className="bi bi-bookmark-check"></i> Seçilen Sonuç Alanları</h4>
              <span className="count-badge">{selectedFields.length}</span>
            </div>

            <div className="form-stack">
              {selectedFields.map(field => (
                <div key={field.id} className="select-card">
                  <div className="form-group">
                    <label>Alan Adı</label>
                    <input
                      type="text"
                      className="modern-input"
                      value={field.name}
                      onChange={e => updateField(field.id, { name: e.target.value })}
                      placeholder="ornek: teklif_no"
                    />
                  </div>

                  <div className="form-group">
                    <label>Etiket</label>
                    <input
                      type="text"
                      className="modern-input"
                      value={field.label}
                      onChange={e => updateField(field.id, { label: e.target.value })}
                    />
                  </div>

                  <div className="select-card-desc">
                    {valueSourceLabel(field.valueSourceType)}
                    {field.tagName ? ` • <${field.tagName}>` : ''}
                    {field.attributeName ? ` • @${field.attributeName}` : ''}
                    {` • ${field.selectorValue}`}
                  </div>

                  <div className="form-actions">
                    <button className="btn-outline-modern" type="button" onClick={() => removeField(field.id)}>
                      Kaldır
                    </button>
                  </div>
                </div>
              ))}

              {selectedFields.length === 0 && (
                <div className="empty-state">
                  <i className="bi bi-bookmark"></i>
                  <span>Henüz final sonuç alanı seçilmedi.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header-row">
            <h4><i className="bi bi-code-square"></i> Sonuç Önizlemesi</h4>
          </div>
          <pre className="result-pre">{previewResult}</pre>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-modern primary"
            disabled={saving}
          >
            <i className={`bi ${saving ? 'bi-hourglass-split' : 'bi-save'}`}></i>
            {saving ? 'Kaydediliyor...' : 'Sonuç Mappingini Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};
