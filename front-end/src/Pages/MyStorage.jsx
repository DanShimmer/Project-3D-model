import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LucideBox,
  LucideSearch,
  LucideTrash2,
  LucideEdit,
  LucideShare2,
  LucideDownload,
  LucideCopy,
  LucideX,
  LucideFilter,
  LucideGrid,
  LucideList,
  LucideImage,
  LucideType,
  LucideExternalLink,
  LucideCheck,
  LucideFolder,
  Sun,
  Moon,
} from "lucide-react";
import { LogoIcon } from "../Components/Logo";
import { useTheme } from "../contexts/ThemeContext";

const API_URL = "http://localhost:5000/api";

export default function MyStorage() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedModel, setSelectedModel] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", prompt: "" });
  const [shareLink, setShareLink] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getToken = () => localStorage.getItem("pv_token");

  // Check auth
  useEffect(() => {
    const storedUser = localStorage.getItem("pv_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch models
  const fetchModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        type: typeFilter,
      });
      
      const res = await fetch(`${API_URL}/models?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setModels(data.models);
        setTotalPages(data.pages);
      } else if (res.status === 401) {
        navigate("/login");
      }
    } catch (err) {
      console.error("Error fetching models:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchModels();
    }
  }, [user, currentPage, typeFilter]);

  // Handle delete
  const handleDelete = async (modelId) => {
    if (!window.confirm("Are you sure you want to delete this model?")) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/models/${modelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setModels(models.filter((m) => m._id !== modelId));
      }
    } catch (err) {
      console.error("Error deleting model:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit
  const handleEdit = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/models/${selectedModel._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setModels(models.map((m) => (m._id === selectedModel._id ? data.model : m)));
        setShowEditModal(false);
      }
    } catch (err) {
      console.error("Error updating model:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle share
  const handleShare = async (model) => {
    setSelectedModel(model);
    setActionLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/models/${model._id}/share`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setShareLink(`${window.location.origin}/share/${data.shareToken}`);
        setShowShareModal(true);
      }
    } catch (err) {
      console.error("Error sharing model:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (modelId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/models/${modelId}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        fetchModels();
      }
    } catch (err) {
      console.error("Error duplicating model:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle regenerate - redirect to new generate page with model data
  const handleRegenerate = (model) => {
    navigate("/generate", { 
      state: { 
        editModel: model,
        mode: model.type === "text-to-3d" ? "text-to-3d" : "image-to-3d"
      } 
    });
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter models by search
  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.prompt && m.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Canvas background
  useEffect(() => {
    const canvas = document.getElementById("storageBgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const particles = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    let rafId;
    function draw() {
      // Always use dark background for both themes
      ctx.fillStyle = "#04060A";
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        const particleColor = theme === 'dark' ? "rgba(120,255,100," : "rgba(6,182,212,";
        ctx.fillStyle = `${particleColor}${p.alpha})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = theme === 'dark' ? "rgba(120,255,100,0.9)" : "rgba(6,182,212,0.9)";
        ctx.fill();
        ctx.shadowBlur = 0;

        p.x += p.dx;
        p.y += p.dy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }
      rafId = requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [theme]);

  if (!user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${currentTheme.text} relative transition-colors duration-500`}>
      <canvas id="storageBgCanvas" className="fixed inset-0 w-full h-full -z-10" />

      {/* Header */}
      <header className={`backdrop-blur-sm fixed top-0 w-full z-40 ${currentTheme.navBg} border-b ${currentTheme.border} transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3">
                <LogoIcon size={36} />
                <span className="font-semibold text-xl">Polyva</span>
              </Link>
              <span className={currentTheme.textMuted}>/</span>
              <div className="flex items-center gap-2">
                <LucideFolder className={`w-5 h-5 ${currentTheme.accentColor}`} />
                <span className="font-medium">My Storage</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <motion.button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${currentTheme.buttonSecondary} transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </motion.button>
              <Link
                to="/generate"
                className={`px-4 py-2 text-sm ${currentTheme.textSecondary} hover:${currentTheme.text} transition-colors`}
              >
                Generate
              </Link>
              <Link
                to="/"
                className={`px-4 py-2 bg-gradient-to-r ${currentTheme.accentGradient} text-white text-sm rounded-lg hover:opacity-90`}
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className={`text-3xl font-bold ${currentTheme.text} mb-2`}>My Storage</h1>
          <p className={currentTheme.textSecondary}>Manage your generated 3D models</p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <LucideSearch className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${currentTheme.textSecondary}`} />
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-4 py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.text} text-sm focus:border-current focus:ring-1 w-full sm:w-64`}
                style={{ borderColor: theme === 'dark' ? 'rgb(55, 65, 81)' : 'rgb(209, 213, 219)' }}
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <LucideFilter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${currentTheme.textSecondary}`} />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`pl-10 pr-8 py-2 ${currentTheme.cardBg} border ${currentTheme.border} rounded-xl ${currentTheme.text} text-sm appearance-none cursor-pointer`}
              >
                <option value="all">All Types</option>
                <option value="text-to-3d">Text to 3D</option>
                <option value="image-to-3d">Image to 3D</option>
              </select>
            </div>
          </div>

          {/* View Mode */}
          <div className={`flex items-center gap-2 ${currentTheme.cardBg} rounded-xl p-1`}>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid" ? `bg-gradient-to-r ${currentTheme.accentGradient} text-white` : `${currentTheme.textSecondary} hover:${currentTheme.text}`
              }`}
            >
              <LucideGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list" ? `bg-gradient-to-r ${currentTheme.accentGradient} text-white` : `${currentTheme.textSecondary} hover:${currentTheme.text}`
              }`}
            >
              <LucideList className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Models Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className={`flex items-center gap-3 ${currentTheme.textSecondary}`}>
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading your models...
            </div>
          </div>
        ) : filteredModels.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className={`w-20 h-20 ${currentTheme.cardBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <LucideBox className={`w-10 h-10 ${currentTheme.textMuted}`} />
            </div>
            <h3 className={`text-xl font-semibold ${currentTheme.text} mb-2`}>No models yet</h3>
            <p className={`${currentTheme.textSecondary} mb-6`}>Start creating amazing 3D models!</p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/generate"
                className={`px-6 py-3 bg-gradient-to-r ${currentTheme.accentGradient} text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2`}
              >
                <LucideType className="w-4 h-4" />
                Generate 3D
              </Link>
            </div>
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredModels.map((model, index) => (
              <motion.div
                key={model._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${currentTheme.cardBg} backdrop-blur-sm rounded-xl border ${currentTheme.border} overflow-hidden hover:border-opacity-50 transition-colors group`}
              >
                {/* Thumbnail */}
                <div className={`aspect-square ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} relative`}>
                  {model.thumbnailUrl ? (
                    <img
                      src={model.thumbnailUrl}
                      alt={model.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <LucideBox className={`w-12 h-12 ${currentTheme.textMuted}`} />
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      model.type === "text-to-3d"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}>
                      {model.type === "text-to-3d" ? (
                        <span className="flex items-center gap-1">
                          <LucideType className="w-3 h-3" />
                          Text
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <LucideImage className="w-3 h-3" />
                          Image
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleRegenerate(model)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="Regenerate"
                    >
                      <LucideEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleShare(model)}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      title="Share"
                    >
                      <LucideShare2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(model._id)}
                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      title="Duplicate"
                    >
                      <LucideCopy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(model._id)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      title="Delete"
                    >
                      <LucideTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className={`font-medium ${currentTheme.text} truncate`}>{model.name}</h3>
                  {model.prompt && (
                    <p className={`text-xs ${currentTheme.textSecondary} mt-1 line-clamp-2`}>{model.prompt}</p>
                  )}
                  <p className={`text-xs ${currentTheme.textMuted} mt-2`}>
                    {new Date(model.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`${currentTheme.cardBg} backdrop-blur-sm rounded-xl border ${currentTheme.border} overflow-hidden`}
          >
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase`}>Model</th>
                  <th className={`px-6 py-4 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase`}>Type</th>
                  <th className={`px-6 py-4 text-left text-xs font-medium ${currentTheme.textSecondary} uppercase`}>Created</th>
                  <th className={`px-6 py-4 text-right text-xs font-medium ${currentTheme.textSecondary} uppercase`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700/30' : 'divide-gray-200'}`}>
                {filteredModels.map((model) => (
                  <tr key={model._id} className={`${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} rounded-lg flex items-center justify-center overflow-hidden`}>
                          {model.thumbnailUrl ? (
                            <img src={model.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <LucideBox className={`w-6 h-6 ${currentTheme.textMuted}`} />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${currentTheme.text}`}>{model.name}</p>
                          {model.prompt && (
                            <p className={`text-xs ${currentTheme.textSecondary} truncate max-w-xs`}>{model.prompt}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        model.type === "text-to-3d"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}>
                        {model.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 ${currentTheme.textSecondary} text-sm`}>
                      {new Date(model.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRegenerate(model)}
                          className={`p-2 ${currentTheme.textSecondary} hover:text-green-400 transition-colors`}
                          title="Edit/Regenerate"
                        >
                          <LucideEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShare(model)}
                          className={`p-2 ${currentTheme.textSecondary} hover:text-blue-400 transition-colors`}
                          title="Share"
                        >
                          <LucideShare2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(model._id)}
                          className={`p-2 ${currentTheme.textSecondary} hover:text-purple-400 transition-colors`}
                          title="Duplicate"
                        >
                          <LucideCopy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(model._id)}
                          className={`p-2 ${currentTheme.textSecondary} hover:text-red-400 transition-colors`}
                          title="Delete"
                        >
                          <LucideTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-lg transition-colors ${
                  currentPage === page
                    ? `bg-gradient-to-r ${currentTheme.accentGradient} text-white`
                    : `${currentTheme.cardBg} ${currentTheme.textSecondary} hover:${currentTheme.text}`
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} border ${currentTheme.border} rounded-2xl p-6 w-full max-w-md shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-semibold ${currentTheme.text}`}>Share Model</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`${currentTheme.textSecondary} hover:${currentTheme.text}`}
                >
                  <LucideX className="w-5 h-5" />
                </button>
              </div>

              <p className={`${currentTheme.textSecondary} text-sm mb-4`}>
                Anyone with this link can view your model
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className={`flex-1 px-4 py-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} border ${currentTheme.border} rounded-lg ${currentTheme.text} text-sm`}
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    copied
                      ? "bg-green-500 text-white"
                      : `${theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                  }`}
                >
                  {copied ? (
                    <LucideCheck className="w-5 h-5" />
                  ) : (
                    <LucideCopy className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`flex-1 py-2 px-4 ${theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-lg transition-colors`}
                >
                  Close
                </button>
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 py-2 px-4 bg-gradient-to-r ${currentTheme.accentGradient} text-white rounded-lg hover:opacity-90 transition-all text-center flex items-center justify-center gap-2`}
                >
                  <LucideExternalLink className="w-4 h-4" />
                  Open
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
