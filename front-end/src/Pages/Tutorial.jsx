import React from "react";
import { motion } from "framer-motion";

const TutorialCard = ({ title, level, image }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="bg-gray-900/60 rounded-xl border border-green-500/20 shadow-lg overflow-hidden"
  >
    <img src={image} alt={title} className="h-40 w-full object-cover" />
    <div className="p-5">
      <h3 className="text-green-400 font-semibold mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">Level: {level}</p>
    </div>
  </motion.div>
);

export default function TutorialsPage() {
  const tutorials = [
    {
      title: "Intro to 3D Modeling",
      level: "Beginner",
      image: "https://via.placeholder.com/400x200?text=Modeling+Basics",
    },
    {
      title: "Texturing with AI",
      level: "Intermediate",
      image: "https://via.placeholder.com/400x200?text=AI+Texturing",
    },
    {
      title: "Advanced Animation",
      level: "Advanced",
      image: "https://via.placeholder.com/400x200?text=Animation",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-4xl font-bold text-center text-green-400 mb-10"
      >
        Tutorials
      </motion.h1>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {tutorials.map((t, i) => (
          <TutorialCard key={i} {...t} />
        ))}
      </div>
    </div>
  );
}
