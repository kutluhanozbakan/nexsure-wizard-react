import React from 'react';
import { useWizardState } from '../../WizardContext';

export const HomeView: React.FC = () => {
  const { companies, setActiveView, loadCompanies } = useWizardState();

  React.useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div className="home-view animate-fade-in">
      <div className="home-hero">
        <div className="home-hero-icon">
          <i className="bi bi-robot"></i>
        </div>
        <h2>Nexsure Oto'ya Hoş Geldiniz</h2>
        <p className="muted">
          Web otomasyon senaryolarınızı oluşturun, düzenleyin ve çalıştırın.
        </p>
      </div>

      <div className="home-stats">
        <div className="stat-card glass-card" onClick={() => setActiveView('company')}>
          <div className="stat-icon"><i className="bi bi-building"></i></div>
          <div className="stat-info">
            <span className="stat-number">{companies.length}</span>
            <span className="stat-label">Firma</span>
          </div>
        </div>
        <div className="stat-card glass-card" onClick={() => setActiveView('execution')}>
          <div className="stat-icon execution-icon"><i className="bi bi-play-circle"></i></div>
          <div className="stat-info">
            <span className="stat-label">Çalıştır</span>
          </div>
        </div>
      </div>

      <div className="home-guide glass-card">
        <h4><i className="bi bi-info-circle"></i> Nasıl Kullanılır?</h4>
        <div className="guide-steps">
          <div className="guide-step">
            <span className="guide-num">1</span>
            <div>
              <strong>Firma Ekleyin</strong>
              <p>Sol panelden firma oluşturun veya mevcut firmayı seçin.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="guide-num">2</span>
            <div>
              <strong>Senaryo Tanımlayın</strong>
              <p>Firma altına "Trafik Sigortası Al" gibi senaryolar ekleyin.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="guide-num">3</span>
            <div>
              <strong>Akış Oluşturun</strong>
              <p>Her senaryoda sıralı akışlar belirleyin.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="guide-num">4</span>
            <div>
              <strong>HTML Yükleyin & Adım Ekleyin</strong>
              <p>Her akışa HTML yapıştırıp, etkileşim adımlarını tanımlayın.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="guide-num">5</span>
            <div>
              <strong>Çalıştırın</strong>
              <p>Hazır senaryoyu seçip otomasyonu başlatın.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
