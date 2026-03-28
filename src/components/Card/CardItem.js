import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isPast, isToday } from 'date-fns';
import Avatar from '../Common/Avatar';
import './CardItem.css';

export default function CardItem({ card, labels, members, onClick, onDelete, isDragging: isDraggingProp }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: !!isDraggingProp });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const cardLabels  = card.labels  || [];
  const cardMembers = card.members || [];
  const checklists  = card.checklists || [];

  const totalItems    = checklists.reduce((s, cl) => s + (cl.items?.length || 0), 0);
  const completedItems= checklists.reduce((s, cl) => s + (cl.items?.filter(i => i.is_complete).length || 0), 0);
  const hasChecklist  = totalItems > 0;

  const dueDate      = card.due_date ? new Date(card.due_date) : null;
  const dueOverdue   = dueDate && isPast(dueDate) && !card.due_complete && !isToday(dueDate);
  const dueSoon      = dueDate && (isToday(dueDate) || (dueDate - new Date() < 86400000 * 2));
  const dueComplete  = card.due_complete;

  const hasDesc      = !!card.description;

  const coverStyle   = card.cover_color ? { background: card.cover_color } : null;

  function handleClick(e) { if (onClick) onClick(); }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`card-item ${isDragging ? 'dragging' : ''} ${card.cover_color ? 'has-cover' : ''}`}
      onClick={handleClick}
    >
      {coverStyle && <div className="card-cover" style={coverStyle} />}

      {cardLabels.length > 0 && (
        <div className="card-labels">
          {cardLabels.map(l => (
            <span key={l.id} className="label-pill" style={{ background: l.color }} title={l.name} />
          ))}
        </div>
      )}

      <div className="card-title">{card.title}</div>

      <div className="card-badges">
        {hasDesc && (
          <span className="card-badge" title="Has description">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
        )}
        {dueDate && (
          <span className={`card-badge badge-due ${dueComplete ? 'complete' : dueOverdue ? 'overdue' : dueSoon ? 'soon' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {format(dueDate, 'MMM d')}
          </span>
        )}
        {hasChecklist && (
          <span className={`card-badge badge-checklist ${completedItems === totalItems ? 'complete' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            {completedItems}/{totalItems}
          </span>
        )}
      </div>

      {cardMembers.length > 0 && (
        <div className="card-members">
          {cardMembers.slice(0, 4).map(m => <Avatar key={m.id} member={m} size="sm" />)}
        </div>
      )}
    </div>
  );
}
