import { useGuestMode } from '../../lib/useGuestMode';
import { maskFinancialText } from '../../lib/guestMode';
import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import './Toast.css';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  useGuestMode();
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  // toast('Saved') or toast('Couldn’t save', { tone: 'error', action: { label: 'Undo', onClick } })
  const toast = useCallback(
    (message, { tone = 'info', action, duration = 4000 } = {}) => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-2), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), tone === 'error' ? duration * 1.75 : duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast--${t.tone}`}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <span>{typeof t.message === 'string' ? maskFinancialText(t.message) : t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
