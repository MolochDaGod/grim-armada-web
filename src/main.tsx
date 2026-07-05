import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadAssetManifest } from './game/core/assetPresets';
import './index.css';

loadAssetManifest();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
