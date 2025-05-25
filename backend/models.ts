import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Progress Schema
const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: String,
    required: true
  },
  // Stores unique, merged watched intervals
  mergedIntervals: [{
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    _id: false // Don't create an _id for subdocuments in this array
  }],
  // Total seconds of unique video content watched
  totalUniqueWatchedSeconds: {
    type: Number,
    default: 0,
    required: true
  },
  // Last known position of the video player
  lastKnownPosition: {
    type: Number,
    default: 0,
    required: true
  },
  // Overall progress percentage
  progressPercentage: {
    type: Number,
    default: 0,
    required: true,
    min: 0,
    max: 100
  },
  // Total duration of the video
  videoDuration: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
progressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
export const Progress = mongoose.model('Progress', progressSchema);