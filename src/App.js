import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { membersApi } from './utils/api';
import Header from './components/Common/Header';
import BoardsHome from './components/Board/BoardsHome';
import BoardView from './components/Board/BoardView';
import Notification from './components/Common/Notification';
import './styles/globals.css';

function AppInit({ children }) {
  const { dispatch } = useApp();
  useEffect(() => {
    async function init() {
      try {
        const [members, defaultMember] = await Promise.all([
          membersApi.getAll(),
          membersApi.getDefault(),
        ]);
        dispatch({ type: 'SET_MEMBERS', payload: members });
        dispatch({ type: 'SET_CURRENT_MEMBER', payload: defaultMember });
      } catch (e) {
        console.error('Failed to init members', e);
      }
    }
    init();
  }, [dispatch]);
  return children;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppInit>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header />
            <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Routes>
                <Route path="/"            element={<BoardsHome />} />
                <Route path="/board/:id"   element={<BoardView />} />
                <Route path="*"            element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <Notification />
        </AppInit>
      </BrowserRouter>
    </AppProvider>
  );
}
