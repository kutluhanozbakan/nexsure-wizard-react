import React, { useEffect } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';

export const FlowStep: React.FC = () => {
  const { flows, setFlows, selectedScenarioId, selectedFlowId, setSelectedFlowId, resetDownstreamFromFlow } = useWizardState();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', orderNo: 1, startUrl: '', usePreviousFlowContext: false, timeoutMs: 30000 });

  useEffect(() => {
    if (selectedScenarioId) {
      api.listFlowsByScenario(selectedScenarioId).then(res => {
        setFlows(res);
        setForm(f => ({ ...f, orderNo: res.length + 1 }));
      }).catch(console.error);
    }
  }, [selectedScenarioId]);

  const selectFlow = (id: string) => {
    setSelectedFlowId(id);
    resetDownstreamFromFlow();
  };

  const createFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenarioId || !form.name) return;

    setLoading(true);
    try {
      const flow = await api.createFlow({ 
        ...form, 
        scenarioId: selectedScenarioId,
        startUrl: form.startUrl || undefined 
      });
      const updatedFlows = [...flows, flow].sort((a,b) => a.orderNo - b.orderNo);
      setFlows(updatedFlows);
      setForm({ name: '', orderNo: updatedFlows.length + 1, startUrl: '', usePreviousFlowContext: false, timeoutMs: 30000 });
      selectFlow(flow.id);
    } catch (err) {
      console.error(err);
      alert('Akış oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const deleteFlow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteFlow(id);
      setFlows(flows.filter(f => f.id !== id));
      if (selectedFlowId === id) {
        setSelectedFlowId(null);
        resetDownstreamFromFlow();
      }
    } catch (err) {
      console.error(err);
      alert('Silme sırasında hata oluştu.');
    }
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="panel-header-modern">
        <h3>Akış Tanımlama</h3>
        <p className="muted">Senaryonun ana akışlarını yönetin.</p>
      </div>

      <div className="grid-two">
        <div className="panel-block-modern glass-card">
          <h4>Mevcut Akışlar</h4>
          <div className="select-list-modern">
            {flows.map(f => (
              <div 
                key={f.id} 
                className={`select-card-modern ${selectedFlowId === f.id ? 'selected' : ''} flow-item-modern flex justify-between`}
                onClick={() => selectFlow(f.id)}
              >
                <div className="flow-info">
                  <strong>#{f.orderNo} - {f.name}</strong>
                  <div className="url-badge mt-1">{f.startUrl || 'Önceki bağlam'}</div>
                </div>
                <button className="btn-danger btn-sm h-fit self-center" onClick={(e) => deleteFlow(e, f.id)}>
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-block-modern glass-card">
          <h4>Yeni Akış Ekle</h4>
          <form onSubmit={createFlow}>
            <div className="form-stack-modern">
              <div className="form-group">
                <label>Akış Adı</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="modern-input" 
                  placeholder="Örn: Giriş Yap" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Sıra No</label>
                <input 
                  type="number" 
                  value={form.orderNo} 
                  onChange={e => setForm({...form, orderNo: parseInt(e.target.value)})} 
                  className="modern-input" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Başlangıç URL (Opsiyonel)</label>
                <input 
                  type="text" 
                  value={form.startUrl} 
                  onChange={e => setForm({...form, startUrl: e.target.value})} 
                  className="modern-input" 
                  placeholder="https://..." 
                />
              </div>
              <div className="form-group checkbox-group pb-2">
                <label className="checkbox-line flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={form.usePreviousFlowContext} 
                    onChange={e => setForm({...form, usePreviousFlowContext: e.target.checked})} 
                  /> Önceki akış bağlamını kullan
                </label>
              </div>
              <button className="btn-modern w-full" type="submit" disabled={loading}>
                <i className="bi bi-node-plus"></i> {loading ? 'Ekleniyor...' : 'Akış Ekle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
