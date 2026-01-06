import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function AppShell({ children }) {
  const { theme, currentTheme } = useTheme();
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-b from-black via-gray-900 to-black' : 'bg-gradient-to-b from-white via-gray-50 to-white'} ${currentTheme.text}`}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {children}
      </div>
    </div>
  );
}