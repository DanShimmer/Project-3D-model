import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function Button({ 
  onClick, 
  loading = false, 
  children = 'Generate',
  className = ''
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={loading ? undefined : onClick}
      disabled={loading}
      className={`px-4 py-2 rounded-lg bg-blue-500 text-white font-medium
                 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}
                 ${className}`}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
}