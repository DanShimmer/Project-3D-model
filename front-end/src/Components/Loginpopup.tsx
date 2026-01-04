import React, { useState } from 'react';

type LoginPopupProps = {
  onClose: () => void;
  onLoginSuccess: () => void;
};

export default function LoginPopup({ onClose, onLoginSuccess }: LoginPopupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Fake login success for local UI
    localStorage.setItem('user', JSON.stringify({ email }));
    onLoginSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl flex flex-col gap-4">
        <h2 className="text-xl font-bold text-center">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleLogin}
          className="bg-blue-500 text-white font-semibold p-3 rounded-xl hover:bg-blue-600 transition-colors"
        >
          Login
        </button>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
