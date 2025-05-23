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
  watchedIntervals: [{
    type: [Number],
    validate: {
      validator: function(arr: number[]) {
        return arr.length === 2;
      },
      message: 'Each interval must have exactly 2 numbers [start, end]'
    }
  }],
  lastPosition: {
    type: Number,
    default: 0
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
progressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
export const Progress = mongoose.model('Progress', progressSchema);