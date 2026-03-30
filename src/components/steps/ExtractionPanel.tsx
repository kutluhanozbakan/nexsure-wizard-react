import axios from 'axios';
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
    case 'InputValue': return 'Input';
    case 'SelectedOptionText': return 'Seçili Metin';
    case 'SelectedOptionValue': return 'Seçili Değer';
    case 'AttributeValue': return 'Attribute';
    case 'ListText': return 'Liste';
    default: return 'Metin';
  }
};

const selectorTypeOptions: T.SelectorType[] = [
  T.SelectorType.Css,
  T.SelectorType.XPath,
  T.SelectorType.Id,
  T.SelectorType.Name,
  T.SelectorType.Class,
  T.SelectorType.Placeholder,
  T.SelectorType.Text,
  T.SelectorType.Role,
  T.SelectorType.AttributePair,
];

const valueSourceOptions: T.ExtractionValueSourceType[] = [
  'Text',
  'InputValue',
  'SelectedOptionText',
  'SelectedOptionValue',
  'AttributeValue',
  'ListText',
];

const createManualFieldDraft = () => ({
  name: '',
  selectorType: T.SelectorType.Id,
  selectorValue: '',
  valueSourceType: 'InputValue' as T.ExtractionValueSourceType,
  attributeName: '',
  returnMany: false,
});

const itemKey = (item: Pick<T.ExtractionCandidate, 'valueSourceType' | 'selectorType' | 'selectorValue' | 'attributeName'>) =>
  `${item.valueSourceType}|${item.selectorType}|${item.selectorValue}|${item.attributeName || ''}`;

const candidateScore = (candidate: T.ExtractionCandidate) => {
  switch (candidate.valueSourceType) {
    case 'InputValue': return 0;
    case 'SelectedOptionText': return 1;
    case 'SelectedOptionValue': return 2;
    case 'ListText': return 3;
    case 'AttributeValue': return 4;
    default: return 5;
  }
};

const isContentCandidate = (candidate: T.ExtractionCandidate) => {
  const preview = candidate.previewValue?.trim();
  if (!preview) {
    return candidate.valueSourceType !== 'Text';
  }

  if (candidate.valueSourceType === 'Text') {
    return preview.length >= 3;
  }

  return true;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError(err)) {
    const apiError = err.response?.data?.error;
    if (typeof apiError === 'string' && apiError.trim()) {
      return `${fallback}\n\n${apiError}`;
    }

    if (typeof err.message === 'string' && err.message.trim()) {
      return `${fallback}\n\n${err.message}`;
    }
  }

  if (err instanceof Error && err.message.trim()) {
    return `${fallback}\n\n${err.message}`;
  }

  return fallback;
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
  const [scanLoading, setScanLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewCandidates, setPreviewCandidates] = useState<T.ExtractionCandidate[]>([]);
  const [previewPageUrl, setPreviewPageUrl] = useState('');
  const [selectedFields, setSelectedFields] = useState<T.ExtractionFieldMapping[]>([]);
  const [scanQuery, setScanQuery] = useState('');
  const [testedResult, setTestedResult] = useState<T.ExtractionResultPreviewResponse | null>(null);
  const [form, setForm] = useState({
    flowDefinitionId: '',
    sourceMode: 'CurrentContext' as T.ExtractionSourceMode,
    captureUrl: '',
    showBrowser: false,
    expandInteractiveElements: true,
  });
  const [manualField, setManualField] = useState(createManualFieldDraft);

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
      setTestedResult(null);
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
      setTestedResult(null);
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
      setTestedResult(null);
      return;
    }

    setSelectedFields([]);
    setTestedResult(null);
  }, [extraction, scenarioFlows]);

  const selectedKeys = useMemo(
    () => new Set(selectedFields.map(field => itemKey(field))),
    [selectedFields]
  );

  const filteredCandidates = useMemo(() => {
    const query = scanQuery.trim().toLowerCase();

    return previewCandidates
      .filter(isContentCandidate)
      .filter(candidate => {
        if (!query) {
          return true;
        }

        return (
          candidate.previewValue?.toLowerCase().includes(query)
          || candidate.label.toLowerCase().includes(query)
          || candidate.selectorValue.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const scoreDiff = candidateScore(a) - candidateScore(b);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        return (b.previewValue?.length || 0) - (a.previewValue?.length || 0);
      });
  }, [previewCandidates, scanQuery]);

  const candidatePreviewMap = useMemo(() => {
    const map = new Map<string, string>();
    previewCandidates.forEach(candidate => {
      map.set(itemKey(candidate), candidate.previewValue || '');
    });
    return map;
  }, [previewCandidates]);

  const draftPreview = useMemo(() => {
    const result: Record<string, unknown> = {};

    selectedFields.forEach(field => {
      const fieldName = field.name.trim() || field.label.trim() || 'response_field';
      result[fieldName] = candidatePreviewMap.get(itemKey(field)) || '(henüz test edilmedi)';
    });

    return result;
  }, [candidatePreviewMap, selectedFields]);

  const previewJson = useMemo(() => {
    const source = testedResult?.fields && Object.keys(testedResult.fields).length > 0
      ? testedResult.fields
      : draftPreview;
    return JSON.stringify(source, null, 2);
  }, [draftPreview, testedResult]);

  const buildUniqueFieldName = (preferredValue: string) => {
    const baseName = slugifyName(preferredValue);
    let name = baseName;
    let suffix = 2;
    const existingNames = new Set(selectedFields.map(field => field.name));
    while (existingNames.has(name)) {
      name = `${baseName}_${suffix}`;
      suffix += 1;
    }

    return name;
  };

  const addCandidate = (candidate: T.ExtractionCandidate) => {
    const candidateId = itemKey(candidate);
    if (selectedKeys.has(candidateId)) {
      return;
    }

    const name = buildUniqueFieldName(candidate.label || candidate.previewValue || 'response_field');

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
    setTestedResult(null);
  };

  const addManualField = () => {
    const selectorValue = manualField.selectorValue.trim();
    if (!selectorValue) {
      alert('Manuel alan için selector değeri gerekli.');
      return;
    }

    const attributeName = manualField.attributeName.trim();
    if (manualField.valueSourceType === 'AttributeValue' && !attributeName) {
      alert('Attribute değeri okumak için attribute adı gerekli.');
      return;
    }

    const fieldName = buildUniqueFieldName(manualField.name.trim() || selectorValue);
    const field: T.ExtractionFieldMapping = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: fieldName,
      label: manualField.name.trim() || selectorValue,
      tagName: undefined,
      selectorType: manualField.selectorType,
      selectorValue,
      valueSourceType: manualField.valueSourceType,
      attributeName: manualField.valueSourceType === 'AttributeValue' ? attributeName : undefined,
      returnMany: manualField.returnMany,
    };

    if (selectedKeys.has(itemKey(field))) {
      alert('Bu selector zaten ekli.');
      return;
    }

    setSelectedFields(prev => [...prev, field]);
    setManualField(createManualFieldDraft());
    setTestedResult(null);
  };

  const toggleCandidate = (candidate: T.ExtractionCandidate) => {
    const candidateId = itemKey(candidate);

    if (selectedKeys.has(candidateId)) {
      setSelectedFields(prev => prev.filter(field => itemKey(field) !== candidateId));
      setTestedResult(null);
      return;
    }

    addCandidate(candidate);
  };

  const updateField = (id: string, patch: Partial<T.ExtractionFieldMapping>) => {
    setSelectedFields(prev => prev.map(field => field.id === id ? { ...field, ...patch } : field));
    setTestedResult(null);
  };

  const removeField = (id: string) => {
    setSelectedFields(prev => prev.filter(field => field.id !== id));
    setTestedResult(null);
  };

  const handleScan = async () => {
    if (!selectedScenarioId || !form.flowDefinitionId) {
      alert('Önce akış seçin.');
      return;
    }

    if (form.sourceMode === 'NavigateToUrl' && !form.captureUrl.trim()) {
      alert('URL ile tarama için hedef adres gerekli.');
      return;
    }

    setScanLoading(true);
    setTestedResult(null);
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
      alert(getErrorMessage(err, 'Response alanları taranırken hata oluştu.'));
    } finally {
      setScanLoading(false);
    }
  };

  const handleTest = async () => {
    if (!selectedScenarioId || !form.flowDefinitionId) {
      alert('Önce akış seçin.');
      return;
    }

    if (selectedFields.length === 0) {
      alert('Test etmek için en az bir alan seçin.');
      return;
    }

    if (selectedFields.some(field => !field.name.trim())) {
      alert('Tüm JSON alanlarına isim vermelisiniz.');
      return;
    }

    setTesting(true);
    try {
      const result = await api.previewExtractionResult(selectedScenarioId, {
        flowDefinitionId: form.flowDefinitionId,
        sourceMode: form.sourceMode,
        captureUrl: form.sourceMode === 'NavigateToUrl' ? form.captureUrl.trim() : undefined,
        expandInteractiveElements: form.expandInteractiveElements,
        showBrowser: form.showBrowser,
        returnMany: false,
        fields: selectedFields.map(field => ({
          ...field,
          name: field.name.trim(),
          label: field.label.trim() || field.name.trim(),
        })),
      });

      setTestedResult(result);
      setPreviewPageUrl(result.pageUrl || previewPageUrl);
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err, 'Seçilen alanlar test edilirken hata oluştu.'));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenarioId || !form.flowDefinitionId) {
      alert('Lütfen akış seçin.');
      return;
    }

    if (selectedFields.length === 0) {
      alert('Kaydedilecek en az bir alan seçin.');
      return;
    }

    if (selectedFields.some(field => !field.name.trim())) {
      alert('Tüm JSON alanlarına isim vermelisiniz.');
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
          label: field.label.trim() || field.name.trim(),
        })),
      });
      await refreshExtraction(selectedScenarioId);
      alert('Response alanları kaydedildi.');
    } catch (err) {
      console.error(err);
      alert('Kaydetme sırasında hata oluştu.');
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
            <h3>Response Alanları</h3>
            <p className="muted">Son sayfadaki gerçek içerikleri tara, istediklerini tıkla ve JSON alanı olarak kaydet.</p>
          </div>
        </div>
        <div className="breadcrumb-bar">
          <span className="breadcrumb-item"><i className="bi bi-journal-text"></i> {scenario?.name}</span>
          <i className="bi bi-chevron-right breadcrumb-sep"></i>
          <span className="breadcrumb-item active">Response Alanları</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="form-stack">
        <div className="glass-card">
          <h4><i className="bi bi-diagram-3"></i> Tarama Kaynağı</h4>
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
                <option value="CurrentContext">Akış bittikten sonraki mevcut sayfa</option>
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
                placeholder="https://... veya {{degisken}}"
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
                  <strong>Genişletilebilir alanları açmayı dene</strong>
                  <p className="muted">Liste ve dropdown içerikleri mümkünse açılır.</p>
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
                  <p className="muted">Tarama sırasında canlı tarayıcı açılır.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-modern" type="button" onClick={handleScan} disabled={scanLoading}>
              <i className={`bi ${scanLoading ? 'bi-hourglass-split' : 'bi-search'}`}></i>
              {scanLoading ? 'Taranıyor...' : 'Response Alanlarını Tara'}
            </button>
            <button className="btn-outline-modern" type="button" onClick={handleTest} disabled={testing || selectedFields.length === 0}>
              <i className={`bi ${testing ? 'bi-hourglass-split' : 'bi-braces'}`}></i>
              {testing ? 'JSON test ediliyor...' : 'Seçilen JSON Alanlarını Test Et'}
            </button>
          </div>

          <div className="info-box-modern mt-4">
            <i className="bi bi-funnel"></i>
            <div>
              <h4>Tarama Mantığı</h4>
              <p>Menü ve buton metinleri yerine, input içerikleri, seçili değerler, liste satırları ve veri taşıyan alanlar öne çıkarılır.</p>
            </div>
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
              <h4><i className="bi bi-search"></i> Bulunan İçerikler</h4>
              <span className="count-badge">{filteredCandidates.length}</span>
            </div>

            <div className="form-group">
              <label>İçerik Ara</label>
              <input
                type="text"
                className="modern-input"
                value={scanQuery}
                onChange={e => setScanQuery(e.target.value)}
                placeholder="örnek: plaka, teklif, tc, fiyat..."
              />
            </div>

            <div className="form-stack">
              <div className="grid-two">
                <div className="form-group">
                  <label>Manuel JSON Alanı</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={manualField.name}
                    onChange={e => setManualField(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ornek: net_prim"
                  />
                </div>

                <div className="form-group">
                  <label>Selector Tipi</label>
                  <select
                    className="modern-input"
                    value={manualField.selectorType}
                    onChange={e => setManualField(prev => ({ ...prev, selectorType: Number(e.target.value) as T.SelectorType }))}
                  >
                    {selectorTypeOptions.map(selectorType => (
                      <option key={selectorType} value={selectorType}>
                        {T.SelectorTypeLabels[selectorType]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-two">
                <div className="form-group">
                  <label>Selector Değeri</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={manualField.selectorValue}
                    onChange={e => setManualField(prev => ({ ...prev, selectorValue: e.target.value }))}
                    placeholder="ornek: ctl20_txtNetPrim"
                  />
                </div>

                <div className="form-group">
                  <label>Veri Tipi</label>
                  <select
                    className="modern-input"
                    value={manualField.valueSourceType}
                    onChange={e => {
                      const valueSourceType = e.target.value as T.ExtractionValueSourceType;
                      setManualField(prev => ({
                        ...prev,
                        valueSourceType,
                        attributeName: valueSourceType === 'AttributeValue' ? prev.attributeName : '',
                      }));
                    }}
                  >
                    {valueSourceOptions.map(valueSourceType => (
                      <option key={valueSourceType} value={valueSourceType}>
                        {valueSourceLabel(valueSourceType)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {manualField.valueSourceType === 'AttributeValue' && (
                <div className="form-group">
                  <label>Attribute Adı</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={manualField.attributeName}
                    onChange={e => setManualField(prev => ({ ...prev, attributeName: e.target.value }))}
                    placeholder="ornek: value"
                  />
                </div>
              )}

              <div className="form-group checkbox-group-modern">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={manualField.returnMany}
                    onChange={e => setManualField(prev => ({ ...prev, returnMany: e.target.checked }))}
                  />
                  <span className="checkbox-custom"></span>
                  <div>
                    <strong>Çoklu değer döndür</strong>
                    <p className="muted">Liste veya aynı selector ile birden fazla eleman için kullanın.</p>
                  </div>
                </label>
              </div>

              <div className="form-actions">
                <button className="btn-outline-modern" type="button" onClick={addManualField}>
                  <i className="bi bi-plus-lg"></i>
                  Manuel Alan Ekle
                </button>
              </div>
            </div>

            <div className="card-list scrollable">
              {filteredCandidates.map(candidate => {
                const selected = selectedKeys.has(itemKey(candidate));

                return (
                  <div
                    key={`${candidate.id}-${itemKey(candidate)}`}
                    className={`select-card ${selected ? 'selected' : ''}`}
                    onClick={() => toggleCandidate(candidate)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCandidate(candidate);
                      }
                    }}
                  >
                    <div className="select-card-main">
                      <div className="select-card-info">
                        <strong>{candidate.previewValue || 'Değer yok'}</strong>
                        <span className="action-badge">{valueSourceLabel(candidate.valueSourceType)}</span>
                        {candidate.tagName && <span className="action-badge">{candidate.tagName}</span>}
                      </div>
                      <div className="select-card-actions">
                        <button
                          className="icon-btn primary"
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            toggleCandidate(candidate);
                          }}
                          title={selected ? 'Seçimi kaldır' : 'JSON alanı olarak ekle'}
                        >
                          <i className={`bi ${selected ? 'bi-dash-lg' : 'bi-plus-lg'}`}></i>
                        </button>
                      </div>
                    </div>
                    <p className="select-card-desc">
                      {candidate.label}
                      {candidate.attributeName ? ` • @${candidate.attributeName}` : ''}
                    </p>
                    <p className="select-card-desc selector-mono">{candidate.selectorValue}</p>
                  </div>
                );
              })}

              {filteredCandidates.length === 0 && (
                <div className="empty-state">
                  <i className="bi bi-search"></i>
                  <span>Tarama sonrası gösterilecek içerik bulunamadı.</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header-row">
              <h4><i className="bi bi-braces-asterisk"></i> JSON Alanları</h4>
              <span className="count-badge">{selectedFields.length}</span>
            </div>

            <div className="form-stack">
              {selectedFields.map(field => (
                <div key={field.id} className="select-card">
                  <div className="form-group">
                    <label>JSON Alan Adı</label>
                    <input
                      type="text"
                      className="modern-input"
                      value={field.name}
                      onChange={e => updateField(field.id, {
                        name: e.target.value,
                        label: e.target.value,
                      })}
                      placeholder="ornek: teklif_listesi"
                    />
                  </div>

                  <div className="grid-two">
                    <div className="form-group">
                      <label>Selector Tipi</label>
                      <select
                        className="modern-input"
                        value={field.selectorType}
                        onChange={e => updateField(field.id, {
                          selectorType: Number(e.target.value) as T.SelectorType,
                        })}
                      >
                        {selectorTypeOptions.map(selectorType => (
                          <option key={selectorType} value={selectorType}>
                            {T.SelectorTypeLabels[selectorType]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Veri Tipi</label>
                      <select
                        className="modern-input"
                        value={field.valueSourceType}
                        onChange={e => {
                          const valueSourceType = e.target.value as T.ExtractionValueSourceType;
                          updateField(field.id, {
                            valueSourceType,
                            attributeName: valueSourceType === 'AttributeValue' ? field.attributeName : undefined,
                          });
                        }}
                      >
                        {valueSourceOptions.map(valueSourceType => (
                          <option key={valueSourceType} value={valueSourceType}>
                            {valueSourceLabel(valueSourceType)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Selector Değeri</label>
                    <input
                      type="text"
                      className="modern-input"
                      value={field.selectorValue}
                      onChange={e => updateField(field.id, { selectorValue: e.target.value })}
                      placeholder="selector değeri"
                    />
                  </div>

                  {field.valueSourceType === 'AttributeValue' && (
                    <div className="form-group">
                      <label>Attribute Adı</label>
                      <input
                        type="text"
                        className="modern-input"
                        value={field.attributeName || ''}
                        onChange={e => updateField(field.id, { attributeName: e.target.value })}
                        placeholder="ornek: value"
                      />
                    </div>
                  )}

                  <div className="form-group checkbox-group-modern">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={field.returnMany}
                        onChange={e => updateField(field.id, { returnMany: e.target.checked })}
                      />
                      <span className="checkbox-custom"></span>
                      <div>
                        <strong>Çoklu değer döndür</strong>
                        <p className="muted">Aynı selector birden fazla eleman döndürüyorsa açın.</p>
                      </div>
                    </label>
                  </div>

                  <p className="select-card-desc">
                    {candidatePreviewMap.get(itemKey(field)) || field.label}
                  </p>
                  <p className="select-card-desc">
                    {valueSourceLabel(field.valueSourceType)}
                    {field.tagName ? ` • <${field.tagName}>` : ''}
                    {field.attributeName ? ` • @${field.attributeName}` : ''}
                  </p>
                  <p className="select-card-desc selector-mono">{field.selectorValue}</p>

                  <div className="form-actions">
                    <button className="btn-outline-modern" type="button" onClick={() => removeField(field.id)}>
                      Kaldır
                    </button>
                  </div>
                </div>
              ))}

              {selectedFields.length === 0 && (
                <div className="empty-state">
                  <i className="bi bi-braces"></i>
                  <span>Henüz JSON alanı seçmediniz.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header-row">
            <h4><i className="bi bi-code-square"></i> JSON Önizlemesi</h4>
            <span className="action-badge">{testedResult ? 'Canlı test sonucu' : 'Tarama taslağı'}</span>
          </div>
          <pre className="result-pre">{previewJson}</pre>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-modern primary"
            disabled={saving}
          >
            <i className={`bi ${saving ? 'bi-hourglass-split' : 'bi-save'}`}></i>
            {saving ? 'Kaydediliyor...' : 'JSON Alanlarını Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};
