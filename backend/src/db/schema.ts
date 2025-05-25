import { pgTable, text, serial, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: text("video_id").notNull(),
  watchedIntervals: json("watched_intervals").$type<Array<[number, number]>>().notNull().default([]),
  lastPosition: integer("last_position").notNull().default(0),
  progressPercent: integer("progress_percent").notNull().default(0),
  totalDuration: integer("total_duration").notNull().default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertProgressSchema = createInsertSchema(progress).pick({
  userId: true,
  videoId: true,
  watchedIntervals: true,
  lastPosition: true,
  progressPercent: true,
  totalDuration: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type Progress = typeof progress.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
