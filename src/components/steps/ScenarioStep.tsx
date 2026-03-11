import React, { useEffect, useState } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import * as T from '../../types';

export const ScenarioStep: React.FC = () => {
  const { scenarios, setScenarios, selectedCompanyId, selectedScenarioId, selectScenario, companies } = useWizardState();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    statusDraftOrPublished: T.StatusDraftOrPublished.Draft
  });

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  useEffect(() => {
    if (selectedCompanyId) {
      api.listScenariosByCompany(selectedCompanyId).then(setScenarios).catch(console.error);
    }
  }, [selectedCompanyId, setScenarios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !form.name) return;

    setLoading(true);
    try {
      if (editingId) {
        const updated = await api.updateScenario(editingId, {
          ...form,
          isActive: true
        });
        setScenarios(scenarios.map(s => s.id === editingId ? updated : s));
        setEditingId(null);
      } else {
        const scenario = await api.createScenario({
          ...form,
          companyId: selectedCompanyId
        });
        setScenarios([scenario, ...scenarios]);
        selectScenario(scenario.id);
      }
      setForm({ name: '', description: '', statusDraftOrPublished: T.StatusDraftOrPublished.Draft });
    } catch (err) {
      console.error(err);
      alert('İşlem sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (e: React.MouseEvent, s: T.Scenario) => {
    e.stopPropagation();
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description,
      statusDraftOrPublished: s.statusDraftOrPublished
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', description: '', statusDraftOrPublished: T.StatusDraftOrPublished.Draft });
  };

  const deleteScenario = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Bu senaryoyu silmek istediğinize emin misiniz?')) return;

    try {
      await api.deleteScenario(id);
      setScenarios(scenarios.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      alert('Silme sırasında hata oluştu.');
    }
  };

  return (
    <div className="panel-view animate-fade-in">
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-journal-text panel-title-icon"></i>
          <div>
            <h3>Senaryo Yönetimi</h3>
            <p className="muted">
              {selectedCompany ? `${selectedCompany.name} firmasına ait senaryolar` : 'Firmaya ait senaryoları yönetin.'}
            </p>
          </div>
        </div>
        {selectedCompany && (
          <div className="breadcrumb-bar">
            <span className="breadcrumb-item"><i className="bi bi-building"></i> {selectedCompany.name}</span>
            <i className="bi bi-chevron-right breadcrumb-sep"></i>
            <span className="breadcrumb-item active">Senaryolar</span>
          </div>
        )}
      </div>

      <div className="grid-two">
        <div className="glass-card">
          <div className="card-header-row">
            <h4><i className="bi bi-list-ul"></i> Kayıtlı Senaryolar</h4>
            <span className="count-badge">{scenarios.length}</span>
          </div>
          <div className="card-list scrollable">
            {scenarios.map(s => (
              <div
                key={s.id}
                className={`select-card ${selectedScenarioId === s.id ? 'selected' : ''}`}
                onClick={() => selectScenario(s.id)}
              >
                <div className="select-card-main">
                  <div className={`select-card-icon ${selectedScenarioId === s.id ? 'active' : ''}`}>
                    <i className="bi bi-journal-text"></i>
                  </div>
                  <div className="select-card-info">
                    <strong>{s.name}</strong>
                    <span className={`status-pill ${s.statusDraftOrPublished === 0 ? 'draft' : 'published'}`}>
                      {s.statusDraftOrPublished === 0 ? 'TASLAK' : 'YAYINDA'}
                    </span>
                  </div>
                  <div className="select-card-actions">
                    <button 
                      className="icon-btn primary" 
                      onClick={(e) => { e.stopPropagation(); selectScenario(s.id, 'extraction'); }} 
                      title="Sonuç Tanımla"
                    >
                      <i className="bi bi-box-arrow-in-right"></i>
                    </button>
                    <button className="icon-btn edit" onClick={(e) => startEdit(e, s)} title="Düzenle">
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button className="icon-btn danger" onClick={(e) => deleteScenario(e, s.id)} title="Sil">
                      <i className="bi bi-trash"></i>
                    </button>
                    {selectedScenarioId === s.id && (
                      <i className="bi bi-check-circle-fill select-card-check"></i>
                    )}
                  </div>
                </div>
                <p className="select-card-desc">{s.description || 'Açıklama belirtilmemiş.'}</p>
              </div>
            ))}
            {scenarios.length === 0 && (
              <div className="empty-state">
                <i className="bi bi-journal-text"></i>
                <span>Henüz senaryo bulunmuyor.</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card sticky-form">
          <h4><i className={`bi ${editingId ? 'bi-pencil' : 'bi-plus-circle'}`}></i> {editingId ? 'Senaryoyu Düzenle' : 'Yeni Senaryo Oluştur'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-stack">
              <div className="form-group">
                <label>Senaryo Adı</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="modern-input"
                  placeholder="Örn: Trafik Sigortası Al"
                  required
                />
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="modern-input"
                  placeholder="Senaryo amacını açıklayın..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Durum</label>
                <select
                  value={form.statusDraftOrPublished}
                  onChange={e => setForm({ ...form, statusDraftOrPublished: parseInt(e.target.value) })}
                  className="modern-input"
                >
                  <option value={0}>Taslak</option>
                  <option value={1}>Yayında</option>
                </select>
              </div>

              <div className="form-actions">
                {editingId && (
                  <button className="btn-outline-modern" type="button" onClick={cancelEdit}>
                    İptal
                  </button>
                )}
                <button className={`btn-modern ${editingId ? '' : 'w-full'}`} type="submit" disabled={loading}>
                  <i className={`bi ${editingId ? 'bi-check-lg' : 'bi-file-earmark-plus'}`}></i>
                  {loading ? 'İşleniyor...' : (editingId ? 'Güncelle' : 'Senaryo Ekle')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
