import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './firebase/authContext';
import { I18nProvider } from './i18n';
import { LanguageSelector } from './components/i18n/LanguageSelector';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <LanguageSelector />
        <App />
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
);
