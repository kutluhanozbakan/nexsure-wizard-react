import React, { useEffect, useState } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';
import * as T from '../../types';

export const ScenarioStep: React.FC = () => {
  const { scenarios, setScenarios, selectedCompanyId, selectedScenarioId, setSelectedScenarioId, resetDownstreamFromScenario } = useWizardState();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    description: '', 
    statusDraftOrPublished: T.StatusDraftOrPublished.Draft 
  });

  useEffect(() => {
    if (selectedCompanyId) {
      loadScenarios();
    }
  }, [selectedCompanyId]);

  const loadScenarios = () => {
    api.listScenariosByCompany(selectedCompanyId!).then(setScenarios).catch(console.error);
  };

  const selectScenario = (id: string) => {
    setSelectedScenarioId(id);
    resetDownstreamFromScenario();
  };

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
      if (selectedScenarioId === id) {
        setSelectedScenarioId(null);
        resetDownstreamFromScenario();
      }
    } catch (err) {
      console.error(err);
      alert('Silme sırasında hata oluştu.');
    }
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="panel-header-modern">
        <h3>Senaryo Yönetimi</h3>
        <p className="muted">İş akışlarını gruplayan ana senaryoları yönetin.</p>
      </div>

      <div className="grid-two">
        <div className="panel-block-modern glass-card">
          <div className="flex justify-between items-center mb-4">
            <h4>Kayıtlı Senaryolar</h4>
            <span className="text-xs opacity-50">{scenarios.length} Senaryo</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[500px] pr-2">
            {scenarios.map(s => (
              <div 
                key={s.id} 
                className={`premium-select-card ${selectedScenarioId === s.id ? 'selected' : ''}`}
                onClick={() => selectScenario(s.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedScenarioId === s.id ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'}`}>
                      <i className="bi bi-journal-text"></i>
                    </div>
                    <div>
                      <strong className="block text-lg">{s.name}</strong>
                      <span className={`status-badge text-[10px] px-2 py-0.5 rounded-full ${s.statusDraftOrPublished === 0 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                        {s.statusDraftOrPublished === 0 ? 'TASLAK' : 'YAYINDA'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                      onClick={(e) => startEdit(e, s)}
                      title="Düzenle"
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button 
                      className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                      onClick={(e) => deleteScenario(e, s.id)}
                      title="Sil"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                    {selectedScenarioId === s.id && (
                      <div className="text-success text-xl animate-scale-in ml-2">
                        <i className="bi bi-check-circle-fill"></i>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm opacity-60 mt-3 line-clamp-2">{s.description || 'Açıklama belirtilmemiş.'}</p>
              </div>
            ))}
            {scenarios.length === 0 && (
              <div className="text-center py-10 opacity-30 italic">
                Henüz senaryo bulunmuyor.
              </div>
            )}
          </div>
        </div>

        <div className="panel-block-modern glass-card h-fit">
          <h4>{editingId ? 'Senaryoyu Düzenle' : 'Yeni Senaryo Oluştur'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-stack-modern">
              <div className="form-group">
                <label>Senaryo Adı</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="modern-input" 
                  placeholder="Örn: Ürün Arama" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  className="modern-input" 
                  placeholder="Senaryo amacını açıkla..." 
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Durum</label>
                <select 
                  value={form.statusDraftOrPublished} 
                  onChange={e => setForm({...form, statusDraftOrPublished: parseInt(e.target.value)})} 
                  className="modern-input"
                >
                  <option value={0}>Taslak</option>
                  <option value={1}>Yayında</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-2">
                {editingId && (
                  <button className="btn-outline-modern flex-1" type="button" onClick={cancelEdit}>
                    İptal
                  </button>
                )}
                <button className={`btn-modern ${editingId ? 'flex-[2]' : 'w-full'}`} type="submit" disabled={loading}>
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

