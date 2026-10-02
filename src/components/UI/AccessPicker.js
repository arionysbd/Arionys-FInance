import React from 'react';
import { PERMISSIONS, EXCLUSIVE_PERMISSION_GROUPS, PERMISSION_REQUIRES } from '@/lib/permissions';

// Keep abilities and the page they depend on consistent (e.g. Manage Employees needs Employees)
const withDependencies = (keys, changedKey, turnedOn) => {
  let result = keys;
  for (const [ability, page] of Object.entries(PERMISSION_REQUIRES)) {
    if (turnedOn && changedKey === ability && !result.includes(page)) result = [...result, page];
    if (!turnedOn && changedKey === page) result = result.filter(k => k !== ability);
  }
  return result;
};

// Turning on one key of an exclusive group (e.g. Office vs Personal Dashboard) turns the others off
const withExclusivity = (keys, justEnabled) => {
  let result = keys;
  for (const group of EXCLUSIVE_PERMISSION_GROUPS) {
    if (group.includes(justEnabled)) result = result.filter(k => k === justEnabled || !group.includes(k));
  }
  return result;
};

/**
 * List of app pages with an on/off switch each, grouped like the sidebar.
 * value:    selected page keys
 * onChange: (keys) => void
 * disabled: read-only view
 */
export default function AccessPicker({ value = [], onChange, disabled = false }) {
  // Pages grouped like the sidebar; abilities (no page of their own) get their own category at the end
  const groups = PERMISSIONS.reduce((acc, p) => {
    (acc[p.href ? p.group : 'Abilities'] ||= []).push(p);
    return acc;
  }, {});
  const abilities = groups.Abilities;
  delete groups.Abilities;
  if (abilities) groups.Abilities = abilities;

  // An ability can only be switched on while the page it belongs to is on
  const requiredPage = (key) => PERMISSION_REQUIRES[key];
  const isLocked = (key) => Boolean(requiredPage(key)) && !value.includes(requiredPage(key));
  const pageLabel = (key) => PERMISSIONS.find(p => p.key === key)?.label;

  const toggle = (key) => {
    if (disabled) return;
    const turningOn = !value.includes(key);
    if (turningOn && isLocked(key)) return;
    const next = turningOn ? withExclusivity([...value, key], key) : value.filter(k => k !== key);
    onChange(withDependencies(next, key, turningOn));
  };

  const toggleGroup = (items) => {
    if (disabled) return;
    const keys = items.map(p => p.key).filter(k => value.includes(k) || !isLocked(k));
    const allOn = keys.length > 0 && keys.every(k => value.includes(k));
    if (allOn) {
      // Turning a page group off also turns off abilities that depend on those pages
      let next = value.filter(k => !keys.includes(k));
      for (const k of keys) next = withDependencies(next, k, false);
      onChange(next);
      return;
    }
    // Enabling a whole group still keeps only one dashboard type
    let next = [...new Set([...value, ...keys])];
    for (const group of EXCLUSIVE_PERMISSION_GROUPS) {
      const keep = group.find(k => value.includes(k)) || group[0];
      next = next.filter(k => k === keep || !group.includes(k));
    }
    onChange(next);
  };

  return (
    <div className="ap">
      <div className="ap-summary">
        <span>
          <strong>{value.length}</strong> of {PERMISSIONS.length} enabled
        </span>
        {!disabled && (
          <div className="ap-bulk">
            <button type="button" onClick={() => onChange(PERMISSIONS.map(p => p.key).filter(k => k !== 'personal_dashboard'))}>Enable all</button>
            <span aria-hidden="true">|</span>
            <button type="button" onClick={() => onChange([])}>Disable all</button>
          </div>
        )}
      </div>

      <div className="ap-list">
        {Object.entries(groups).map(([group, items]) => {
          const onCount = items.filter(p => value.includes(p.key)).length;
          return (
            <section key={group} className="ap-group">
              <header className="ap-group-head">
                <span className="ap-group-title">{group}</span>
                <span className="ap-group-meta">
                  {onCount}/{items.length}
                  {!disabled && (
                    <button type="button" onClick={() => toggleGroup(items)}>
                      {onCount === items.length ? 'Disable' : 'Enable'} group
                    </button>
                  )}
                </span>
              </header>

              {items.map(p => {
                const on = value.includes(p.key);
                const locked = !on && isLocked(p.key);
                return (
                  <label
                    key={p.key}
                    className={`ap-row ${on ? 'on' : ''} ${disabled || locked ? 'readonly' : ''} ${locked ? 'locked' : ''}`}
                    title={locked ? `Turn on ${pageLabel(requiredPage(p.key))} first` : undefined}
                  >
                    <span className="ap-label">{p.label}</span>
                    {p.href
                      ? <span className="ap-path">{p.href}</span>
                      : <span className="ap-ability">Needs {pageLabel(requiredPage(p.key))}</span>}
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={on}
                      aria-label={p.label}
                      checked={on}
                      disabled={disabled || locked}
                      onChange={() => toggle(p.key)}
                    />
                    <span className="ap-switch" aria-hidden="true"><span className="ap-knob" /></span>
                  </label>
                );
              })}
            </section>
          );
        })}
      </div>

      <style jsx>{`
        .ap { display: flex; flex-direction: column; gap: 0.875rem; }

        .ap-summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: 0.8125rem; color: #64748b; }
        .ap-summary strong { color: #0f172a; font-weight: 800; }
        .ap-bulk { display: flex; align-items: center; gap: 0.5rem; color: #cbd5e1; }
        .ap-bulk button,
        .ap-group-meta button { padding: 0; border: none; background: none; font-family: inherit; font-size: 0.8125rem; font-weight: 600; color: #4f46e5; cursor: pointer; }
        .ap-bulk button:hover,
        .ap-group-meta button:hover { text-decoration: underline; }

        /* Two columns of category cards */
        .ap-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; align-items: start; }
        .ap-group { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff; }
        .ap-group-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.5rem 1rem; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
        .ap-group-title { font-size: 0.6875rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .ap-group-meta { display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; font-weight: 600; color: #94a3b8; }
        .ap-group-meta button { font-size: 0.75rem; }

        .ap-row.locked .ap-label { color: #94a3b8; }
        .ap-row.locked .ap-switch { opacity: 0.45; }
        .ap-row { position: relative; display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.15s; }
        .ap-row + .ap-row { border-top: 1px solid #f1f5f9; }
        .ap-row:hover:not(.readonly) { background: #fafbff; }
        .ap-row.readonly { cursor: default; }

        
        .ap-label { flex: 1; min-width: 0; font-size: 0.875rem; font-weight: 600; color: #0f172a; }
        .ap-row:not(.on) .ap-label { color: #475569; }
        .ap-ability { flex-shrink: 0; padding: 0.0625rem 0.4375rem; border-radius: 4px; background: #f1f5f9; color: #64748b; font-size: 0.6875rem; font-weight: 600; }
        .ap-path { flex-shrink: 1; min-width: 0; max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.6875rem; color: #94a3b8; }

        .ap-row input { position: absolute; opacity: 0; pointer-events: none; }
        .ap-switch { flex-shrink: 0; position: relative; width: 36px; height: 20px; border-radius: 999px; background: #cbd5e1; transition: background 0.15s; }
        .ap-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25); transition: transform 0.15s; }
        .ap-row.on .ap-switch { background: #4f46e5; }
        .ap-row.on .ap-knob { transform: translateX(16px); }
        .ap-row.readonly .ap-switch { opacity: 0.6; }
        .ap-row:has(input:focus-visible) .ap-switch { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }

        @media (max-width: 760px) {
          .ap-list { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .ap-path { display: none; }
          .ap-summary { flex-direction: column; align-items: flex-start; gap: 0.375rem; }
        }
      `}</style>
    </div>
  );
}
