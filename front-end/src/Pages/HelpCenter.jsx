import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout
      className="bg-gray-900/60 border border-green-500/20 rounded-xl p-5 shadow-lg"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex justify-between items-center"
      >
        <span className="text-green-400 font-medium">{q}</span>
        <span className="text-gray-400">{open ? "-" : "+"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-gray-300 text-sm mt-3"
          >
            {a}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function HelpCenterPage() {
  const faqs = [
    { q: "How to upload images?", a: "Go to Image to 3D page and drag-drop." },
    { q: "What file types are supported?", a: "PNG and JPG for images." },
    { q: "How to contact support?", a: "Use the Contact form in footer." },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-4xl font-bold text-center text-green-400 mb-10"
      >
        Help Center
      </motion.h1>
      <div className="space-y-6 max-w-3xl mx-auto">
        {faqs.map((f, i) => (
          <FAQItem key={i} {...f} />
        ))}
      </div>
    </div>
  );
}
