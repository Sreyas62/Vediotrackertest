import { type InsertUser } from "@db/schema";
import { User, Progress } from "./models";

// Define the expected structure for progress data payload
export interface ProgressPayload {
  userId: string;
  videoId: string;
  mergedIntervals: Array<{ start: number; end: number }>;
  totalUniqueWatchedSeconds: number;
  lastKnownPosition: number;
  progressPercentage: number;
  videoDuration: number;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<any | undefined>;
  getUserByEmail(email: string): Promise<any | undefined>;
  createUser(user: InsertUser): Promise<any>;
  
  // Progress operations
  getProgress(userId: string, videoId: string): Promise<any | undefined>; // Should ideally be typed to Progress document
  saveProgress(progressData: ProgressPayload): Promise<any>; // Should ideally be typed to Progress document
}

export class MongoStorage implements IStorage {
  async getUser(id: string): Promise<any | undefined> {
    try {
      return await User.findById(id);
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<any | undefined> {
    try {
      return await User.findOne({ email });
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<any> {
    try {
      const user = new User(insertUser);
      return await user.save();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getProgress(userId: string, videoId: string): Promise<any | undefined> {
    try {
      return await Progress.findOne({ userId, videoId });
    } catch (error) {
      console.error('Error getting progress:', error);
      return undefined;
    }
  }

  async saveProgress(progressData: ProgressPayload): Promise<any> {
    try {
      // Use findOneAndUpdate with upsert to handle both creation and update
      return await Progress.findOneAndUpdate(
        { userId: progressData.userId, videoId: progressData.videoId }, // Query to find the document
        progressData, // The data to insert or update with
        { new: true, upsert: true, setDefaultsOnInsert: true } // Options
      );
    } catch (error) {
      console.error('Error saving progress:', error);
      throw error;
    }
  }
  // The updateProgress method has been removed as saveProgress now handles upsert functionality.
}

export class MemStorage implements IStorage {
  // Using 'any' for map values as a temporary measure. Ideally, define IUserDocument/IProgressDocument.
  private users: Map<string, any>; 
  private progress: Map<string, any>; 
  private currentUserId: number; // Internal counter, can remain number
  private currentProgressId: number; // Internal counter, can remain number

  constructor() {
    this.users = new Map<string, any>();
    this.progress = new Map<string, any>();
    this.currentUserId = 1;
    this.currentProgressId = 1;
  }

  async getUser(id: string): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<any> {
    const id = (this.currentUserId++).toString(); // Store ID as string for map key
    const user: any = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  private getProgressKey(userId: string, videoId: string): string {
    return `${userId}-${videoId}`;
  }

  async getProgress(userId: string, videoId: string): Promise<any | undefined> {
    const key = this.getProgressKey(userId, videoId);
    return this.progress.get(key);
  }

  async saveProgress(progressData: ProgressPayload): Promise<any> {
    const key = this.getProgressKey(progressData.userId, progressData.videoId);
    const existing = this.progress.get(key);

    if (existing) {
      const updated: any = { ...existing, ...progressData };
      this.progress.set(key, updated);
      return updated;
    } else {
      const id = (this.currentProgressId++).toString(); // Internal ID for MemStorage, not part of ProgressPayload
      const newProgress: any = { ...progressData, _memStorageId: id }; // Use a different field for internal ID
      this.progress.set(key, newProgress);
      return newProgress;
    }
  }

  // The updateProgress method has been removed as saveProgress now handles upsert functionality.
}

export const storage = new MongoStorage();
