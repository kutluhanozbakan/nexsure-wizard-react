import React, { useState, useRef, useEffect } from 'react';

interface SearchableDropdownOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: string;
}

interface SearchableDropdownProps {
  options: SearchableDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  deduplicate?: boolean;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seçin...',
  disabled = false,
  deduplicate = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Deduplicate options by label if requested
  const processedOptions = deduplicate
    ? options.filter((opt, idx, arr) => arr.findIndex(o => o.label === opt.label) === idx)
    : options;

  const filtered = processedOptions.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = processedOptions.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`searchable-dropdown ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      {/* Display selected value or placeholder */}
      <div className="sd-display" onClick={handleOpen}>
        <span className={selectedOption ? 'sd-value' : 'sd-placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} sd-arrow`}></i>
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="sd-panel">
          <div className="sd-search-box">
            <i className="bi bi-search sd-search-icon"></i>
            <input
              ref={inputRef}
              type="text"
              className="sd-search-input"
              placeholder="Ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="sd-options">
            {filtered.length === 0 && (
              <div className="sd-no-result">Sonuç bulunamadı</div>
            )}
            {filtered.map(opt => (
              <div
                key={opt.value}
                className={`sd-option ${opt.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.icon && <i className={`bi ${opt.icon} sd-opt-icon`}></i>}
                <div className="sd-opt-content">
                  <span className="sd-opt-label">{opt.label}</span>
                  {opt.subLabel && <span className="sd-opt-sub">{opt.subLabel}</span>}
                </div>
                {opt.value === value && <i className="bi bi-check2 sd-opt-check"></i>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
