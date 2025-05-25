import mongoose from 'mongoose';

export async function connectDB() {
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('MongoDB connection error: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}