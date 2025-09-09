import React, { createContext, useContext, useState, useCallback } from 'react';

interface DragIndicatorContextType {
  activeIndicator: string | null;
  setActiveIndicator: (indicatorId: string | null) => void;
  clearAllIndicators: () => void;
}

const DragIndicatorContext = createContext<DragIndicatorContextType | undefined>(undefined);

export const useDragIndicator = () => {
  const context = useContext(DragIndicatorContext);
  if (!context) {
    throw new Error('useDragIndicator must be used within a DragIndicatorProvider');
  }
  return context;
};

interface DragIndicatorProviderProps {
  children: React.ReactNode;
}

export const DragIndicatorProvider: React.FC<DragIndicatorProviderProps> = ({ children }) => {
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);

  const clearAllIndicators = useCallback(() => {
    setActiveIndicator(null);
  }, []);

  const value = {
    activeIndicator,
    setActiveIndicator,
    clearAllIndicators,
  };

  return (
    <DragIndicatorContext.Provider value={value}>
      {children}
    </DragIndicatorContext.Provider>
  );
};
