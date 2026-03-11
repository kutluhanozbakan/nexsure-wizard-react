import React, { useEffect } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';

export const CompanyStep: React.FC = () => {
  const { companies, setCompanies, selectedCompanyId, setSelectedCompanyId, resetDownstreamFromCompany } = useWizardState();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ code: '', name: '', baseUrl: '' });

  useEffect(() => {
    if (companies.length === 0) {
      api.listCompanies().then(setCompanies).catch(console.error);
    }
  }, []);

  const selectCompany = (id: string) => {
    setSelectedCompanyId(id);
    resetDownstreamFromCompany();
  };

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) return;

    setLoading(true);
    try {
      const company = await api.createCompany(form);
      setCompanies([company, ...companies]);
      setForm({ code: '', name: '', baseUrl: '' });
      selectCompany(company.id);
    } catch (err) {
      console.error(err);
      alert('Firma oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="panel-header-modern">
        <h3>Firma Yönetimi</h3>
        <p className="muted">İşlem yapmak istediğiniz firmayı seçin veya yeni bir tane oluşturun.</p>
      </div>

      <div className="grid-two">
        <div className="panel-block-modern glass-card">
          <h4>Kayıtlı Firmalar</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map(c => (
              <div 
                key={c.id} 
                className={`premium-select-card ${selectedCompanyId === c.id ? 'selected' : ''}`}
                onClick={() => selectCompany(c.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary">
                      <i className="bi bi-building"></i>
                    </div>
                    <div>
                      <strong className="block text-lg">{c.name}</strong>
                      <span className="text-xs uppercase tracking-wider opacity-60 text-white">Kod: {c.code}</span>
                    </div>
                  </div>
                  {selectedCompanyId === c.id && (
                    <div className="text-success text-xl animate-scale-in">
                      <i className="bi bi-check-circle-fill"></i>
                    </div>
                  )}
                </div>
                <div className="url-badge w-fit mt-2 bg-white/5 border border-white/10">{c.baseUrl || 'URL Belirtilmedi'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-block-modern glass-card">
          <h4>Yeni Firma Tanımla</h4>
          <form onSubmit={createCompany}>
            <div className="form-stack-modern">
              <div className="form-group">
                <label>Firma Kodu</label>
                <input 
                  type="text" 
                  value={form.code} 
                  onChange={e => setForm({...form, code: e.target.value})} 
                  className="modern-input" 
                  placeholder="Örn: FB-001" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Firma Adı</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="modern-input" 
                  placeholder="Örn: FoodBasket Inc" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Base URL</label>
                <input 
                  type="text" 
                  value={form.baseUrl} 
                  onChange={e => setForm({...form, baseUrl: e.target.value})} 
                  className="modern-input" 
                  placeholder="https://example.com" 
                />
              </div>
              <button className="btn-modern w-full" type="submit" disabled={loading}>
                <i className="bi bi-building-add"></i> {loading ? 'Oluşturuluyor...' : 'Firmayı Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
