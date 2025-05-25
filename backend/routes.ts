import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertProgressSchema } from "@db/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


// Define a custom request type that includes userId
interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Middleware to verify JWT token
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not defined. Please set it in the environment variables.");
    return res.status(500).json({ message: 'Internal server error: JWT secret not configured.' });
  }

  try {
    const decoded = jwt.verify(token, secret) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};



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
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("JWT_SECRET is not defined for token signing in /register. Please set it in the environment variables.");
        return res.status(500).json({ message: 'Internal server error: JWT secret not configured for signing.' });
      }
      const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '24h' });
      
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
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("JWT_SECRET is not defined for token signing in /login. Please set it in the environment variables.");
        return res.status(500).json({ message: 'Internal server error: JWT secret not configured for signing.' });
      }
      const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '24h' });
      
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
  app.get("/api/progress/:videoId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { videoId } = req.params;
      if (!req.userId) {
        return res.status(401).json({ message: 'Authentication error: User ID missing.' });
      }
      
      const progress = await storage.getProgress(req.userId, videoId);
      
      if (!progress) {
        // Return default structure if no progress found for this video
        return res.json({
          userId: req.userId,
          videoId,
          mergedIntervals: [],
          totalUniqueWatchedSeconds: 0,
          lastKnownPosition: 0,
          progressPercentage: 0,
          videoDuration: 0, // Client might send this on first save
        });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Get progress error:", error);
      res.status(500).json({ message: "Failed to retrieve progress" });
    }
  });

  app.post("/api/progress/:videoId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { videoId } = req.params;
      if (!req.userId) {
        return res.status(401).json({ message: 'Authentication error: User ID missing.' });
      }
      // TODO: Update insertProgressSchema in @shared/schema to validate this new body
      // const validatedData = insertProgressSchema.parse(req.body);

      const progressPayload = {
        userId: req.userId,
        videoId,
        mergedIntervals: req.body.mergedIntervals, // Client sends pre-merged intervals
        totalUniqueWatchedSeconds: req.body.totalUniqueWatchedSeconds,
        lastKnownPosition: req.body.lastKnownPosition,
        progressPercentage: req.body.progressPercentage,
        videoDuration: req.body.videoDuration
      };

      // Validate payload structure (basic check, rely on schema for thorough validation)
      if (!progressPayload.mergedIntervals || 
          typeof progressPayload.totalUniqueWatchedSeconds !== 'number' ||
          typeof progressPayload.lastKnownPosition !== 'number' ||
          typeof progressPayload.progressPercentage !== 'number' ||
          typeof progressPayload.videoDuration !== 'number') {
        return res.status(400).json({ message: "Invalid progress data payload" });
      }

      const savedProgress = await storage.saveProgress(progressPayload);
      res.json(savedProgress);
    } catch (error) {
      console.error("Save progress error:", error);
      // if (error instanceof ZodError) { // If using Zod for validation
      //   return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      // }
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
