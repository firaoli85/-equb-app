"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
} from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), 3000);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "i",
  };

  const colors: Record<ToastType, string> = {
    success:
      "bg-white dark:bg-[#1a1a1a] border-emerald-500 text-gray-900 dark:text-gray-100",
    error:
      "bg-white dark:bg-[#1a1a1a] border-red-500 text-gray-900 dark:text-gray-100",
    info: "bg-white dark:bg-[#1a1a1a] border-blue-500 text-gray-900 dark:text-gray-100",
  };

  const dotColors: Record<ToastType, string> = {
    success: "bg-emerald-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg min-w-64 max-w-sm cursor-pointer select-none ${colors[t.type]} ${
              t.exiting ? "animate-toast-out" : "animate-toast-in"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dotColors[t.type]}`}
            >
              {icons[t.type]}
            </span>
            <span className="text-sm font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
