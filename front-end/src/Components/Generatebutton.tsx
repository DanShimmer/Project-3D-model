import React from 'react';

type Props = {
  onClick?: () => void;
  loading?: boolean;
  type?: 'text' | 'image';
  className?: string;
};

export default function GenerateButton({ onClick, loading = false, type = 'text', className = '' }: Props) {
  const base = 'px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all duration-200';
  const gradient = 'bg-gradient-to-r from-yellow-400 via-green-400 to-pink-400';
  const state = loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95';

  return (
    <button
      type="button"
      onClick={loading ? undefined : onClick}
      disabled={loading}
      className={`${base} ${gradient} ${state} ${className}`}
    >
      {loading ? 'Processing...' : (type === 'text' ? 'Generate from Text' : 'Generate from Image')}
    </button>
  );
}

