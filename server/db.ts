import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://admin:aadmin@progresstracker.aogwpwa.mongodb.net/?retryWrites=true&w=majority&appName=ProgressTracker";

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}