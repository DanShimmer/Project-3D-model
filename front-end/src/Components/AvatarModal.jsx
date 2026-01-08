import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Camera } from 'lucide-react';

// Predefined avatar options - colorful gradients that work in both light/dark themes
const AVATAR_OPTIONS = [
  { id: 'gradient-1', gradient: 'from-purple-500 to-pink-500', emoji: '👤' },
  { id: 'gradient-2', gradient: 'from-blue-500 to-cyan-500', emoji: '😊' },
  { id: 'gradient-3', gradient: 'from-green-500 to-emerald-500', emoji: '🎨' },
  { id: 'gradient-4', gradient: 'from-yellow-500 to-orange-500', emoji: '⚡' },
  { id: 'gradient-5', gradient: 'from-red-500 to-pink-500', emoji: '🔥' },
  { id: 'gradient-6', gradient: 'from-indigo-500 to-purple-500', emoji: '🌟' },
  { id: 'gradient-7', gradient: 'from-teal-500 to-blue-500', emoji: '🌊' },
  { id: 'gradient-8', gradient: 'from-rose-500 to-red-500', emoji: '❤️' },
  { id: 'gradient-9', gradient: 'from-amber-500 to-yellow-500', emoji: '☀️' },
  { id: 'gradient-10', gradient: 'from-violet-500 to-fuchsia-500', emoji: '🎭' },
  { id: 'gradient-11', gradient: 'from-lime-500 to-green-500', emoji: '🌿' },
  { id: 'gradient-12', gradient: 'from-sky-500 to-indigo-500', emoji: '🚀' },
];

export default function AvatarModal({ isOpen, onClose, currentAvatar, onSave, userName }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || 'gradient-1');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedAvatar);
      onClose();
    } catch (error) {
      console.error('Failed to save avatar:', error);
    } finally {
      setSaving(false);
    }
  };

  const getAvatarStyle = (avatarId) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar || AVATAR_OPTIONS[0];
  };

  const currentAvatarStyle = getAvatarStyle(selectedAvatar);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-semibold text-white">Change Avatar</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Preview */}
              <div className="flex flex-col items-center py-6 border-b border-white/10">
                <div className={`w-24 h-24 bg-gradient-to-br ${currentAvatarStyle.gradient} rounded-full flex items-center justify-center text-4xl shadow-lg`}>
                  {currentAvatarStyle.emoji}
                </div>
                <p className="mt-3 text-white font-medium">{userName}</p>
                <p className="text-sm text-gray-400">Preview your new avatar</p>
              </div>

              {/* Avatar Grid */}
              <div className="p-6">
                <p className="text-sm text-gray-400 mb-4">Choose an avatar</p>
                <div className="grid grid-cols-4 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`relative w-14 h-14 bg-gradient-to-br ${avatar.gradient} rounded-full flex items-center justify-center text-xl transition-all duration-200 hover:scale-110 ${
                        selectedAvatar === avatar.id
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110'
                          : ''
                      }`}
                    >
                      {avatar.emoji}
                      {selectedAvatar === avatar.id && ( 
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-black/20">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Avatar'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


export { AVATAR_OPTIONS };


export function getAvatarById(avatarId) {
  return AVATAR_OPTIONS.find(a => a.id === avatarId) || AVATAR_OPTIONS[0];
}
