import { type InsertUser } from "@shared/schema";
import { User, Progress } from "./models";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<any | undefined>;
  getUserByEmail(email: string): Promise<any | undefined>;
  createUser(user: InsertUser): Promise<any>;
  
  // Progress operations
  getProgress(userId: string, videoId: string): Promise<any | undefined>;
  saveProgress(progressData: any): Promise<any>;
  updateProgress(userId: string, videoId: string, progressData: any): Promise<any | undefined>;
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

  async saveProgress(progressData: any): Promise<any> {
    try {
      const existing = await Progress.findOne({ 
        userId: progressData.userId, 
        videoId: progressData.videoId 
      });
      
      if (existing) {
        Object.assign(existing, progressData);
        return await existing.save();
      } else {
        const newProgress = new Progress(progressData);
        return await newProgress.save();
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      throw error;
    }
  }

  async updateProgress(userId: string, videoId: string, progressData: any): Promise<any | undefined> {
    try {
      return await Progress.findOneAndUpdate(
        { userId, videoId },
        progressData,
        { new: true }
      );
    } catch (error) {
      console.error('Error updating progress:', error);
      return undefined;
    }
  }
}

export const storage = new MongoStorage();
