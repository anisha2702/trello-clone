import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { boardsApi } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import './BoardsHome.css';

const BG_COLORS = [
  '#0052cc','#1868db','#0747a6','#00875a','#006644',
  '#ff5630','#de350b','#ff7452','#6554c0','#403294',
  '#00b8d9','#008da6','#36b37e','#ff991f','#ff8b00',
];

export default function BoardsHome() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { notify } = useApp();

  useEffect(() => {
    boardsApi.getAll().then(setBoards).finally(() => setLoading(false));
  }, []);

  async function handleStar(e, board) {
    e.preventDefault(); e.stopPropagation();
    try {
      await boardsApi.update(board.id, { is_starred: !board.is_starred });
      setBoards(bs => bs.map(b => b.id === board.id ? { ...b, is_starred: !b.is_starred } : b));
    } catch (_) {}
  }

  const starred  = boards.filter(b => b.is_starred);
  const rest     = boards.filter(b => !b.is_starred);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="boards-home">
      <div className="boards-home-inner">
        {starred.length > 0 && (
          <section className="boards-section">
            <h2 className="boards-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Starred boards
            </h2>
            <BoardGrid boards={starred} onStar={handleStar} />
          </section>
        )}
        <section className="boards-section">
          <h2 className="boards-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Your boards
          </h2>
          <div className="boards-grid">
            {rest.map(b => <BoardTile key={b.id} board={b} onStar={handleStar} />)}
            <button className="board-tile board-tile-create" onClick={() => setShowCreate(true)}>
              <span>Create new board</span>
            </button>
          </div>
        </section>
      </div>
      {showCreate && <CreateBoardInline onClose={() => setShowCreate(false)}
        onCreated={b => { setBoards(prev => [b, ...prev]); setShowCreate(false); notify('Board created!'); }} />}
    </div>
  );
}

function BoardGrid({ boards, onStar }) {
  return (
    <div className="boards-grid">
      {boards.map(b => <BoardTile key={b.id} board={b} onStar={onStar} />)}
    </div>
  );
}

function BoardTile({ board, onStar }) {
  return (
    <Link to={`/board/${board.id}`} className="board-tile" style={{ background: board.background_color }}>
      <div className="board-tile-overlay" />
      <div className="board-tile-content">
        <h3 className="board-tile-title">{board.title}</h3>
      </div>
      <button className={`board-tile-star ${board.is_starred ? 'starred' : ''}`}
        onClick={e => onStar(e, board)} title={board.is_starred ? 'Unstar' : 'Star'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={board.is_starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
    </Link>
  );
}

function CreateBoardInline({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const board = await boardsApi.create({ title: title.trim(), background_color: bgColor });
      onCreated(board);
    } catch (_) {} finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="popover" style={{ position: 'relative', maxWidth: 304, width: '100%', marginTop: 80 }}>
        <div className="popover-header">
          Create board
          <button className="popover-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ background: bgColor, borderRadius: 6, height: 80, marginBottom: 12, transition: 'background .2s' }} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {BG_COLORS.map(c => (
              <button key={c} onClick={() => setBgColor(c)} style={{
                width: 28, height: 28, borderRadius: 4, background: c, cursor: 'pointer',
                border: bgColor === c ? '3px solid #172b4d' : '2px solid transparent',
                transition: 'transform .1s',
              }} />
            ))}
          </div>
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#44546f', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Board title <span style={{ color: '#ae2a19' }}>*</span>
            </label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="My awesome board" autoFocus style={{ marginBottom: 12 }} />
            <button className="btn btn-primary" type="submit" disabled={!title.trim() || loading}
              style={{ width: '100%' }}>
              {loading ? 'Creating…' : 'Create board'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
