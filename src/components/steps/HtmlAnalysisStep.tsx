import React, { useState } from 'react';
import { useWizardState } from '../../WizardContext';
import { api } from '../../api';

export const HtmlAnalysisStep: React.FC = () => {
  const { selectedFlowId, htmlCandidates, setHtmlCandidates } = useWizardState();
  const [htmlSnippet, setHtmlSnippet] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  React.useEffect(() => {
    if (selectedFlowId) {
      api.listHtmlCandidatesByFlow(selectedFlowId).then(res => {
        setHtmlCandidates(res.sort((a, b) => a.candidateOrder - b.candidateOrder));
      }).catch(console.error);
    }
  }, [selectedFlowId]);

  const performAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlowId || !htmlSnippet) return;

    setAnalyzing(true);
    try {
      const candidates = await api.analyzeHtml(selectedFlowId, { htmlSnippet });
      setHtmlCandidates(candidates.sort((a, b) => a.candidateOrder - b.candidateOrder));
    } catch (err) {
      console.error(err);
      alert('Analiz sırasında hata oluştu.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="panel-header-modern">
        <h3>HTML Analizi</h3>
        <p className="muted">Otomasyonun etkileşime gireceği HTML bloğunu buraya yapıştırın.</p>
      </div>

      <div className="panel-block-modern glass-card full-width">
        <form onSubmit={performAnalysis}>
          <div className="form-stack-modern">
            <div className="form-group">
              <label>HTML Snippet</label>
              <textarea 
                value={htmlSnippet} 
                onChange={e => setHtmlSnippet(e.target.value)} 
                className="modern-input snippet-textarea" 
                placeholder="<button id='...' class='...'>...</button>" 
                style={{ height: '200px', fontFamily: 'monospace' }}
                required
              />
              <div className="textarea-footer mt-1 text-right">
                <small className="muted">{htmlSnippet.length} / 500,000 Karakter</small>
              </div>
            </div>
            <button className="btn-modern" type="submit" disabled={analyzing || !selectedFlowId}>
              <i className="bi bi-magic"></i> {analyzing ? 'Analiz Ediliyor...' : 'Analiz Et'}
            </button>
          </div>
        </form>
      </div>

      {htmlCandidates.length > 0 && (
        <div className="panel-block-modern glass-card full-width mt-4">
          <h4>Bulunan Adaylar ({htmlCandidates.length})</h4>
          <div className="candidate-scroll-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '1rem', 
            maxHeight: '400px', 
            overflowY: 'auto' 
          }}>
            {htmlCandidates.slice(0, 30).map(c => (
              <div key={c.id} className="candidate-card-modern p-3 border rounded border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
                <div className="tag-row flex justify-between mb-2">
                  <span className="tag-label bg-blue-500 text-xs px-2 py-1 rounded">{c.tagName}</span>
                  <span className="type-label text-xs font-bold text-gray-400">{c.suggestedSelectorType}</span>
                </div>
                <div className="selector-value font-mono text-sm break-all mb-1">{c.suggestedSelectorValue}</div>
                <div className="display-text text-xs italic text-gray-400">{c.displayText}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
