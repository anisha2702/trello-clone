import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Notification() {
  const { notification } = useApp();
  if (!notification) return null;
  return (
    <div className={`toast ${notification.type || 'success'}`}>
      {notification.message}
    </div>
  );
}
