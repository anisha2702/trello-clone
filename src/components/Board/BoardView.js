import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { boardsApi, listsApi, cardsApi } from '../../utils/api';
import { BoardProvider, useBoard } from '../../context/BoardContext';
import { useApp } from '../../context/AppContext';
import BoardList from '../List/BoardList';
import CardItem from '../Card/CardItem';
import CardModal from '../Card/CardModal';
import FilterBar from './FilterBar';
import './BoardView.css';

export default function BoardView() {
  return <BoardProvider><BoardViewInner /></BoardProvider>;
}

function BoardViewInner() {
  const { id } = useParams();
  const { board, loading, error, dispatch, setBoard, setLoading, setError } = useBoard();
  // const { notify } = useApp();
  const [activeCard, setActiveCard] = useState(null);
  const [activeList, setActiveList] = useState(null);
  const [openCardId, setOpenCardId] = useState(null);
  const [filters, setFilters] = useState({ labels: [], members: [], due: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await boardsApi.getById(id);
      setBoard(data);
    } catch (e) {
      setError(e.error || 'Failed to load board');
    }
  }, [id, setBoard, setLoading, setError]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Refresh card after modal updates
  const handleCardUpdate = useCallback((updatedCard) => {
    dispatch({ type: 'UPDATE_CARD', payload: updatedCard });
  }, [dispatch]);

  // DnD handlers
  function findContainer(id) {
    if (!board) return null;
    if (board.lists.find(l => l.id === id)) return id;
    for (const list of board.lists) {
      if (list.cards.find(c => c.id === id)) return list.id;
    }
    return null;
  }

  function onDragStart({ active }) {
    const listMatch = board.lists.find(l => l.id === active.id);
    if (listMatch) { setActiveList(listMatch); return; }
    for (const list of board.lists) {
      const card = list.cards.find(c => c.id === active.id);
      if (card) { setActiveCard(card); return; }
    }
  }

  function onDragOver({ active, over }) {
    if (!over || !board) return;
    const activeContId = findContainer(active.id);
    const overContId   = findContainer(over.id);
    if (!activeContId || !overContId || activeContId === overContId) return;
    // Card moving between lists (preview)
    const activeCont = board.lists.find(l => l.id === activeContId);
    // const overCont   = board.lists.find(l => l.id === overContId);
    if (!activeCont || !overCont) return;
    const card = activeCont.cards.find(c => c.id === active.id);
    if (!card) return;
    const newLists = board.lists.map(l => {
      if (l.id === activeContId) return { ...l, cards: l.cards.filter(c => c.id !== active.id) };
      if (l.id === overContId) {
        const overIdx = l.cards.findIndex(c => c.id === over.id);
        const newCards = [...l.cards];
        newCards.splice(overIdx >= 0 ? overIdx : newCards.length, 0, { ...card, list_id: overContId });
        return { ...l, cards: newCards };
      }
      return l;
    });
    dispatch({ type: 'SET_LISTS_WITH_CARDS', payload: newLists });
  }

  async function onDragEnd({ active, over }) {
    setActiveCard(null); setActiveList(null);
    if (!over || !board) return;

    // List reorder
    if (board.lists.find(l => l.id === active.id)) {
      const oldIdx = board.lists.findIndex(l => l.id === active.id);
      const newIdx = board.lists.findIndex(l => l.id === over.id);
      if (oldIdx !== newIdx) {
        const reordered = arrayMove(board.lists, oldIdx, newIdx);
        dispatch({ type: 'REORDER_LISTS', payload: reordered });
        await listsApi.reorder(reordered.map((l, i) => ({ id: l.id, position: (i + 1) * 1000 })));
      }
      return;
    }

    // Card reorder/move
    const activeContId = findContainer(active.id);
    const overContId   = findContainer(over.id);
    if (!activeContId || !overContId) return;

    const activeCont = board.lists.find(l => l.id === activeContId);
    const overCont   = board.lists.find(l => l.id === overContId);

    if (activeContId === overContId) {
      const oldIdx = activeCont.cards.findIndex(c => c.id === active.id);
      const newIdx = activeCont.cards.findIndex(c => c.id === over.id);
      if (oldIdx !== newIdx) {
        const reordered = arrayMove(activeCont.cards, oldIdx, newIdx);
        dispatch({ type: 'SET_LISTS_WITH_CARDS', payload: board.lists.map(l =>
          l.id === activeContId ? { ...l, cards: reordered } : l
        )});
        await cardsApi.reorder(reordered.map((c, i) => ({ id: c.id, list_id: activeContId, position: (i + 1) * 1000 })));
      }
    } else {
      // Cross-list move — already previewed in onDragOver
      const newLists = board.lists;
      const allCards = [];
      for (const list of newLists) {
        list.cards.forEach((c, i) => allCards.push({ id: c.id, list_id: list.id, position: (i + 1) * 1000 }));
      }
      await cardsApi.reorder(allCards);
    }
  }

  // Filtered lists
  function getFilteredLists() {
    if (!board) return [];
    const hasFilters = filters.labels.length || filters.members.length || filters.due;
    if (!hasFilters) return board.lists;
    return board.lists.map(list => ({
      ...list,
      cards: list.cards.filter(card => {
        if (filters.labels.length) {
          const cardLabelIds = (card.labels || []).map(l => l.id);
          if (!filters.labels.every(id => cardLabelIds.includes(id))) return false;
        }
        if (filters.members.length) {
          const cardMemberIds = (card.members || []).map(m => m.id);
          if (!filters.members.every(id => cardMemberIds.includes(id))) return false;
        }
        if (filters.due === 'overdue') {
          if (!card.due_date || new Date(card.due_date) >= new Date() || card.due_complete) return false;
        } else if (filters.due === 'today') {
          if (!card.due_date) return false;
          const d = new Date(card.due_date);
          const now = new Date();
          if (d.toDateString() !== now.toDateString()) return false;
        }
        return true;
      })
    }));
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1d2125' }}>
      <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
    </div>
  );
  if (error) return <div style={{ padding: 32, color: 'var(--text-primary)' }}>{error}</div>;
  if (!board) return null;

  const filteredLists = getFilteredLists();

  return (
    <div className="board-view" style={{ '--board-bg': board.background_color }}>
      <div className="board-header">
        <div className="board-header-left">
          <Link to="/" className="board-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </Link>
          <h1 className="board-title">{board.title}</h1>
          <button className="board-star-btn" onClick={async () => {
            await boardsApi.update(board.id, { is_starred: !board.is_starred });
            setBoard({ ...board, is_starred: !board.is_starred });
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill={board.is_starred ? '#f5cd47' : 'none'} stroke={board.is_starred ? '#f5cd47' : 'currentColor'} strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        </div>
        <FilterBar board={board} filters={filters} setFilters={setFilters} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="board-canvas">
          <div className="lists-container">
            {filteredLists.map(list => (
              <BoardList
                key={list.id}
                list={list}
                boardId={board.id}
                labels={board.labels || []}
                members={board.members || []}
                onCardClick={setOpenCardId}
                onListUpdate={updated => dispatch({ type: 'UPDATE_LIST', payload: updated })}
                onListDelete={listId => dispatch({ type: 'REMOVE_LIST', payload: listId })}
                onCardAdd={card => dispatch({ type: 'ADD_CARD', payload: card })}
                onCardDelete={cardId => dispatch({ type: 'REMOVE_CARD', payload: cardId })}
              />
            ))}
            <AddListButton boardId={board.id} onAdd={list => dispatch({ type: 'ADD_LIST', payload: list })} />
          </div>
        </div>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
          {activeCard && <CardItem card={activeCard} isDragging labels={[]} members={[]} />}
          {activeList && <div className="list-drag-ghost" style={{ width: 272, height: 48 }} />}
        </DragOverlay>
      </DndContext>

      {openCardId && (
        <CardModal
          cardId={openCardId}
          boardLabels={board.labels || []}
          boardMembers={board.members || []}
          onClose={() => setOpenCardId(null)}
          onUpdate={handleCardUpdate}
          onDelete={cardId => { dispatch({ type: 'REMOVE_CARD', payload: cardId }); setOpenCardId(null); }}
        />
      )}
    </div>
  );
}

function AddListButton({ boardId, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const { notify } = useApp();

  async function handleAdd() {
    if (!title.trim()) return;
    try {
      const list = await listsApi.create({ board_id: boardId, title: title.trim() });
      onAdd(list); setTitle(''); setAdding(false);
    } catch (e) { notify(e.error || 'Failed to add list', 'error'); }
  }

  if (!adding) return (
    <button className="add-list-btn" onClick={() => setAdding(true)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      Add a list
    </button>
  );

  return (
    <div className="add-list-form">
      <input className="input" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Enter list title…" autoFocus
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
      />
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add list</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>✕</button>
      </div>
    </div>
  );
}
