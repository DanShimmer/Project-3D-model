import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import modelRoutes from "./routes/model";
import generateRoutes from "./routes/generate";
import { initializeAdmin } from "./controllers/admin.controller";
import { MongoMemoryServer } from "mongodb-memory-server";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve desktop app release files for download
const releasePath = path.resolve(__dirname, "../../front-end/release");
app.use("/downloads", express.static(releasePath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.exe')) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
  }
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/generate", generateRoutes);

async function startServer() {
  let mongoUri = process.env.MONGO_URI || "";
  
  // If no valid MongoDB URI, use in-memory MongoDB
  if (!mongoUri || mongoUri.includes("<username>") || mongoUri === "mongodb://127.0.0.1:27017/polyva3d") {
    try {
      // Try connecting to local MongoDB first
      await mongoose.connect("mongodb://127.0.0.1:27017/polyva3d");
      console.log("✅ MongoDB connected (local)");
    } catch (localErr) {
      // Fall back to in-memory MongoDB
      console.log("⚠️ Local MongoDB not available, using in-memory database...");
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB connected (in-memory - data will be lost on restart)");
    }
  } else {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected (cloud)");
  }
  
  const PORT = Number(process.env.PORT) || 5000;
  
  // Initialize admin account
  await initializeAdmin();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`   API routes:`);
    console.log(`   - Auth:     /api/auth`);
    console.log(`   - Admin:    /api/admin`);
    console.log(`   - Models:   /api/models`);
    console.log(`   - Generate: /api/generate\n`);
  });
}

startServer().catch((err: any) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
