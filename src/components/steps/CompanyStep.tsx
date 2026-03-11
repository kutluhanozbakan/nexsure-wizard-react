import React, { useEffect } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';

export const CompanyStep: React.FC = () => {
  const { companies, setCompanies, selectedCompanyId, selectCompany, loadCompanies } = useWizardState();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ code: '', name: '', baseUrl: '' });

  useEffect(() => {
    if (companies.length === 0) {
      loadCompanies();
    }
  }, []);

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
    <div className="panel-view animate-fade-in">
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-building panel-title-icon"></i>
          <div>
            <h3>Firma Yönetimi</h3>
            <p className="muted">İşlem yapmak istediğiniz firmayı seçin veya yeni bir tane oluşturun.</p>
          </div>
        </div>
      </div>

      <div className="grid-two">
        <div className="glass-card">
          <h4><i className="bi bi-list-ul"></i> Kayıtlı Firmalar</h4>
          <div className="card-list">
            {companies.map(c => (
              <div
                key={c.id}
                className={`select-card ${selectedCompanyId === c.id ? 'selected' : ''}`}
                onClick={() => selectCompany(c.id)}
              >
                <div className="select-card-main">
                  <div className="select-card-icon">
                    <i className="bi bi-building"></i>
                  </div>
                  <div className="select-card-info">
                    <strong>{c.name}</strong>
                    <span className="code-tag">Kod: {c.code}</span>
                  </div>
                  {selectedCompanyId === c.id && (
                    <i className="bi bi-check-circle-fill select-card-check"></i>
                  )}
                </div>
                <div className="url-badge">{c.baseUrl || 'URL Belirtilmedi'}</div>
              </div>
            ))}
            {companies.length === 0 && (
              <div className="empty-state">
                <i className="bi bi-building"></i>
                <span>Henüz firma bulunmuyor.</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h4><i className="bi bi-plus-circle"></i> Yeni Firma Tanımla</h4>
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
