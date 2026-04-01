import React, { useEffect } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';

type CompanyFormState = {
  code: string;
  name: string;
  baseUrl: string;
  proxyHost: string;
  proxyPort: string;
  proxyUsername: string;
  proxyPassword: string;
  googleSecretKey: string;
};

const extractErrorMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as any).response?.data;
    if (data?.error) return data.error;
  }
  if (err instanceof Error) return err.message;
  return String(err);
};

const emptyForm = (): CompanyFormState => ({
  code: '',
  name: '',
  baseUrl: '',
  proxyHost: '',
  proxyPort: '',
  proxyUsername: '',
  proxyPassword: '',
  googleSecretKey: '',
});

export const CompanyStep: React.FC = () => {
  const { setCompanies, companies, selectedCompanyId, selectCompany, loadCompanies, setActiveView } = useWizardState();
  const [loading, setLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CompanyFormState>(emptyForm);

  useEffect(() => {
    if (companies.length === 0) {
      loadCompanies();
    }
  }, [companies.length, loadCompanies]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;

    setLoading(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim() || undefined,
        proxyHost: form.proxyHost.trim() || undefined,
        proxyPort: form.proxyPort.trim() ? parseInt(form.proxyPort, 10) : undefined,
        proxyUsername: form.proxyUsername.trim() || undefined,
        proxyPassword: form.proxyPassword.trim() || undefined,
        googleSecretKey: form.googleSecretKey.trim() || undefined,
      };

      if (editingId) {
        const updated = await api.updateCompany(editingId, {
          ...payload,
          isActive: true,
        });
        setCompanies(companies.map(company => company.id === editingId ? updated : company));
      } else {
        const created = await api.createCompany(payload);
        setCompanies([created, ...companies]);
        selectCompany(created.id);
      }

      resetForm();
    } catch (err) {
      console.error(err);
      alert('Firma kaydi sirasinda hata olustu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.deleteCompany(deletingId);
      setCompanies(companies.filter(c => c.id !== deletingId));
      if (selectedCompanyId === deletingId) selectCompany('');
      setDeletingId(null);
    } catch (err) {
      alert('Firma silinirken hata olustu: ' + extractErrorMessage(err));
    }
  };

  const startEdit = (companyId: string) => {
    const company = companies.find(item => item.id === companyId);
    if (!company) return;

    setEditingId(company.id);
    setForm({
      code: company.code ?? '',
      name: company.name ?? '',
      baseUrl: company.baseUrl ?? '',
      proxyHost: company.proxyHost ?? '',
      proxyPort: company.proxyPort ? String(company.proxyPort) : '',
      proxyUsername: company.proxyUsername ?? '',
      proxyPassword: '',
      googleSecretKey: '',
    });
  };

  return (
    <div className="panel-view animate-fade-in">
      <div className="panel-header-modern">
        <div className="panel-title-row">
          <i className="bi bi-building panel-title-icon"></i>
          <div>
            <h3>Firma Yonetimi</h3>
            <p className="muted">Firma erisim bilgilerini, proxy ayarlarini ve runtime TOTP secret alanlarini yonetin.</p>
          </div>
        </div>
      </div>

      <div className="grid-two">
        <div className="glass-card">
          <div className="card-header-row">
            <h4><i className="bi bi-list-ul"></i> Kayitli Firmalar</h4>
            <span className="count-badge">{companies.length}</span>
          </div>

          <div className="card-list scrollable">
            {companies.map(company => (
              <div
                key={company.id}
                className={`select-card ${selectedCompanyId === company.id ? 'selected' : ''}`}
                onClick={() => selectCompany(company.id)}
              >
                <div className="select-card-main">
                  <div className={`select-card-icon ${selectedCompanyId === company.id ? 'active' : ''}`}>
                    <i className="bi bi-building"></i>
                  </div>

                  <div className="select-card-info">
                    <strong>{company.name}</strong>
                    <span className="selector-mono">{company.code}</span>
                    <span className="select-card-desc">
                      {company.baseUrl || 'Base URL tanimli degil'}
                    </span>
                  </div>

                  <div className="select-card-actions">
                    <button
                      className="icon-btn edit"
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        startEdit(company.id);
                      }}
                      title="Firmayi duzenle"
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button
                      className="icon-btn delete"
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setDeletingId(company.id);
                      }}
                      title="Firmayi sil"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>

                <div className="mini-badges">
                  <span className={`mini-badge ${company.proxyHost ? 'info' : 'warning'}`}>
                    {company.proxyHost ? 'Proxy Tanimli' : 'Proxy Yok'}
                  </span>
                  <span className={`mini-badge ${company.proxyUsername ? 'success' : 'warning'}`}>
                    {company.proxyUsername ? 'Proxy User Var' : 'Proxy User Yok'}
                  </span>
                </div>
              </div>
            ))}

            {companies.length === 0 && (
              <div className="empty-state">
                <i className="bi bi-building"></i>
                <span>Henuz firma bulunmuyor.</span>
              </div>
            )}
          </div>

          {deletingId && (
            <div className="alert-danger-inline">
              <div className="alert-danger-body">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>
                  <strong>Bu firmaya ait tum senaryolar, flowlar, adimlar ve calisma gecmisi kalici olarak silinecek.</strong> Emin misiniz?
                </span>
              </div>
              <div className="alert-danger-actions">
                <button className="btn-modern danger-sm" type="button" onClick={handleDelete}>
                  <i className="bi bi-trash"></i> Evet, Sil
                </button>
                <button className="btn-outline-modern sm" type="button" onClick={() => setDeletingId(null)}>
                  Iptal
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="glass-card sticky-form">
          <h4><i className={`bi ${editingId ? 'bi-pencil' : 'bi-plus-circle'}`}></i> {editingId ? 'Firmayi Duzenle' : 'Yeni Firma Tanimla'}</h4>

          <form onSubmit={handleSubmit}>
            <div className="form-stack">
              <div className="form-group">
                <label>Firma Kodu</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  className="modern-input"
                  placeholder="Orn: FB-001"
                  required
                />
              </div>

              <div className="form-group">
                <label>Firma Adi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="modern-input"
                  placeholder="Orn: Nexsure Insurance"
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

              <div className="form-group">
                <label>Proxy Host</label>
                <input
                  type="text"
                  value={form.proxyHost}
                  onChange={e => setForm({ ...form, proxyHost: e.target.value })}
                  className="modern-input"
                  placeholder="159.146.59.2 veya http://proxy.example"
                />
                <p className="muted small">Doluysa Playwright analiz, extraction ve run isteklerini bu proxy uzerinden acar.</p>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Proxy Port</label>
                  <input
                    type="number"
                    value={form.proxyPort}
                    onChange={e => setForm({ ...form, proxyPort: e.target.value })}
                    className="modern-input"
                    placeholder="3128"
                    min="1"
                  />
                </div>

                <div className="form-group flex-2">
                  <label>Proxy Username</label>
                  <input
                    type="text"
                    value={form.proxyUsername}
                    onChange={e => setForm({ ...form, proxyUsername: e.target.value })}
                    className="modern-input"
                    placeholder="proxy kullanicisi"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Proxy Password</label>
                <input
                  type="password"
                  value={form.proxyPassword}
                  onChange={e => setForm({ ...form, proxyPassword: e.target.value })}
                  className="modern-input"
                  placeholder={editingId ? 'Degistirmek icin yeni sifre girin' : 'proxy sifresi'}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label>Google Secret Key</label>
                <input
                  type="password"
                  value={form.googleSecretKey}
                  onChange={e => setForm({ ...form, googleSecretKey: e.target.value })}
                  className="modern-input"
                  placeholder={editingId ? 'Guncellemek icin yeni secret girin' : 'Authenticator secret key'}
                  autoComplete="off"
                />
                <p className="muted small">
                  Kayit edilir ama geri plaintext donmez. Step icinde <code>{'{{company.totpCode}}'}</code> ile runtime OTP uretilir.
                  {editingId && ' Bos birakirsan mevcut secret korunur.'}
                </p>
              </div>

              <div className="form-actions">
                <button
                  className="btn-outline-modern"
                  type="button"
                  onClick={() => editingId ? resetForm() : setActiveView('home')}
                >
                  {editingId ? 'Iptal' : 'Geri Don'}
                </button>
                <button className="btn-modern flex-1" type="submit" disabled={loading}>
                  <i className={`bi ${editingId ? 'bi-check-lg' : 'bi-building-add'}`}></i>
                  {loading ? 'Kaydediliyor...' : (editingId ? 'Firmayi Guncelle' : 'Firmayi Kaydet')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
