"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface WidgetContextType {
  askHqOpen: boolean;
  setAskHqOpen: (open: boolean) => void;
  objectionOpen: boolean;
  setObjectionOpen: (open: boolean) => void;
}

const WidgetContext = createContext<WidgetContextType>({
  askHqOpen: false,
  setAskHqOpen: () => {},
  objectionOpen: false,
  setObjectionOpen: () => {},
});

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const [askHqOpen, setAskHqOpen] = useState(false);
  const [objectionOpen, setObjectionOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const openParam = params.get("open");
      if (openParam === "ask") {
        setAskHqOpen(true);
      } else if (openParam === "objection") {
        setObjectionOpen(true);
      }
    }
  }, []);

  return (
    <WidgetContext.Provider
      value={{ askHqOpen, setAskHqOpen, objectionOpen, setObjectionOpen }}
    >
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgets() {
  return useContext(WidgetContext);
}
