import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './core/i18n/i18n';
import './index.css';
import App from './App.jsx';
import { logger } from './core/utils/logger';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('runtime:uncaught_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('runtime:unhandled_promise', {
      reason: event.reason?.message || event.reason,
      stack: event.reason?.stack,
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
