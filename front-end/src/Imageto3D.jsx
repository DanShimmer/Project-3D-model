import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { LucideFolder, LucideImage, LucideBox, LucideDownload, LucideSettings, LucideShare2, LucideUpload } from "lucide-react";
import { genImageTo3D } from "./api/generate";

export default function ImageTo3DPage() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);

  const toolbarButtons = [
    { icon: LucideFolder, label: "Files" },
    { icon: LucideImage, label: "Templates" },
    { icon: LucideBox, label: "Models" },
    { icon: LucideShare2, label: "Share" },
    { icon: LucideSettings, label: "Settings" }
  ];

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setUploadedImage(URL.createObjectURL(uploadedFile));
    }
  }, []);

  const handleGenerateImage = async () => {
    if (!file) {
      alert("Please upload an image first (.png/.jpg/.jpeg/.webp)");
      return;
    }
    try {
      setLoading(true);
      const res = await genImageTo3D(file);
      if (!res.ok) throw new Error(res.msg || "Generate failed");
      setCurrentModel(res.model);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setUploadedImage(URL.createObjectURL(uploadedFile));
    }
  };

  return (
    <div className="min-h-screen bg-[#04060A] text-white flex">
      {/* Left toolbar */}
      <div className="w-16 bg-gray-900/50 border-r border-gray-800/30 flex flex-col items-center py-4 gap-6">
        {toolbarButtons.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
            title={label}
          >
            <Icon size={24} />
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left side: Recent models/templates */}
        <div className="w-72 border-r border-gray-800/30 p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent</h2>
            <button className="text-gray-400 hover:text-white">
              <LucideDownload size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            {["Model 1", "Model 2", "Model 3"].map((model) => (
              <div
                key={model}
                className="p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 cursor-pointer"
              >
                {model}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Preview area */}
        <div className="flex-1 p-6">
          <div className="h-[calc(100vh-3rem)] flex flex-col">
            {/* Preview window */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 bg-gray-900/50 rounded-xl flex items-center justify-center border border-gray-800/30"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full"
                />
              ) : uploadedImage ? (
                <div className="text-center">
                  <img 
                    src={uploadedImage} 
                    alt="Upload Preview" 
                    className="max-w-full max-h-[70vh] rounded-lg mb-4" 
                  />
                  <p className="text-sm text-gray-400">Image uploaded successfully</p>
                </div>
              ) : (
                <p className="text-gray-400">3D preview will appear here</p>
              )}
            </motion.div>
          </div>
        </div>

        {/* Right side: Controls */}
        <div className="w-96 border-l border-gray-800/30 p-6 flex flex-col">
          {/* Model type selector */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <span>AI Model</span>
              <div className="flex-1" />
              <select className="bg-gray-800/30 rounded px-2 py-1 text-sm">
                <option>Meshy 6 Preview</option>
              </select>
            </label>
          </div>

          {/* Image upload area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              onDrop(files);
            }}
            className="flex-1 border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center gap-4 mb-6 hover:border-green-500/50 transition-colors cursor-pointer"
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onDrop(Array.from(e.target.files))}
              className="hidden"
              id="imageUpload"
            />
            <label htmlFor="imageUpload" className="flex flex-col items-center gap-4 cursor-pointer">
              <div className="p-4 rounded-full bg-gray-800/50">
                <LucideUpload size={32} className="text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-gray-300 mb-1">Drag & drop your image here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </div>
              <p className="text-xs text-gray-600">
                Supported formats: .jpg, .png, .webp (max 20MB)
              </p>
            </label>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGenerateImage}
              disabled={!uploadedImage || loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
