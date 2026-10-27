// PURPOSE: Browser entry point; mounts React and loads the theme.
// WHY: Vite starts here (index.html references it).
// DEPENDS ON: app/App.tsx, styles/theme.css.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/theme.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
