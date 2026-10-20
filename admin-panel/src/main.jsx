import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { EconomyProvider } from './context/EconomyContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EconomyProvider>
      <App />
    </EconomyProvider>
  </StrictMode>,
);
