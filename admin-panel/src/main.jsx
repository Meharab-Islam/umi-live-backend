import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { EconomyProvider } from './context/EconomyContext';
import { BrandingProvider } from './context/BrandingContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrandingProvider>
      <EconomyProvider>
        <App />
      </EconomyProvider>
    </BrandingProvider>
  </StrictMode>,
);
