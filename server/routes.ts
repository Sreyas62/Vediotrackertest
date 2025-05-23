import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertProgressSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Utility function to merge overlapping intervals
function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length === 0) return [];
  
  const sorted = intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];
    
    if (current[0] <= lastMerged[1]) {
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

// Calculate progress percentage based on watched intervals and total duration
function calculateProgress(intervals: Array<[number, number]>, totalDuration: number): number {
  if (totalDuration === 0) return 0;
  
  const mergedIntervals = mergeIntervals(intervals);
  const watchedTime = mergedIntervals.reduce((total, [start, end]) => total + (end - start), 0);
  
  return Math.min(Math.round((watchedTime / totalDuration) * 100), 100);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
      });
      
      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
      
      res.status(201).json({
        message: "User created successfully",
        token,
        user: { id: user._id, email: user.email }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({
        message: "Login successful",
        token,
        user: { id: user._id, email: user.email }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Progress routes
  app.get("/api/progress", authenticateToken, async (req, res) => {
    try {
      const { videoId } = req.query;
      
      if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({ message: "Video ID is required" });
      }
      
      const progress = await storage.getProgress(req.userId, videoId);
      
      if (!progress) {
        return res.json({
          watchedIntervals: [],
          lastPosition: 0,
          progressPercent: 0,
          totalDuration: 0
        });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Get progress error:", error);
      res.status(500).json({ message: "Failed to retrieve progress" });
    }
  });

  app.post("/api/progress", authenticateToken, async (req, res) => {
    try {
      const progressData = {
        userId: req.userId,
        videoId: req.body.videoId,
        watchedIntervals: req.body.watchedIntervals || [],
        lastPosition: req.body.lastPosition || 0,
        totalDuration: req.body.totalDuration || 0,
        progressPercent: 0 // Will be calculated
      };
      
      // Merge new intervals with existing ones
      const existingProgress = await storage.getProgress(req.userId, progressData.videoId);
      if (existingProgress) {
        const allIntervals = [...existingProgress.watchedIntervals, ...progressData.watchedIntervals];
        progressData.watchedIntervals = mergeIntervals(allIntervals);
      } else {
        progressData.watchedIntervals = mergeIntervals(progressData.watchedIntervals);
      }
      
      // Calculate progress percentage
      progressData.progressPercent = calculateProgress(progressData.watchedIntervals, progressData.totalDuration);
      
      const savedProgress = await storage.saveProgress(progressData);
      
      res.json(savedProgress);
    } catch (error) {
      console.error("Save progress error:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
