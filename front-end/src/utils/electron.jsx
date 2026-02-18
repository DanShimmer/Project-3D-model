import React, { createContext, useContext, useState, useEffect } from 'react';

// ========== Electron Detection ==========
export const isElectron = () => {
  if (typeof window === 'undefined') return false;
  // Check via preload API first (most reliable), then user agent
  return window.electronAPI?.isElectron === true ||
    (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron'));
};

// ========== Context for Electron State ==========
const ElectronContext = createContext(null);

export const useElectron = () => {
  const context = useContext(ElectronContext);
  return context || {
    isElectronApp: isElectron(),
    windowState: 'normal',
    minimize: () => window.electronAPI?.minimize(),
    maximize: () => window.electronAPI?.maximize(),
    close: () => window.electronAPI?.close(),
  };
};

// ========== Electron Provider ==========
export function ElectronProvider({ children }) {
  const isDesktop = isElectron();
  const [windowState, setWindowState] = useState('normal');

  useEffect(() => {
    if (isDesktop && window.electronAPI?.onMaximizeChange) {
      window.electronAPI.onMaximizeChange((isMax) => {
        setWindowState(isMax ? 'maximized' : 'normal');
      });
    }
  }, [isDesktop]);

  const value = {
    isElectronApp: isDesktop,
    windowState,
    minimize: () => window.electronAPI?.minimize(),
    maximize: () => window.electronAPI?.maximize(),
    close: () => window.electronAPI?.close(),
  };

  return (
    <ElectronContext.Provider value={value}>
      {children}
    </ElectronContext.Provider>
  );
}

export default {
  isElectron,
  ElectronProvider,
  useElectron
};
