import React, { createContext, useContext, useState, useEffect } from "react";

type ZenState = "normal" | "zen" | "warning";

interface ZenContextType {
  zenState: ZenState;
  setZenState: (state: ZenState) => void;
  intervention: string | null;
  showIntervention: (message: string, duration?: number) => void;
}

const ZenContext = createContext<ZenContextType | undefined>(undefined);

export function ZenProvider({ children }: { children: React.ReactNode }) {
  const [zenState, setZenState] = useState<ZenState>("normal");
  const [intervention, setIntervention] = useState<string | null>(null);

  const showIntervention = (message: string, duration: number = 5000) => {
    setIntervention(message);
    setZenState("warning");
    setTimeout(() => {
      setIntervention(null);
      setZenState("normal");
    }, duration);
  };

  return (
    <ZenContext.Provider value={{ zenState, setZenState, intervention, showIntervention }}>
      {children}
    </ZenContext.Provider>
  );
}

export function useZen() {
  const context = useContext(ZenContext);
  if (context === undefined) {
    throw new Error("useZen must be used within a ZenProvider");
  }
  return context;
}
