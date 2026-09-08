import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PiiContextType {
  piiMasked: boolean;
  togglePiiMask: () => void;
}

const PiiContext = createContext<PiiContextType>({
  piiMasked: false,
  togglePiiMask: () => {},
});

export const PiiProvider = ({ children }: { children: ReactNode }) => {
  const [piiMasked, setPiiMasked] = useState(false);
  const togglePiiMask = () => setPiiMasked((prev) => !prev);
  return (
    <PiiContext.Provider value={{ piiMasked, togglePiiMask }}>
      {children}
    </PiiContext.Provider>
  );
};

export const usePii = () => useContext(PiiContext);
