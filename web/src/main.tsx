import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
// Only the scripts we set: Latin from Inter and Baloo 2, Bengali from Anek Bangla and Baloo Da 2.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/anek-bangla/bengali-400.css';
import '@fontsource/anek-bangla/bengali-600.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-da-2/bengali-800.css';
import './styles/index.css';
import { App } from './app.tsx';
import { getLang } from './i18n/index.ts';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Prerendered pages are Bangla; hydrate them in place, otherwise render fresh.
if (root.hasChildNodes() && getLang() === 'bn') hydrateRoot(root, app);
else createRoot(root).render(app);
