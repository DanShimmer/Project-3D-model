import React from "react";
import { motion } from "framer-motion";

const BlogCard = ({ title, desc, image }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="bg-gray-900/60 rounded-2xl shadow-lg p-5 border border-green-500/20"
  >
    <img src={image} alt={title} className="rounded-xl mb-4" />
    <h3 className="text-green-400 font-semibold text-lg mb-2">{title}</h3>
    <p className="text-gray-300 text-sm">{desc}</p>
  </motion.div>
);

export default function BlogsPage() {
  const blogs = [
    {
      title: "How AI Transforms 3D Design",
      desc: "Exploring the impact of AI in modern 3D workflows.",
      image: "https://via.placeholder.com/400x200?text=AI+3D",
    },
    {
      title: "Top 5 3D Tools in 2025",
      desc: "Blender, Unity, Unreal… what else?",
      image: "https://via.placeholder.com/400x200?text=3D+Tools",
    },
    {
      title: "From Concept to Render",
      desc: "The pipeline of professional 3D artists.",
      image: "https://via.placeholder.com/400x200?text=Concept+Render",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-center text-green-400 mb-10"
      >
        Blogs
      </motion.h1>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {blogs.map((b, i) => (
          <BlogCard key={i} {...b} />
        ))}
      </div>
    </div>
  );
}
