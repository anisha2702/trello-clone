import React, { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  currentMember: null,
  members: [],
  notification: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CURRENT_MEMBER': return { ...state, currentMember: action.payload };
    case 'SET_MEMBERS':        return { ...state, members: action.payload };
    case 'SET_NOTIFICATION':   return { ...state, notification: action.payload };
    case 'CLEAR_NOTIFICATION': return { ...state, notification: null };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const notify = useCallback((message, type = 'success') => {
    dispatch({ type: 'SET_NOTIFICATION', payload: { message, type } });
    setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 3000);
  }, []);

  return (
    <AppContext.Provider value={{ ...state, dispatch, notify }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
