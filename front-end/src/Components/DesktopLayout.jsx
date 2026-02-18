import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, Images, FolderOpen, LogOut, LogIn,
  Minus, Square, X, Copy, Sun, Moon,
  Box, User, Settings, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogoIcon } from './Logo';

// ===== Navigation Items =====
const NAV_ITEMS = [
  { id: 'create',   path: '/generate',    icon: Sparkles,   label: 'Create 3D' },
  { id: 'showcase', path: '/showcase',    icon: Images,     label: 'Showcase' },
  { id: 'storage',  path: '/my-storage',  icon: FolderOpen, label: 'My Storage' },
];

// ===== Custom Titlebar =====
function Titlebar({ isMaximized }) {
  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose    = () => window.electronAPI?.close();

  return (
    <div className="desktop-titlebar h-8 flex items-center justify-between bg-[#161616] border-b border-white/[0.06] shrink-0 select-none"
         style={{ WebkitAppRegion: 'drag' }}>
      {/* Left: Logo + App Name */}
      <div className="flex items-center gap-2 pl-3" style={{ WebkitAppRegion: 'no-drag' }}>
        <LogoIcon size={16} />
        <span className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">Polyva 3D</span>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        <button onClick={handleMinimize} 
                className="h-full w-[46px] flex items-center justify-center hover:bg-white/[0.06] transition-colors"
                title="Minimize">
          <Minus size={14} className="text-white/50" />
        </button>
        <button onClick={handleMaximize} 
                className="h-full w-[46px] flex items-center justify-center hover:bg-white/[0.06] transition-colors"
                title={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? <Copy size={11} className="text-white/50" /> : <Square size={11} className="text-white/50" />}
        </button>
        <button onClick={handleClose} 
                className="h-full w-[46px] flex items-center justify-center hover:bg-[#e81123] transition-colors group"
                title="Close">
          <X size={14} className="text-white/50 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}

// ===== Sidebar =====
function Sidebar({ expanded, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, currentTheme } = useTheme();

  const isActive = (path) => {
    if (path === '/generate') {
      return ['/', '/generate', '/text-to-3d', '/image-to-3d'].includes(location.pathname);
    }
    return location.pathname === path;
  };

  return (
    <div className={`desktop-sidebar ${expanded ? 'w-[200px]' : 'w-[56px]'} bg-[#111111] border-r border-white/[0.06] flex flex-col transition-all duration-200 ease-out shrink-0 overflow-hidden`}>
      
      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 h-9 px-[11px] rounded-lg transition-all duration-150 group relative
                ${active 
                  ? 'bg-lime-500/15 text-lime-400' 
                  : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
                }`}
              title={!expanded ? item.label : undefined}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-lime-400 rounded-r-full" />
              )}
              <Icon size={18} className="shrink-0" />
              {expanded && (
                <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-white/[0.06] p-2 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 h-9 px-[11px] rounded-lg text-white/50 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
          title={!expanded ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          {theme === 'dark' ? <Sun size={18} className="shrink-0 text-yellow-400" /> : <Moon size={18} className="shrink-0 text-cyan-400" />}
          {expanded && <span className="text-[13px]">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Expand Toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 h-9 px-[11px] rounded-lg text-white/50 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
          title={!expanded ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight size={18} className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          {expanded && <span className="text-[13px]">Collapse</span>}
        </button>

        {/* User */}
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-3 h-9 px-[11px] rounded-lg text-white/50">
              <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-lime-400 to-green-500 shrink-0 flex items-center justify-center">
                <span className="text-[9px] font-bold text-black leading-none">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              {expanded && (
                <span className="text-[12px] truncate max-w-[120px]">{user?.email || 'User'}</span>
              )}
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center gap-3 h-9 px-[11px] rounded-lg text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title={!expanded ? 'Sign Out' : undefined}
            >
              <LogOut size={18} className="shrink-0" />
              {expanded && <span className="text-[13px]">Sign Out</span>}
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center gap-3 h-9 px-[11px] rounded-lg text-white/50 hover:bg-lime-500/10 hover:text-lime-400 transition-colors"
            title={!expanded ? 'Sign In' : undefined}
          >
            <LogIn size={18} className="shrink-0" />
            {expanded && <span className="text-[13px]">Sign In</span>}
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Desktop Layout (Main Export) =====
export default function DesktopLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Add electron-app class to body for CSS overrides
    document.body.classList.add('electron-app');
    
    // Listen for maximize state changes
    if (window.electronAPI?.onMaximizeChange) {
      window.electronAPI.onMaximizeChange((maximized) => {
        setIsMaximized(maximized);
      });
    }

    return () => {
      document.body.classList.remove('electron-app');
    };
  }, []);

  return (
    <div className={`h-screen flex flex-col bg-[#0c0c0c] text-white overflow-hidden ${isMaximized ? '' : 'rounded-lg'}`}>
      {/* Custom Titlebar */}
      <Titlebar isMaximized={isMaximized} />

      {/* Main Area: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          expanded={sidebarExpanded} 
          onToggle={() => setSidebarExpanded(!sidebarExpanded)} 
        />

        {/* Content */}
        <main className="flex-1 overflow-auto relative desktop-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
