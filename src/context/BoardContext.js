import React, { createContext, useContext, useReducer, useCallback } from 'react';

const BoardContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SET_BOARD': return { ...state, board: action.payload, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };

    case 'ADD_LIST': return {
      ...state,
      board: { ...state.board, lists: [...state.board.lists, action.payload] }
    };
    case 'UPDATE_LIST': return {
      ...state,
      board: {
        ...state.board,
        lists: state.board.lists.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l)
      }
    };
    case 'REMOVE_LIST': return {
      ...state,
      board: { ...state.board, lists: state.board.lists.filter(l => l.id !== action.payload) }
    };
    case 'REORDER_LISTS': return {
      ...state,
      board: { ...state.board, lists: action.payload }
    };

    case 'ADD_CARD': return {
      ...state,
      board: {
        ...state.board,
        lists: state.board.lists.map(l =>
          l.id === action.payload.list_id ? { ...l, cards: [...l.cards, action.payload] } : l
        )
      }
    };
    case 'UPDATE_CARD': return {
      ...state,
      board: {
        ...state.board,
        lists: state.board.lists.map(l => ({
          ...l,
          cards: l.cards.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c)
        }))
      }
    };
    case 'REMOVE_CARD': return {
      ...state,
      board: {
        ...state.board,
        lists: state.board.lists.map(l => ({
          ...l,
          cards: l.cards.filter(c => c.id !== action.payload)
        }))
      }
    };
    case 'SET_LISTS_WITH_CARDS': return {
      ...state,
      board: { ...state.board, lists: action.payload }
    };

    default: return state;
  }
}

export function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { board: null, loading: true, error: null });

  const setBoard = useCallback((board) => dispatch({ type: 'SET_BOARD', payload: board }), []);
  const setLoading = useCallback((v) => dispatch({ type: 'SET_LOADING', payload: v }), []);
  const setError = useCallback((e) => dispatch({ type: 'SET_ERROR', payload: e }), []);

  return (
    <BoardContext.Provider value={{ ...state, dispatch, setBoard, setLoading, setError }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within BoardProvider');
  return ctx;
}
