import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { globalCss } from './styles';

// Suntik stylesheet global. Ditaruh di JS (bukan file .css terpisah) supaya
// bisa memakai design token dari theme.ts sebagai satu sumber kebenaran.
const style = document.createElement('style');
style.textContent = globalCss;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
