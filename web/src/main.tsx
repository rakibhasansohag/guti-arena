import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/anek-bangla/400.css';
import '@fontsource/anek-bangla/600.css';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/baloo-da-2/600.css';
import '@fontsource/baloo-da-2/800.css';
import './styles/index.css';
import { App } from './app.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
