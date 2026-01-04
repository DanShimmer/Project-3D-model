import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Share2, Download, MessageCircle, Bookmark } from "lucide-react";

const ShowcaseCard = ({ model, onLike }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    className="bg-gray-900/60 rounded-2xl border border-green-500/20 shadow-lg overflow-hidden"
  >
    <img
      src={model.image}
      alt={model.title}
      className="w-full h-48 object-cover"
    />
    <div className="p-5">
      <h3 className="text-green-400 font-semibold text-lg">{model.title}</h3>
      <p className="text-gray-400 text-sm mb-3">{model.desc}</p>

      <div className="flex justify-between items-center text-gray-400">
        <button
          onClick={onLike}
          className="flex items-center gap-1 hover:text-green-400 transition"
        >
          <Heart size={18} />
          {model.likes}
        </button>
        <button className="hover:text-green-400 transition">
          <Share2 size={18} />
        </button>
        <button className="hover:text-green-400 transition">
          <Download size={18} />
        </button>
        <button className="hover:text-green-400 transition">
          <MessageCircle size={18} />
        </button>
        <button className="hover:text-green-400 transition">
          <Bookmark size={18} />
        </button>
      </div>
    </div>
  </motion.div>
);

export default function ShowcasePage() {
  const [models, setModels] = useState([
    {
      id: 1,
      title: "Sci-Fi Helmet",
      desc: "A futuristic helmet model generated with AI.",
      image: "https://via.placeholder.com/400x250?text=Helmet",
      likes: 12,
    },
    {
      id: 2,
      title: "Fantasy Sword",
      desc: "A magical sword with glowing runes.",
      image: "https://via.placeholder.com/400x250?text=Sword",
      likes: 34,
    },
    {
      id: 3,
      title: "Cartoon Character",
      desc: "Fun 3D stylized cartoon figure.",
      image: "https://via.placeholder.com/400x250?text=Character",
      likes: 20,
    },
  ]);

  const handleLike = (id) => {
    setModels((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, likes: m.likes + 1 } : m
      )
    );
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-14"
      >
        <h1 className="text-4xl font-bold text-green-400 mb-4">Showcase</h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Discover and interact with models created by our community. Like,
          share, download, comment, and save your favorites!
        </p>
      </motion.div>

      {/* Models Grid */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {models.map((model) => (
          <ShowcaseCard
            key={model.id}
            model={model}
            onLike={() => handleLike(model.id)}
          />
        ))}
      </div>
    </div>
  );
}
