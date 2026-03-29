import React, { useEffect, useState, useRef, useCallback } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { cardsApi } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import Avatar from '../Common/Avatar';
import './CardModal.css';

export default function CardModal({ cardId, boardLabels, boardMembers, onClose, onUpdate, onDelete }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const { notify } = useApp();

  const loadCard = useCallback(async () => {
    try {
      const data = await cardsApi.getById(cardId);
      setCard(data);
    } catch (e) {
      notify('Failed to load card', 'error');
      onClose();
    } finally { setLoading(false); }
  }, [cardId, notify, onClose]);

  useEffect(() => { loadCard(); }, [loadCard]);

  useEffect(() => {
    function handle(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  function patchCard(updates) {
    setCard(c => ({ ...c, ...updates }));
    if (onUpdate) onUpdate({ id: cardId, ...updates });
  }

  async function handleFieldSave(field, value) {
    try {
      const updated = await cardsApi.update(cardId, { [field]: value });
      patchCard(updated);
    } catch (e) { notify(e.error || 'Update failed', 'error'); }
  }

  async function handleDelete() {
    if (!window.confirm('Archive this card?')) return;
    try {
      await cardsApi.delete(cardId);
      onDelete(cardId);
    } catch (e) { notify(e.error || 'Delete failed', 'error'); }
  }

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="spinner" />
      </div>
    </div>
  );
  if (!card) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal card-modal">
        {card.cover_color && <div className="card-modal-cover" style={{ background: card.cover_color }} />}
        <button className="card-modal-close" onClick={onClose}>✕</button>

        <div className="card-modal-body">
          {/* Left column */}
          <div className="card-modal-main">
            <div className="card-modal-labels-row">
              {(card.labels || []).map(l => (
                <span key={l.id} className="label-pill expanded" style={{ background: l.color }}>{l.name}</span>
              ))}
            </div>

            <CardTitle card={card} onSave={v => handleFieldSave('title', v)} />
            <CardDescription card={card} onSave={v => handleFieldSave('description', v)} />
            <CardChecklists card={card} cardId={cardId} onRefresh={loadCard} />
            <CardComments card={card} cardId={cardId} onRefresh={loadCard} />
          </div>

          {/* Right sidebar */}
          <div className="card-modal-sidebar">
            <SidebarSection title="Members">
              <MembersSection card={card} cardId={cardId} boardMembers={boardMembers} onRefresh={loadCard} notify={notify} patchCard={patchCard} />
            </SidebarSection>
            <SidebarSection title="Labels">
              <LabelsSection card={card} cardId={cardId} boardLabels={boardLabels} onRefresh={loadCard} notify={notify} patchCard={patchCard} />
            </SidebarSection>
            <SidebarSection title="Due date">
              <DueDateSection card={card} cardId={cardId} onSave={handleFieldSave} notify={notify} patchCard={patchCard} />
            </SidebarSection>
            <SidebarSection title="Cover">
              <CoverSection card={card} onSave={v => handleFieldSave('cover_color', v)} />
            </SidebarSection>
            <div className="divider" />
            <SidebarSection title="Actions">
              <button className="sidebar-action-btn" onClick={() => {
                cardsApi.addChecklist(cardId, 'Checklist').then(loadCard);
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Checklist
              </button>
              <button className="sidebar-action-btn danger" onClick={handleDelete}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Archive card
              </button>
            </SidebarSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSection({ title, children }) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-title">{title}</div>
      {children}
    </div>
  );
}

function CardTitle({ card, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(card.title);
  useEffect(() => setValue(card.title), [card.title]);

  function save() {
    if (value.trim() && value !== card.title) onSave(value.trim());
    setEditing(false);
  }

  if (editing) return (
    <textarea className="input card-title-editor" value={value}
      onChange={e => setValue(e.target.value)} autoFocus
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === 'Escape') setEditing(false); }}
      rows={2} style={{ fontSize: 20, fontWeight: 600, resize: 'none' }}
    />
  );
  return (
    <h2 className="card-modal-title" onClick={() => setEditing(true)}>{card.title}</h2>
  );
}

function CardDescription({ card, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(card.description || '');
  useEffect(() => setValue(card.description || ''), [card.description]);

  function save() {
    if (value !== (card.description || '')) onSave(value);
    setEditing(false);
  }

  return (
    <div className="card-desc-section">
      <div className="section-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Description
      </div>
      {editing ? (
        <div>
          <textarea className="input" value={value} onChange={e => setValue(e.target.value)}
            autoFocus rows={5} placeholder="Add a more detailed description…" style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setValue(card.description || ''); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className={`card-desc ${!card.description ? 'empty' : ''}`} onClick={() => setEditing(true)}>
          {card.description || 'Add a more detailed description…'}
        </div>
      )}
    </div>
  );
}

function MembersSection({ card, cardId, boardMembers, onRefresh, notify, patchCard }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const cardMemberIds = (card.members || []).map(m => m.id);

  async function toggle(memberId) {
    try {
      if (cardMemberIds.includes(memberId)) {
        await cardsApi.removeMember(cardId, memberId);
      } else {
        await cardsApi.addMember(cardId, memberId);
      }
      await onRefresh();
    } catch (e) { notify(e.error || 'Failed', 'error'); }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {(card.members || []).map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={m.name}>
            <Avatar member={m} size="sm" />
          </div>
        ))}
      </div>
      <button className="sidebar-action-btn" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Assign members
      </button>
      {open && (
        <div className="popover" style={{ top: '100%', left: 0, width: 200, marginTop: 4, zIndex: 300 }}>
          <div className="popover-header">Members<button className="popover-close" onClick={() => setOpen(false)}>✕</button></div>
          <div className="popover-body">
            {boardMembers.map(m => (
              <div key={m.id} className={`member-pick-item ${cardMemberIds.includes(m.id) ? 'selected' : ''}`}
                onClick={() => toggle(m.id)}>
                <Avatar member={m} size="sm" showTooltip={false} />
                <span>{m.name}</span>
                {cardMemberIds.includes(m.id) && <span className="check">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LabelsSection({ card, cardId, boardLabels, onRefresh, notify }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const cardLabelIds = (card.labels || []).map(l => l.id);

  async function toggle(labelId) {
    try {
      if (cardLabelIds.includes(labelId)) await cardsApi.removeLabel(cardId, labelId);
      else await cardsApi.addLabel(cardId, labelId);
      await onRefresh();
    } catch (e) { notify(e.error || 'Failed', 'error'); }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {(card.labels || []).map(l => (
          <span key={l.id} className="label-pill expanded" style={{ background: l.color }}>{l.name}</span>
        ))}
      </div>
      <button className="sidebar-action-btn" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        Edit labels
      </button>
      {open && (
        <div className="popover" style={{ top: '100%', left: 0, width: 220, marginTop: 4, zIndex: 300 }}>
          <div className="popover-header">Labels<button className="popover-close" onClick={() => setOpen(false)}>✕</button></div>
          <div className="popover-body">
            {boardLabels.map(l => (
              <div key={l.id} className={`label-pick-item ${cardLabelIds.includes(l.id) ? 'selected' : ''}`}
                onClick={() => toggle(l.id)}>
                <span className="label-pick-swatch" style={{ background: l.color }} />
                <span>{l.name}</span>
                {cardLabelIds.includes(l.id) && <span className="check">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DueDateSection({ card, cardId, onSave, notify, patchCard }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(card.due_date ? card.due_date.split('T')[0] : '');
  const dueDate = card.due_date ? new Date(card.due_date) : null;
  const overdue = dueDate && isPast(dueDate) && !card.due_complete && !isToday(dueDate);
  const today   = dueDate && isToday(dueDate);

  async function save() {
    await onSave('due_date', value || null);
    setEditing(false);
  }
  async function toggleComplete() {
    await onSave('due_complete', !card.due_complete);
  }

  return (
    <div>
      {dueDate && !editing && (
        <div className="due-date-display">
          <input type="checkbox" checked={!!card.due_complete} onChange={toggleComplete}
            style={{ marginRight: 6, cursor: 'pointer' }} />
          <span className={`due-badge ${card.due_complete ? 'complete' : overdue ? 'overdue' : today ? 'soon' : ''}`}
            onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
            {format(dueDate, 'MMM d, yyyy')}
            {card.due_complete ? ' ✓' : overdue ? ' (overdue)' : today ? ' (today)' : ''}
          </span>
        </div>
      )}
      {editing || !dueDate ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: dueDate ? 6 : 0 }}>
          <input type="date" className="input" value={value} onChange={e => setValue(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
          {editing && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕</button>}
        </div>
      ) : (
        <button className="sidebar-action-btn" onClick={() => setEditing(true)} style={{ marginTop: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Edit due date
        </button>
      )}
    </div>
  );
}

const COVER_COLORS = ['#0052cc','#00875a','#6554c0','#ae2a19','#ff991f','#e2b203','#00b8d9','#c77ad3','#eb5a46','#61bd4f'];

function CoverSection({ card, onSave }) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {COVER_COLORS.map(c => (
          <button key={c} onClick={() => onSave(c === card.cover_color ? null : c)} style={{
            width: 36, height: 24, borderRadius: 4, background: c, border: 'none', cursor: 'pointer',
            outline: card.cover_color === c ? '3px solid #172b4d' : 'none',
          }} />
        ))}
      </div>
      {card.cover_color && (
        <button className="sidebar-action-btn" onClick={() => onSave(null)}>Remove cover</button>
      )}
    </div>
  );
}

function CardChecklists({ card, cardId, onRefresh }) {
  const { notify } = useApp();

  async function toggleItem(clId, itemId, is_complete) {
    try {
      await cardsApi.updateChecklistItem(cardId, clId, itemId, { is_complete });
      onRefresh();
    } catch (e) { notify(e.error || 'Failed', 'error'); }
  }

  async function addItem(clId, title) {
    try {
      await cardsApi.addChecklistItem(cardId, clId, title);
      onRefresh();
    } catch (e) { notify(e.error || 'Failed', 'error'); }
  }

  async function deleteChecklist(clId) {
    try {
      await cardsApi.deleteChecklist(cardId, clId);
      onRefresh();
    } catch (e) { notify(e.error || 'Failed', 'error'); }
  }

  async function deleteItem(clId, itemId) {
    try {
      await cardsApi.deleteChecklistItem(cardId, clId, itemId);
      onRefresh();
    } catch (e) { notify(e.error || 'Failed', 'error'); }
  }

  if (!card.checklists?.length) return null;

  return (
    <div className="card-checklists">
      {card.checklists.map(cl => {
        const total   = cl.items?.length || 0;
        const done    = cl.items?.filter(i => i.is_complete).length || 0;
        const pct     = total ? Math.round((done / total) * 100) : 0;
        return (
          <div key={cl.id} className="checklist-section">
            <div className="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span style={{ flex: 1 }}>{cl.title}</span>
              <button className="btn btn-subtle btn-sm" onClick={() => deleteChecklist(cl.id)}>Delete</button>
            </div>
            <div className="checklist-progress">
              <span className="checklist-pct">{pct}%</span>
              <div className="checklist-bar">
                <div className="checklist-bar-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#1f845a' : 'var(--trello-blue)' }} />
              </div>
            </div>
            {cl.items?.map(item => (
              <div key={item.id} className="checklist-item">
                <input type="checkbox" checked={!!item.is_complete}
                  onChange={e => toggleItem(cl.id, item.id, e.target.checked)} />
                <span className={item.is_complete ? 'item-done' : ''}>{item.title}</span>
                <button className="item-del" onClick={() => deleteItem(cl.id, item.id)}>✕</button>
              </div>
            ))}
            <AddChecklistItem onAdd={title => addItem(cl.id, title)} />
          </div>
        );
      })}
    </div>
  );
}

function AddChecklistItem({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  function submit() { if (title.trim()) { onAdd(title.trim()); setTitle(''); setAdding(false); } }
  if (!adding) return (
    <button className="btn btn-subtle btn-sm" style={{ marginTop: 4 }} onClick={() => setAdding(true)}>Add an item</button>
  );
  return (
    <div style={{ marginTop: 8 }}>
      <input className="input" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Add an item" autoFocus style={{ marginBottom: 6 }}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false); }} />
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn btn-primary btn-sm" onClick={submit}>Add</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
      </div>
    </div>
  );
}

function CardComments({ card, cardId, onRefresh }) {
  const [text, setText] = useState('');
  const { currentMember, notify } = useApp();

  async function submit() {
    if (!text.trim()) return;
    try {
      await cardsApi.addComment(cardId, text.trim());
      setText(''); onRefresh();
    } catch (e) { notify(e.error || 'Failed', 'error'); }
  }

  async function deleteComment(cmId) {
    try { await cardsApi.deleteComment(cardId, cmId); onRefresh(); }
    catch (e) { notify(e.error || 'Failed', 'error'); }
  }

  return (
    <div className="card-comments">
      <div className="section-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Activity
      </div>
      <div className="comment-compose">
        <Avatar member={currentMember} size="sm" />
        <div style={{ flex: 1 }}>
          <textarea className="input" rows={2} value={text} onChange={e => setText(e.target.value)}
            placeholder="Write a comment…" style={{ marginBottom: 4 }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
          {text && <button className="btn btn-primary btn-sm" onClick={submit}>Save</button>}
        </div>
      </div>
      {(card.comments || []).map(cm => (
        <div key={cm.id} className="comment-item">
          <div className="comment-avatar">
            <Avatar member={{ initials: cm.initials, avatar_color: cm.avatar_color, name: cm.member_name }} size="sm" />
          </div>
          <div className="comment-body">
            <div className="comment-author">{cm.member_name}</div>
            <div className="comment-content">{cm.content}</div>
            <div className="comment-actions">
              <button onClick={() => deleteComment(cm.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
