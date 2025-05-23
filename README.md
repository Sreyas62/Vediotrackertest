# Video Progress Tracking System

A specialized application for tracking video viewing progress with precision, especially designed for educational content. The system monitors exactly which parts of videos have been watched and provides a detailed visual timeline of progress.

## Features

- **User Authentication**: Secure login and registration system
- **Precise Progress Tracking**: Records exactly which segments of videos have been watched
- **Progress Persistence**: Stores progress in MongoDB so users can resume from where they left off
- **Detailed Visual Timeline**: Shows exactly which parts of the video have been watched
- **Interval-Based Progress**: Only counts unique segments watched, preventing artificial progress inflation
- **Resume Functionality**: Allows users to jump back to their last viewing position

## How to Set Up and Run

1. **Clone the Repository**:
   ```
   git clone <repository-url>
   cd video-progress-tracker
   ```

2. **Install Dependencies**:
   ```
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory with the following:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Run the Application**:
   ```
   npm run dev
   ```

5. **Access the Application**:
   Open your browser and navigate to `http://localhost:5000`

## Design Documentation

### How We Track Watched Intervals

The system uses a sophisticated interval-based tracking approach to monitor exactly which portions of a video have been watched:

1. **Interval Recording**: 
   - As a user watches a video, the system continuously records their viewing as time intervals in the format `[startTime, endTime]`
   - Each interval represents a continuous segment of the video that was watched
   - The intervals are tracked in real-time as the user watches, pauses, or seeks within the video

2. **Interval Management**:
   - When a user pauses or seeks to a different position, the current interval is finalized
   - The system automatically creates a new interval when the user resumes watching
   - Every 10 seconds, the current viewing data is automatically saved to the database

3. **Progress Calculation**:
   - The system calculates total progress as the percentage of unique video content watched
   - This is determined by totaling the duration of all watched intervals and dividing by the total video duration

### How We Merge Intervals to Calculate Unique Progress

To prevent artificial inflation of progress (e.g., from rewatching the same segments), we implement a specialized interval merging algorithm:

```javascript
// mergeIntervals function from lib/intervals.ts
export function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length === 0) return [];
  
  // Sort intervals by start time
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  
  const result: Array<[number, number]> = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = result[result.length - 1];
    
    // If current interval overlaps with the last merged interval, merge them
    if (current[0] <= lastMerged[1]) {
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
    } else {
      // If no overlap, add as a new interval
      result.push(current);
    }
  }
  
  return result;
}
```

This algorithm:
1. Sorts all intervals by their start time
2. Iterates through the sorted intervals
3. Merges overlapping intervals into a single continuous interval
4. Creates a new interval only when there's no overlap with previous intervals

For example:
- Original intervals: `[10, 20], [15, 30], [40, 50]`
- After merging: `[10, 30], [40, 50]`

### Progress Calculation and Skip Handling

The system tracks continuous viewing and handles skips intelligently:

1. **Last Position Tracking**: The system maintains the last continuously watched position rather than the last seek position. This ensures users resume from where they actually left off in their sequential viewing.

2. **Skip Detection**: When a user seeks to a different position, the system:
   - Saves the current viewing interval
   - Maintains the last continuous position
   - Encourages users to watch skipped segments by resuming from the last continuous position

The unique progress percentage is calculated with this formula:

```javascript
// calculateProgress function from lib/intervals.ts
export function calculateProgress(intervals: Array<[number, number]>, totalDuration: number): number {
  if (totalDuration === 0) return 0;
  
  // Calculate the total watched time from merged intervals
  const totalWatched = intervals.reduce((sum, [start, end]) => sum + (end - start), 0);
  
  // Calculate progress as a percentage
  return (totalWatched / totalDuration) * 100;
}
```

### Enhanced Timeline Visualization

The detailed visual timeline shows:
1. A representation of the entire video duration
2. Colored segments showing exactly which parts have been watched
3. Interactive tooltips showing the specific time ranges of each watched segment
4. Time markers for easy reference
5. The ability to click on any segment to jump directly to that position

### Challenges and Solutions

1. **Challenge**: Accurately tracking video progress with YouTube videos
   **Solution**: Implemented ReactPlayer with interval-based tracking that saves progress at regular intervals and on user interactions

2. **Challenge**: Preventing progress inflation from rewatching the same content
   **Solution**: Developed an interval merging algorithm that only counts unique segments watched

3. **Challenge**: Creating a detailed timeline that's both informative and interactive
   **Solution**: Implemented a custom timeline component with detailed hover information and click-to-seek functionality

4. **Challenge**: Ensuring reliable progress persistence
   **Solution**: Integrated MongoDB storage with automatic saving every 10 seconds and on critical events like pause or seek
   
5. **Challenge**: Handling seek operations accurately
   **Solution**: Implemented special handling for seek events to properly close current intervals and start new ones at the seek position

## Technologies Used

- **Frontend**: React, ReactPlayer, TailwindCSS, shadcn/ui
- **Backend**: Express, Node.js
- **Database**: MongoDB
- **Authentication**: JWT-based authentication