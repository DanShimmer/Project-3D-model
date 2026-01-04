import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LucideUsers,
  LucideBox,
  LucideShield,
  LucideSearch,
  LucideTrash2,
  LucideEdit,
  LucideBan,
  LucideEye,
  LucideChevronLeft,
  LucideChevronRight,
  LucideX,
  LucideCheck,
  LucideLogOut,
  LucideHome,
  LucideRefreshCw,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModels, setUserModels] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showModelsModal, setShowModelsModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", isVerified: false });
  const [actionLoading, setActionLoading] = useState(false);

  const getToken = () => localStorage.getItem("pv_token");

  // Check admin auth
  useEffect(() => {
    const storedUser = localStorage.getItem("pv_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (!parsedUser.isAdmin) {
        navigate("/");
        return;
      }
      setUser(parsedUser);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchQuery,
        status: statusFilter,
      });
      
      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(data.pages);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user models
  const fetchUserModels = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/models`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserModels(data.models);
      }
    } catch (err) {
      console.error("Error fetching user models:", err);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchStats();
      fetchUsers();
    }
  }, [user, currentPage, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.isAdmin) {
        setCurrentPage(1);
        fetchUsers();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle block/unblock
  const handleToggleBlock = async (userId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/toggle-block`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      console.error("Error toggling block:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user and all their models?")) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchUsers();
      }
    } catch (err) {
      console.error("Error updating user:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete model
  const handleDeleteModel = async (modelId) => {
    if (!window.confirm("Delete this model?")) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/models/${modelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setUserModels(userModels.filter((m) => m._id !== modelId));
        fetchStats();
      }
    } catch (err) {
      console.error("Error deleting model:", err);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("pv_token");
    localStorage.removeItem("pv_user");
    navigate("/");
  };

  // Canvas background
  useEffect(() => {
    const canvas = document.getElementById("adminBgCanvas");
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

    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.4 + 0.2,
    }));

    let rafId;
    function draw() {
      ctx.fillStyle = "#04060A";
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168,85,247,${p.alpha})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(168,85,247,0.8)";
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
  }, []);

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen text-white relative">
      <canvas id="adminBgCanvas" className="fixed inset-0 w-full h-full -z-10" />

      {/* Header */}
      <header className="backdrop-blur-sm fixed top-0 w-full z-40 bg-purple-900/20 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <LucideShield className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-xl">Admin Panel</span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <LucideHome className="w-4 h-4" />
                Home
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <LucideLogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.totalUsers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <LucideUsers className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-green-400 mt-2">+{stats?.newUsersThisWeek || 0} this week</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Verified Users</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.verifiedUsers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <LucideCheck className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Blocked Users</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.blockedUsers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <LucideBan className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Models</p>
                <p className="text-3xl font-bold text-white mt-1">{stats?.totalModels || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <LucideBox className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-green-400 mt-2">+{stats?.newModelsThisWeek || 0} this week</p>
          </motion.div>
        </div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-gray-700/30 overflow-hidden"
        >
          {/* Table Header */}
          <div className="p-6 border-b border-gray-700/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">User Management</h2>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-full sm:w-64"
                  />
                </div>

                {/* Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500"
                >
                  <option value="all">All Users</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                  <option value="blocked">Blocked</option>
                </select>

                {/* Refresh */}
                <button
                  onClick={() => {
                    fetchStats();
                    fetchUsers();
                  }}
                  className="p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <LucideRefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/30">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Models</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                            {(u.name || u.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{u.name || "No name"}</p>
                            <p className="text-gray-400 text-sm">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {u.isBlocked ? (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Blocked</span>
                          ) : u.isVerified ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Verified</span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Unverified</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            fetchUserModels(u._id);
                            setShowModelsModal(true);
                          }}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          {u.modelCount} models
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setEditForm({
                                name: u.name || "",
                                email: u.email,
                                isVerified: u.isVerified,
                              });
                              setShowEditModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <LucideEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleBlock(u._id)}
                            disabled={actionLoading}
                            className={`p-2 transition-colors ${
                              u.isBlocked
                                ? "text-green-400 hover:text-green-300"
                                : "text-yellow-400 hover:text-yellow-300"
                            }`}
                            title={u.isBlocked ? "Unblock" : "Block"}
                          >
                            <LucideBan className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            disabled={actionLoading}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <LucideTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-700/30 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                >
                  <LucideChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                >
                  <LucideChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[400px] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Edit User</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <LucideX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isVerified"
                    checked={editForm.isVerified}
                    onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-500"
                  />
                  <label htmlFor="isVerified" className="text-sm text-gray-300">Verified</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditUser}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Models Modal */}
      <AnimatePresence>
        {showModelsModal && selectedUser && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">User Models</h3>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setShowModelsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <LucideX className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {userModels.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No models found</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {userModels.map((model) => (
                      <div
                        key={model._id}
                        className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
                      >
                        <div className="aspect-video bg-gray-700/50 rounded-lg mb-3 flex items-center justify-center">
                          {model.thumbnailUrl ? (
                            <img
                              src={model.thumbnailUrl}
                              alt={model.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <LucideBox className="w-8 h-8 text-gray-500" />
                          )}
                        </div>
                        <h4 className="font-medium text-white truncate">{model.name}</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {model.type} • {new Date(model.createdAt).toLocaleDateString()}
                        </p>
                        {model.prompt && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{model.prompt}</p>
                        )}
                        <button
                          onClick={() => handleDeleteModel(model._id)}
                          className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <LucideTrash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
