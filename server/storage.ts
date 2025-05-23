import { users, progress, type User, type InsertUser, type Progress, type InsertProgress } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Progress operations
  getProgress(userId: number, videoId: string): Promise<Progress | undefined>;
  saveProgress(progressData: Omit<InsertProgress, 'id'>): Promise<Progress>;
  updateProgress(userId: number, videoId: string, progressData: Partial<InsertProgress>): Promise<Progress | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private progress: Map<string, Progress>;
  private currentUserId: number;
  private currentProgressId: number;

  constructor() {
    this.users = new Map();
    this.progress = new Map();
    this.currentUserId = 1;
    this.currentProgressId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  private getProgressKey(userId: number, videoId: string): string {
    return `${userId}-${videoId}`;
  }

  async getProgress(userId: number, videoId: string): Promise<Progress | undefined> {
    const key = this.getProgressKey(userId, videoId);
    return this.progress.get(key);
  }

  async saveProgress(progressData: Omit<InsertProgress, 'id'>): Promise<Progress> {
    const key = this.getProgressKey(progressData.userId, progressData.videoId);
    const existing = this.progress.get(key);
    
    if (existing) {
      const updated: Progress = { ...existing, ...progressData };
      this.progress.set(key, updated);
      return updated;
    } else {
      const id = this.currentProgressId++;
      const newProgress: Progress = { ...progressData, id };
      this.progress.set(key, newProgress);
      return newProgress;
    }
  }

  async updateProgress(userId: number, videoId: string, progressData: Partial<InsertProgress>): Promise<Progress | undefined> {
    const key = this.getProgressKey(userId, videoId);
    const existing = this.progress.get(key);
    
    if (existing) {
      const updated: Progress = { ...existing, ...progressData };
      this.progress.set(key, updated);
      return updated;
    }
    
    return undefined;
  }
}

export const storage = new MemStorage();
