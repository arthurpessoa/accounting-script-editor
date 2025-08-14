import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './modules/app/App';
import './global.css';

createRoot(document.getElementById('root')!).render(<App />);
