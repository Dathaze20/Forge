import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initServiceWorker } from './lib/swUpdate';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registers the offline app-shell service worker only. It never reloads the
// page on its own - an update is only ever applied when the user explicitly
// chooses "Update Now" in Settings (see lib/swUpdate.ts and
// components/SettingsPanel.tsx), so a routine deployment can never reload
// Forge out from under someone who is typing notes or mid-generation.
initServiceWorker();
