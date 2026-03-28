import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { boardsApi, searchApi } from '../../utils/api';
import Avatar from './Avatar';
import './Header.css';

export default function Header() {
  const { currentMember } = useApp();
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await searchApi.cards({ q: searchQuery });
        setSearchResults(results.slice(0, 8));
      } catch (_) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="header-logo">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="white" fillOpacity=".15"/>
            <rect x="3" y="4" width="10" height="18" rx="2" fill="white"/>
            <rect x="17" y="4" width="10" height="11" rx="2" fill="white"/>
          </svg>
          <span>Trello</span>
        </Link>
        <button className="header-btn" onClick={() => navigate('/')}>Boards</button>
      </div>

      <div className="header-center" ref={searchRef}>
        <div className="header-search-wrap">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="header-search"
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
          />
        </div>
        {searchOpen && searchQuery && (
          <div className="search-dropdown">
            {searchResults.length === 0 ? (
              <div className="search-empty">No cards found for "{searchQuery}"</div>
            ) : searchResults.map(card => (
              <div key={card.id} className="search-result" onClick={() => {
                navigate(`/board/${card.board_id}`);
                setSearchOpen(false); setSearchQuery('');
              }}>
                <div className="search-result-title">{card.title}</div>
                <div className="search-result-meta">{card.board_title} › {card.list_title}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="header-right">
        <button className="header-btn header-create" onClick={() => setShowCreateBoard(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
        {currentMember && <Avatar member={currentMember} size="sm" />}
      </div>

      {showCreateBoard && (
        <CreateBoardModal onClose={() => setShowCreateBoard(false)} />
      )}
    </header>
  );
}

const BG_COLORS = [
  '#0052cc','#1868db','#0747a6','#00875a','#006644',
  '#ff5630','#de350b','#ff7452','#6554c0','#403294',
  '#00b8d9','#008da6','#36b37e','#ff991f','#ff8b00',
];

function CreateBoardModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { notify } = useApp();

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const board = await boardsApi.create({ title: title.trim(), background_color: bgColor });
      notify('Board created!');
      onClose();
      navigate(`/board/${board.id}`);
    } catch (err) {
      notify(err.error || 'Failed to create board', 'error');
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="popover" style={{ position: 'relative', maxWidth: 304, width: '100%', marginTop: 48 }}>
        <div className="popover-header">
          Create board
          <button className="popover-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 12 }}>
          <div className="board-preview" style={{ background: bgColor, borderRadius: 6, height: 96, marginBottom: 12 }}>
            <div style={{ padding: 8, opacity: .6 }}>
              <div style={{ background: 'rgba(255,255,255,.5)', borderRadius: 3, height: 8, width: '60%', marginBottom: 4 }} />
              <div style={{ background: 'rgba(255,255,255,.5)', borderRadius: 3, height: 8, width: '40%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {BG_COLORS.map(c => (
              <button key={c} onClick={() => setBgColor(c)}
                style={{ width: 28, height: 28, borderRadius: 4, background: c, border: bgColor === c ? '3px solid #172b4d' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
          <form onSubmit={handleCreate}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#44546f', display: 'block', marginBottom: 4 }}>
              Board title <span style={{ color: '#ae2a19' }}>*</span>
            </label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Enter board title" autoFocus style={{ marginBottom: 12 }} />
            <button className="btn btn-primary" type="submit" disabled={!title.trim() || loading}
              style={{ width: '100%' }}>
              {loading ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
