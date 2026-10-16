import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IconContext } from '@phosphor-icons/react';
import { ToastProvider } from './components/ui/Toast';
import App from './App';
import './styles/tokens.css';
import './styles/base.css';

// Apply the remembered theme before first paint so there's no flash.
try {
  const theme = localStorage.getItem('squirl-theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch {
  /* storage blocked: fall back to the system theme */
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retrying a 4xx won't help; retry network blips and 5xx once.
      retry: (count, error) => count < 1 && !(error?.status >= 400 && error?.status < 500),
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* UI icons default to Phosphor's regular weight; category icons opt into duotone. */}
    <IconContext.Provider value={{ size: 18, weight: 'regular', color: 'currentColor' }}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </IconContext.Provider>
  </StrictMode>,
);
