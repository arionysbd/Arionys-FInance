import React from 'react';
import { Check } from 'lucide-react';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * Checklist of app pages, grouped like the sidebar.
 * value:      selected page keys
 * onChange:   (keys) => void
 * grantable:  keys the current user may hand out; others are shown but locked
 */
export default function AccessPicker({ value = [], onChange, grantable = null, disabled = false }) {
  const groups = PERMISSIONS.reduce((acc, p) => {
    (acc[p.group] ||= []).push(p);
    return acc;
  }, {});

  const canGrant = (key) => !grantable || grantable.includes(key);
  const selectable = PERMISSIONS.filter(p => canGrant(p.key)).map(p => p.key);

  const toggle = (key) => {
    if (disabled || !canGrant(key)) return;
    onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key]);
  };

  const selectAll = () => onChange([...new Set([...value, ...selectable])]);
  const clearAll = () => onChange(value.filter(k => !selectable.includes(k)));

  return (
    <div className="ap">
      <div className="ap-toolbar">
        <span className="ap-count">{value.length} of {PERMISSIONS.length} pages selected</span>
        {!disabled && (
          <div className="ap-bulk">
            <button type="button" onClick={selectAll}>Select all</button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={clearAll}>Clear</button>
          </div>
        )}
      </div>

      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="ap-group">
          <p className="ap-group-title">{group}</p>
          <div className="ap-items">
            {items.map(p => {
              const checked = value.includes(p.key);
              const locked = !canGrant(p.key);
              return (
                <label
                  key={p.key}
                  className={`ap-item ${checked ? 'checked' : ''} ${locked || disabled ? 'locked' : ''}`}
                  title={locked ? 'You can only give access to pages you have yourself' : undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked || disabled}
                    onChange={() => toggle(p.key)}
                  />
                  <span className="ap-box">{checked && <Check size={12} strokeWidth={3} />}</span>
                  <span className="ap-text">
                    <span className="ap-label">{p.label}</span>
                    <span className="ap-desc">{p.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <style jsx>{`
        .ap { display: flex; flex-direction: column; gap: 1rem; }
        .ap-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .ap-count { font-size: 0.8125rem; font-weight: 600; color: #64748b; }
        .ap-bulk { display: flex; align-items: center; gap: 0.5rem; color: #cbd5e1; }
        .ap-bulk button { padding: 0; border: none; background: none; font-family: inherit; font-size: 0.8125rem; font-weight: 600; color: #4f46e5; cursor: pointer; }
        .ap-bulk button:hover { text-decoration: underline; }

        .ap-group-title { margin: 0 0 0.5rem; font-size: 0.6875rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .ap-items { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }

        .ap-item { position: relative; display: flex; align-items: flex-start; gap: 0.625rem; padding: 0.625rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
        .ap-item:hover:not(.locked) { border-color: #a5b4fc; }
        .ap-item.checked { border-color: #6366f1; background: #f5f7ff; }
        .ap-item.locked { cursor: not-allowed; opacity: 0.55; }
        .ap-item input { position: absolute; opacity: 0; pointer-events: none; }
        .ap-item:has(input:focus-visible) { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); }

        .ap-box { flex-shrink: 0; width: 16px; height: 16px; margin-top: 1px; display: grid; place-items: center; border: 1.5px solid #cbd5e1; border-radius: 4px; background: #ffffff; color: #ffffff; }
        .ap-item.checked .ap-box { border-color: #4f46e5; background: #4f46e5; }

        .ap-text { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
        .ap-label { font-size: 0.8125rem; font-weight: 600; color: #0f172a; }
        .ap-desc { font-size: 0.75rem; line-height: 1.4; color: #64748b; }

        @media (max-width: 560px) {
          .ap-items { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
