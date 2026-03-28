import React, { useState, useRef, useEffect } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { listsApi, cardsApi } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import CardItem from '../Card/CardItem';
import './BoardList.css';

export default function BoardList({ list, boardId, labels, members, onCardClick,
  onListUpdate, onListDelete, onCardAdd, onCardDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { notify } = useApp();

  useEffect(() => {
    function handle(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function saveTitle() {
    if (!title.trim() || title === list.title) { setEditingTitle(false); setTitle(list.title); return; }
    try {
      const updated = await listsApi.update(list.id, { title: title.trim() });
      onListUpdate(updated); setEditingTitle(false);
    } catch (e) { notify(e.error || 'Failed to update list', 'error'); }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete list "${list.title}" and all its cards?`)) return;
    try { await listsApi.delete(list.id); onListDelete(list.id); }
    catch (e) { notify(e.error || 'Failed to delete list', 'error'); }
  }

  async function handleAddCard() {
    if (!newCardTitle.trim()) return;
    try {
      const card = await cardsApi.create({ list_id: list.id, board_id: boardId, title: newCardTitle.trim() });
      onCardAdd(card); setNewCardTitle(''); setAddingCard(false);
    } catch (e) { notify(e.error || 'Failed to add card', 'error'); }
  }

  const cardIds = list.cards.map(c => c.id);

  return (
    <div ref={setNodeRef} style={style} className="board-list">
      <div className="list-header" {...attributes} {...listeners}>
        {editingTitle ? (
          <input className="list-title-input" value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(list.title); setEditingTitle(false); } }}
            autoFocus onClick={e => e.stopPropagation()}
          />
        ) : (
          <h3 className="list-title" onClick={() => setEditingTitle(true)}>{list.title}</h3>
        )}
        <div style={{ position: 'relative' }} ref={menuRef} onClick={e => e.stopPropagation()}>
          <button className="list-menu-btn" onClick={() => setMenuOpen(o => !o)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="list-menu">
              <button onClick={() => { setAddingCard(true); setMenuOpen(false); }}>Add card</button>
              <button onClick={() => { setEditingTitle(true); setMenuOpen(false); }}>Edit title</button>
              <div className="divider" />
              <button className="danger" onClick={handleDelete}>Delete this list</button>
            </div>
          )}
        </div>
      </div>

      <div className="list-cards">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {list.cards.map(card => (
            <CardItem
              key={card.id}
              card={card}
              labels={labels}
              members={members}
              onClick={() => onCardClick(card.id)}
              onDelete={() => onCardDelete(card.id)}
            />
          ))}
        </SortableContext>
      </div>

      {addingCard ? (
        <div className="list-add-card-form">
          <textarea className="input" rows={3} value={newCardTitle}
            onChange={e => setNewCardTitle(e.target.value)}
            placeholder="Enter a title or paste a link"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); } if (e.key === 'Escape') setAddingCard(false); }}
            style={{ resize: 'none', marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAddCard}>Add card</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAddingCard(false); setNewCardTitle(''); }}>✕</button>
          </div>
        </div>
      ) : (
        <button className="list-add-card-btn" onClick={() => setAddingCard(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Add a card
        </button>
      )}
    </div>
  );
}
