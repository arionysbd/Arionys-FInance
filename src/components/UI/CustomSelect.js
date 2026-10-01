import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ options, value, onChange, placeholder = "Select...", required = false, error = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-select-container" ref={containerRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''} ${!value ? 'empty' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="selected-text">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </div>

      {/* Hidden input to handle required validation seamlessly */}
      {required && (
          <input 
              type="text" 
              tabIndex={-1} 
              required={required} 
              value={value || ''} 
              onChange={() => {}} 
              style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} 
          />
      )}

      {isOpen && (
        <div className="custom-select-dropdown animate-pop-in">
          {options.length === 0 ? (
            <div className="custom-select-empty">No options available</div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.value}
                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <div className="opt-label">
                    {opt.label}
                    {opt.subtext && <span className="opt-subtext">{opt.subtext}</span>}
                </div>
                {value === opt.value && <Check size={16} className="check-icon" />}
              </div>
            ))
          )}
        </div>
      )}

      <style jsx>{`
        .custom-select-container {
          position: relative;
          width: 100%;
        }
        .custom-select-trigger {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          color: var(--foreground);
          font-size: 0.9375rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
        }
        .custom-select-trigger.empty {
          color: #94a3b8;
        }
        .custom-select-trigger:hover {
          border-color: #cbd5e1;
        }
        .custom-select-trigger.open {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .custom-select-trigger.error {
          border-color: #ef4444;
        }
        .chevron {
          color: #94a3b8;
          transition: transform 0.2s ease;
        }
        .chevron.rotated {
          transform: rotate(180deg);
        }
        .custom-select-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          z-index: 9999;
          max-height: 250px;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .custom-select-empty {
          padding: 0.75rem 1rem;
          color: #94a3b8;
          font-size: 0.875rem;
          text-align: center;
        }
        .custom-select-option {
          padding: 0.625rem 0.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.15s ease;
          margin-bottom: 2px;
        }
        .custom-select-option:hover {
          background: #f1f5f9;
        }
        .custom-select-option.selected {
          background: #eef2ff;
          color: #4f46e5;
          font-weight: 600;
        }
        .opt-label {
          display: flex;
          flex-direction: column;
          font-size: 0.875rem;
          color: #1e293b;
        }
        .custom-select-option.selected .opt-label {
          color: #4f46e5;
        }
        .opt-subtext {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 400;
          margin-top: 2px;
        }
        .check-icon {
          color: #4f46e5;
          flex-shrink: 0;
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
}
