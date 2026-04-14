import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FirebaseProvider } from './lib/AuthContext';
import { EmergencyProvider } from './lib/EmergencyContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseProvider>
      <EmergencyProvider>
        <App />
      </EmergencyProvider>
    </FirebaseProvider>
  </StrictMode>,
);
