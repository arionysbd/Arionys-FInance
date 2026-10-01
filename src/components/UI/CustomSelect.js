import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * App-wide dropdown used instead of the native <select>.
 *
 * options: [{ value, label, subtext?, icon? }]
 * icon:    optional leading icon shown inside the trigger
 * size:    'md' (forms) | 'sm' (toolbars / filters)
 */
export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  required = false,
  error = false,
  disabled = false,
  icon = null,
  size = 'md',
  name,
  id,
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Where the list opens: below by default, above when there isn't enough room (e.g. bottom sheets on phones)
  const [placement, setPlacement] = useState({ up: false, maxHeight: 280 });
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const autoId = useId();
  const listId = `${id || autoId}-list`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep the highlighted option visible while navigating with the keyboard
  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelectorAll('[role="option"]')[activeIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const selectedIndex = options.findIndex(opt => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  const open = () => {
    if (disabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const margin = 12;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const wanted = Math.min(280, Math.max(options.length, 1) * 44 + 8);
      const up = spaceBelow < wanted && spaceAbove > spaceBelow;
      setPlacement({ up, maxHeight: Math.max(120, Math.min(280, up ? spaceAbove : spaceBelow)) });
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const choose = (opt) => {
    onChange(opt.value);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (options[activeIndex]) choose(options[activeIndex]);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`cs-container cs-${size}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        className={`cs-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''} ${!selectedOption ? 'empty' : ''} ${icon ? 'has-icon' : ''}`}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={ariaLabel}
      >
        {icon && <span className="cs-icon">{icon}</span>}
        <span className="cs-text">
          {selectedOption?.icon && <span className="cs-option-icon">{selectedOption.icon}</span>}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`cs-chevron ${isOpen ? 'rotated' : ''}`}><ChevronDown size={16} /></span>
      </button>

      {/* Hidden input so native form validation and FormData keep working */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        required={required}
        value={value ?? ''}
        onChange={() => {}}
        className="cs-hidden-input"
      />

      {isOpen && (
        <ul
          className={`cs-dropdown ${placement.up ? 'up' : ''}`}
          role="listbox"
          id={listId}
          ref={listRef}
          style={{ maxHeight: placement.maxHeight }}
        >
          {options.length === 0 ? (
            <li className="cs-empty">No options available</li>
          ) : (
            options.map((opt, i) => {
              const isSelected = value === opt.value;
              return (
                <li
                  key={`${opt.value}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`cs-option ${isSelected ? 'selected' : ''} ${i === activeIndex ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(opt)}
                >
                  {opt.icon && <span className="cs-option-icon">{opt.icon}</span>}
                  <span className="cs-label">
                    <span className="cs-label-main">{opt.label}</span>
                    {opt.subtext && <span className="cs-subtext">{opt.subtext}</span>}
                  </span>
                  {isSelected && <span className="cs-check"><Check size={15} /></span>}
                </li>
              );
            })
          )}
        </ul>
      )}

      <style jsx>{`
        .cs-container { position: relative; width: 100%; }

        .cs-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 0.75rem 0.625rem 0.875rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          color: #0f172a;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cs-sm .cs-trigger { padding: 0.5rem 0.625rem 0.5rem 0.75rem; font-size: 0.8125rem; }
        .cs-trigger:hover:not(:disabled) { border-color: #94a3b8; }
        .cs-trigger:focus-visible,
        .cs-trigger.open { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
        .cs-trigger.error { border-color: #ef4444; }
        .cs-trigger:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; }
        .cs-trigger.empty .cs-text { color: #94a3b8; }

        .cs-icon { display: flex; flex-shrink: 0; color: #94a3b8; }
        .cs-trigger.open .cs-icon { color: #6366f1; }
        .cs-text { flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cs-chevron { display: flex; flex-shrink: 0; color: #94a3b8; transition: transform 0.15s ease; }
        .cs-chevron.rotated { transform: rotate(180deg); }

        .cs-hidden-input { position: absolute; bottom: 0; left: 50%; width: 1px; height: 1px; opacity: 0; pointer-events: none; border: 0; padding: 0; }

        .cs-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 10050;
          min-width: 180px;
          max-height: 280px;
          overflow-y: auto;
          margin: 0;
          padding: 0.25rem;
          list-style: none;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.05);
          animation: cs-in 0.12s ease-out;
        }
        .cs-dropdown.up { top: auto; bottom: calc(100% + 4px); animation-name: cs-in-up; }
        @keyframes cs-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cs-in-up { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        .cs-empty { padding: 0.75rem; text-align: center; font-size: 0.8125rem; color: #94a3b8; }

        .cs-option {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.625rem;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #1e293b;
          cursor: pointer;
        }
        .cs-sm .cs-option { font-size: 0.8125rem; }
        .cs-option.active { background: #f1f5f9; }
        .cs-option.selected { color: #4338ca; font-weight: 600; }
        .cs-option-icon { display: flex; flex-shrink: 0; color: #64748b; }
        .cs-option.selected .cs-option-icon { color: #4f46e5; }
        .cs-label { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .cs-label-main { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cs-subtext { margin-top: 1px; font-size: 0.75rem; font-weight: 400; color: #64748b; }
        .cs-check { display: flex; flex-shrink: 0; color: #4f46e5; }
      `}</style>
    </div>
  );
}
