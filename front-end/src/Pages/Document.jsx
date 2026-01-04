import React from "react";
import { motion } from "framer-motion";

const DocSection = ({ title, content }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gray-900/60 rounded-xl border border-green-500/20 p-6 shadow-lg"
  >
    <h3 className="text-green-400 font-semibold mb-2">{title}</h3>
    <p className="text-gray-300 text-sm">{content}</p>
  </motion.div>
);

export default function DocumentationPage() {
  const sections = [
    {
      title: "Getting Started",
      content: "Install dependencies, run npm start, and begin building.",
    },
    {
      title: "API Reference",
      content: "Details on endpoints for Text to 3D and Image to 3D.",
    },
    {
      title: "Best Practices",
      content: "Tips for managing 3D assets and performance.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-4xl font-bold text-center text-green-400 mb-10"
      >
        Documentation
      </motion.h1>
      <div className="space-y-6 max-w-4xl mx-auto">
        {sections.map((s, i) => (
          <DocSection key={i} {...s} />
        ))}
      </div>
    </div>
  );
}
