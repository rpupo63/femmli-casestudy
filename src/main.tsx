import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { DemoModeProvider } from './contexts/DemoModeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DemoModeProvider>
          <App />
        </DemoModeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
