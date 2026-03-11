import React, { useEffect } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';

export const CompanyStep: React.FC = () => {
  const { setCompanies, companies, selectCompany, loadCompanies, setActiveView } = useWizardState();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ code: '', name: '', baseUrl: '' });

  useEffect(() => {
    if (companies.length === 0) {
      loadCompanies();
    }
  }, [companies.length, loadCompanies]);

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) return;

    setLoading(true);
    try {
      const company = await api.createCompany(form);
      setCompanies([company, ...companies]);
      setForm({ code: '', name: '', baseUrl: '' });
      // After creating, the context selectCompany will navigate to 'scenario' panel
      selectCompany(company.id);
    } catch (err) {
      console.error(err);
      alert('Firma oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-view animate-fade-in">
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-building panel-title-icon"></i>
          <div>
            <h3>Yeni Firma Tanımla</h3>
            <p className="muted">Sisteme yeni bir sigorta firması veya kurum ekleyin.</p>
          </div>
        </div>
      </div>

      <div className="centered-form-container">
        <div className="glass-card max-w-lg">
          <h4><i className="bi bi-plus-circle"></i> Firma Bilgileri</h4>
          <form onSubmit={createCompany}>
            <div className="form-stack">
              <div className="form-group">
                <label>Firma Kodu</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
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
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="modern-input"
                  placeholder="Örn: Nexsure Insurance"
                  required
                />
              </div>
              <div className="form-group">
                <label>Base URL</label>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={e => setForm({ ...form, baseUrl: e.target.value })}
                  className="modern-input"
                  placeholder="https://example.com"
                />
              </div>
              <div className="form-actions">
                <button
                  className="btn-outline-modern"
                  type="button"
                  onClick={() => setActiveView('home')}
                >
                  İptal
                </button>
                <button className="btn-modern flex-1" type="submit" disabled={loading}>
                  <i className="bi bi-building-add"></i> {loading ? 'Oluşturuluyor...' : 'Firmayı Kaydet'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
