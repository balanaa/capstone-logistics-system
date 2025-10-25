import React, { createContext, useContext, useEffect, useState } from 'react';
import { isMobileDevice } from '../utils/deviceDetection';

const MobileContext = createContext({
  isMobile: false
});

export const MobileProvider = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device on mount
    const mobile = isMobileDevice();
    setIsMobile(mobile);

    // Add or remove mobile-device class on body
    if (mobile) {
      document.body.classList.add('mobile-device');
    } else {
      document.body.classList.remove('mobile-device');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('mobile-device');
    };
  }, []);

  return (
    <MobileContext.Provider value={{ isMobile }}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobile = () => {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
};

