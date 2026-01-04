import React from 'react';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {children}
      </div>
    </div>
  );
}