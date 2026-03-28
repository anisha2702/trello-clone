import React, { useState, useRef, useEffect } from 'react';
import Avatar from '../Common/Avatar';
import './FilterBar.css';

export default function FilterBar({ board, filters, setFilters }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const hasFilters = filters.labels.length || filters.members.length || filters.due;

  function toggleLabel(id) {
    setFilters(f => ({ ...f, labels: f.labels.includes(id) ? f.labels.filter(l => l !== id) : [...f.labels, id] }));
  }
  function toggleMember(id) {
    setFilters(f => ({ ...f, members: f.members.includes(id) ? f.members.filter(m => m !== id) : [...f.members, id] }));
  }
  function clearAll() { setFilters({ labels: [], members: [], due: '' }); }

  return (
    <div className="filter-bar" ref={ref}>
      <button className={`board-header-action ${hasFilters ? 'active' : ''}`} onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filters {hasFilters ? `(${filters.labels.length + filters.members.length + (filters.due ? 1 : 0)})` : ''}
      </button>

      {hasFilters && (
        <button className="board-header-action" onClick={clearAll}>Clear filters</button>
      )}

      {open && (
        <div className="filter-popover">
          <div className="popover-header">
            Filter cards
            <button className="popover-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="filter-body">
            <div className="filter-section">
              <div className="filter-label">Members</div>
              <div className="filter-members">
                {(board.members || []).map(m => (
                  <div key={m.id} className={`filter-member ${filters.members.includes(m.id) ? 'selected' : ''}`}
                    onClick={() => toggleMember(m.id)}>
                    <Avatar member={m} size="sm" showTooltip={false} />
                    <span>{m.name}</span>
                    {filters.members.includes(m.id) && <span className="check">✓</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="divider" />
            <div className="filter-section">
              <div className="filter-label">Labels</div>
              <div className="filter-labels">
                {(board.labels || []).map(l => (
                  <div key={l.id} className={`filter-label-item ${filters.labels.includes(l.id) ? 'selected' : ''}`}
                    onClick={() => toggleLabel(l.id)}>
                    <span className="filter-label-swatch" style={{ background: l.color }} />
                    <span>{l.name}</span>
                    {filters.labels.includes(l.id) && <span className="check">✓</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="divider" />
            <div className="filter-section">
              <div className="filter-label">Due date</div>
              {['', 'overdue', 'today'].map(v => (
                <div key={v} className={`filter-due-item ${filters.due === v ? 'selected' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, due: v }))}>
                  {v === '' ? 'Any' : v === 'overdue' ? '⚠ Overdue' : '📅 Due today'}
                  {filters.due === v && v !== '' && <span className="check">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
