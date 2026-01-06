import React, { createContext, useContext, useState, useEffect } from 'react';

// Theme configurations
export const THEMES = {
  dark: {
    name: 'dark',
    background: 'bg-[#0a0a0a]',
    backgroundRaw: '#0a0a0a',
    backgroundSecondary: 'bg-black/40',
    backgroundCard: 'bg-gradient-to-br from-gray-900 to-black',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    textMuted: 'text-gray-500',
    border: 'border-white/10',
    borderHover: 'border-white/20',
    accent: 'lime',
    accentColor: 'text-lime-400',
    accentBg: 'bg-lime-500',
    accentBgHover: 'hover:bg-lime-400',
    accentGradient: 'from-lime-500 to-green-600',
    accentShadow: 'shadow-lime-500/20',
    particleColor: 'rgba(132, 204, 22,',
    shadowColor: 'rgba(132, 204, 22, 0.8)',
    inputBg: 'bg-white/5',
    navBg: 'bg-black/40',
    cardBg: 'bg-white/5',
    buttonSecondary: 'bg-white/5 hover:bg-white/10',
    glowColor: 'lime'
  },
  light: {
    name: 'light',
    background: 'bg-[#0f172a]',
    backgroundRaw: '#0f172a',
    backgroundSecondary: 'bg-black/40',
    backgroundCard: 'bg-gradient-to-br from-slate-900 to-black',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    textMuted: 'text-gray-500',
    border: 'border-white/10',
    borderHover: 'border-white/20',
    accent: 'cyan',
    accentColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500',
    accentBgHover: 'hover:bg-cyan-400',
    accentGradient: 'from-cyan-500 to-blue-600',
    accentShadow: 'shadow-cyan-500/20',
    particleColor: 'rgba(6, 182, 212,',
    shadowColor: 'rgba(6, 182, 212, 0.8)',
    inputBg: 'bg-white/5',
    navBg: 'bg-black/40',
    cardBg: 'bg-white/5',
    buttonSecondary: 'bg-white/5 hover:bg-white/10',
    glowColor: 'cyan'
  }
};

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  currentTheme: THEMES.dark,
  THEMES
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Get saved theme from localStorage or default to dark
    const saved = localStorage.getItem('pv_theme');
    // Validate saved theme is valid, otherwise default to dark
    return (saved === 'dark' || saved === 'light') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('pv_theme', theme);
    // Update document class for global styling
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Always ensure currentTheme has a valid value
  const currentTheme = THEMES[theme] || THEMES.dark;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, currentTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default values if context not available (prevents crash)
    return {
      theme: 'dark',
      toggleTheme: () => {},
      currentTheme: THEMES.dark,
      THEMES
    };
  }
  return context;
}
