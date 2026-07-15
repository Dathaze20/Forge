import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only reload on a genuine update (a controller already existed from a
    // prior visit) - never on the first-ever install, or a fresh visit could
    // wipe notes the user is mid-typing when the new worker activates.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update();
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'activated' && hadController) {
            window.location.reload();
          }
        });
      });
    }).catch(() => {});
  });
}
