"use client";

import {
  useState,
  useCallback,
  createContext,
  useContext,
  useRef,
} from "react";

interface ToastContextType {
  toast: (msg: string, isErr?: boolean) => void;
  message: string;
  isError: boolean;
  visible: boolean;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  message: "",
  isError: false,
  visible: false,
});

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, isErr = false) => {
    setMessage(msg);
    setIsError(isErr);
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, message, isError, visible }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
