import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Square, X, Maximize2, Minimize2, Download, RefreshCw, Monitor } from 'lucide-react';

// ========== Electron Detection ==========
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
};

// ========== Context for Electron State ==========
const ElectronContext = createContext(null);

export const useElectron = () => {
  const context = useContext(ElectronContext);
  if (!context && isElectron()) {
    console.warn('useElectron must be used within ElectronProvider');
  }
  return context || {
    isElectronApp: false,
    windowState: 'normal',
    appInfo: null,
    updateStatus: null
  };
};

// ========== Electron Provider ==========
export function ElectronProvider({ children }) {
  const [windowState, setWindowState] = useState('normal');
  const [appInfo, setAppInfo] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const electronApp = isElectron();

  useEffect(() => {
    if (!electronApp) return;

    // Get initial app info
    window.electronAPI.getAppInfo().then(setAppInfo);
    window.electronAPI.getWindowState().then(setWindowState);

    // Listen for window state changes
    const unsubscribeWindow = window.electronAPI.onWindowStateChanged((state) => {
      setWindowState(state);
    });

    // Listen for update status
    const unsubscribeUpdate = window.electronAPI.onUpdateStatus((status) => {
      setUpdateStatus(status);
    });

    // Listen for menu actions
    const unsubscribeMenu = window.electronAPI.onMenuAction((action) => {
      // Dispatch custom event for components to handle
      window.dispatchEvent(new CustomEvent('electron-menu-action', { detail: action }));
    });

    return () => {
      unsubscribeWindow?.();
      unsubscribeUpdate?.();
      unsubscribeMenu?.();
    };
  }, [electronApp]);

  const value = {
    isElectronApp: electronApp,
    windowState,
    appInfo,
    updateStatus,
    minimize: () => electronApp && window.electronAPI.minimize(),
    maximize: () => electronApp && window.electronAPI.maximize(),
    close: () => electronApp && window.electronAPI.close(),
    fullscreen: () => electronApp && window.electronAPI.fullscreen(),
    checkForUpdates: () => electronApp && window.electronAPI.checkForUpdates(),
    showSaveDialog: (options) => electronApp ? window.electronAPI.showSaveDialog(options) : null,
    showOpenDialog: (options) => electronApp ? window.electronAPI.showOpenDialog(options) : null
  };

  return (
    <ElectronContext.Provider value={value}>
      {children}
    </ElectronContext.Provider>
  );
}

// ========== Custom Titlebar Component ==========
export function ElectronTitlebar({ title = "Polyva 3D", theme = "dark" }) {
  const { isElectronApp, windowState, appInfo, minimize, maximize, close } = useElectron();

  if (!isElectronApp) return null;

  const themeStyles = {
    dark: {
      bg: 'bg-[#0a0a0a]',
      border: 'border-gray-800',
      text: 'text-white',
      textMuted: 'text-gray-400',
      hover: 'hover:bg-white/10',
      closeHover: 'hover:bg-red-500'
    },
    light: {
      bg: 'bg-white',
      border: 'border-gray-200',
      text: 'text-gray-900',
      textMuted: 'text-gray-500',
      hover: 'hover:bg-black/5',
      closeHover: 'hover:bg-red-500'
    }
  }[theme];

  return (
    <div 
      className={`h-8 ${themeStyles.bg} border-b ${themeStyles.border} flex items-center justify-between select-none`}
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* App Title */}
      <div className="flex items-center gap-2 px-3">
        <div className="w-4 h-4 rounded bg-gradient-to-br from-lime-400 to-emerald-500" />
        <span className={`text-xs font-medium ${themeStyles.text}`}>
          {title}
        </span>
        {appInfo?.version && (
          <span className={`text-xs ${themeStyles.textMuted}`}>
            v{appInfo.version}
          </span>
        )}
      </div>

      {/* Window Controls */}
      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {/* Minimize */}
        <button
          onClick={minimize}
          className={`w-12 h-full flex items-center justify-center ${themeStyles.hover} transition-colors`}
          title="Minimize"
        >
          <Minus size={14} className={themeStyles.textMuted} />
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={maximize}
          className={`w-12 h-full flex items-center justify-center ${themeStyles.hover} transition-colors`}
          title={windowState === 'maximized' ? 'Restore' : 'Maximize'}
        >
          {windowState === 'maximized' ? (
            <Minimize2 size={12} className={themeStyles.textMuted} />
          ) : (
            <Square size={10} className={themeStyles.textMuted} />
          )}
        </button>

        {/* Close */}
        <button
          onClick={close}
          className={`w-12 h-full flex items-center justify-center ${themeStyles.closeHover} hover:text-white transition-colors`}
          title="Close"
        >
          <X size={14} className={themeStyles.textMuted} />
        </button>
      </div>
    </div>
  );
}

// ========== Update Notification Component ==========
export function UpdateNotification({ theme = "dark" }) {
  const { isElectronApp, updateStatus, checkForUpdates } = useElectron();
  const [dismissed, setDismissed] = useState(false);

  if (!isElectronApp || !updateStatus || dismissed) return null;

  const themeStyles = {
    dark: {
      bg: 'bg-gray-900',
      border: 'border-gray-700',
      text: 'text-white',
      textMuted: 'text-gray-400',
      accent: 'bg-lime-500 hover:bg-lime-400',
      secondary: 'bg-gray-800 hover:bg-gray-700'
    },
    light: {
      bg: 'bg-white',
      border: 'border-gray-200',
      text: 'text-gray-900',
      textMuted: 'text-gray-500',
      accent: 'bg-cyan-500 hover:bg-cyan-400',
      secondary: 'bg-gray-100 hover:bg-gray-200'
    }
  }[theme];

  const renderContent = () => {
    switch (updateStatus.status) {
      case 'checking':
        return (
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin text-lime-400" />
            <span>Checking for updates...</span>
          </div>
        );
      
      case 'available':
        return (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-lime-400" />
              <span>Update {updateStatus.version} available!</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDismissed(true)}
                className={`px-3 py-1 text-sm rounded ${themeStyles.secondary}`}
              >
                Later
              </button>
            </div>
          </div>
        );
      
      case 'downloading':
        return (
          <div className="flex items-center gap-3 w-full">
            <Download size={16} className="text-lime-400" />
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Downloading update...</span>
                <span>{Math.round(updateStatus.percent)}%</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-lime-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${updateStatus.percent}%` }}
                />
              </div>
            </div>
          </div>
        );
      
      case 'downloaded':
        return (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-lime-400" />
              <span>Update ready to install!</span>
            </div>
            <span className="text-sm text-gray-400">
              Restart app to update
            </span>
          </div>
        );
      
      case 'error':
        return (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-red-400">
              <X size={16} />
              <span>Update failed</span>
            </div>
            <button
              onClick={checkForUpdates}
              className={`px-3 py-1 text-sm rounded ${themeStyles.secondary}`}
            >
              Retry
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg ${themeStyles.bg} border ${themeStyles.border} shadow-xl min-w-80`}
      >
        <div className={`flex items-center ${themeStyles.text}`}>
          {renderContent()}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ========== App Layout Wrapper ==========
export function ElectronAppLayout({ children, theme = "dark" }) {
  const { isElectronApp } = useElectron();

  return (
    <div className={`flex flex-col h-screen ${isElectronApp ? 'pt-0' : ''}`}>
      {isElectronApp && <ElectronTitlebar theme={theme} />}
      <UpdateNotification theme={theme} />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ========== Hook for Menu Actions ==========
export function useMenuAction(callback) {
  useEffect(() => {
    const handler = (event) => {
      callback(event.detail);
    };

    window.addEventListener('electron-menu-action', handler);
    return () => window.removeEventListener('electron-menu-action', handler);
  }, [callback]);
}

// ========== Native File Dialog Helpers ==========
export async function saveFileDialog(options = {}) {
  if (!isElectron()) {
    // Fallback for web
    return null;
  }

  const defaultOptions = {
    title: 'Save File',
    defaultPath: 'model',
    filters: [
      { name: '3D Models', extensions: ['glb', 'obj', 'fbx'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options
  };

  return window.electronAPI.showSaveDialog(defaultOptions);
}

export async function openFileDialog(options = {}) {
  if (!isElectron()) {
    // Fallback for web - use file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.filters?.[0]?.extensions?.map(e => `.${e}`).join(',') || '*';
      input.onchange = (e) => {
        resolve({ filePaths: Array.from(e.target.files).map(f => f.path || f.name) });
      };
      input.click();
    });
  }

  const defaultOptions = {
    title: 'Open File',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options
  };

  return window.electronAPI.showOpenDialog(defaultOptions);
}

// ========== Desktop-specific Features ==========
export function useDesktopFeatures() {
  const { isElectronApp, appInfo } = useElectron();

  return {
    isDesktop: isElectronApp,
    platform: appInfo?.platform || (typeof navigator !== 'undefined' ? navigator.platform : 'unknown'),
    canUseNativeDialogs: isElectronApp,
    canMinimizeToTray: isElectronApp,
    supportsAutoUpdate: isElectronApp,
    saveFile: saveFileDialog,
    openFile: openFileDialog
  };
}

export default {
  isElectron,
  ElectronProvider,
  ElectronTitlebar,
  ElectronAppLayout,
  UpdateNotification,
  useElectron,
  useMenuAction,
  useDesktopFeatures,
  saveFileDialog,
  openFileDialog
};
