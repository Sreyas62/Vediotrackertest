
# Technical Documentation: Video Progress Tracking System

## Progress Tracking Implementation

### Interval-Based Progress System

The system uses a sophisticated interval-based approach to track video progress:

1. **Interval Recording**
   ```typescript
   // Interval format: [startTime, endTime]
   type Interval = [number, number];
   ```

- Intervals are recorded continuously during video playback
- Each interval represents an uninterrupted viewing session
- System tracks both current position and continuous viewing position

2. **Interval Merging Algorithm**
   ```typescript
   function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
     if (intervals.length === 0) return [];
     
     const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
     const result = [sorted[0]];
     
     for (let i = 1; i < sorted.length; i++) {
       const current = sorted[i];
       const lastMerged = result[result.length - 1];
       
       if (current[0] <= lastMerged[1]) {
         lastMerged[1] = Math.max(lastMerged[1], current[1]);
       } else {
         result.push(current);
       }
     }
     
     return result;
   }
   ```

This algorithm:
- Sorts intervals by start time
- Merges overlapping intervals
- Maintains unique progress tracking
- Prevents double-counting of rewatched segments

### Progress Calculation

Progress is calculated using the following approach:

1. **Unique Time Calculation**
   ```typescript
   function calculateProgress(intervals: Array<[number, number]>, totalDuration: number): number {
     if (totalDuration === 0) return 0;
     const mergedIntervals = mergeIntervals(intervals);
     const watchedTime = mergedIntervals.reduce((total, [start, end]) => total + (end - start), 0);
     return Math.min((watchedTime / totalDuration) * 100, 100);
   }
   ```

2. **Progress Updates**
- Progress is saved every 10 seconds during playback
- Updates occur on pause/seek events
- MongoDB stores the progress state

### Challenges and Solutions

1. **Challenge**: Accurate Progress Tracking
   - **Solution**: Implemented interval-based tracking with merge logic
   - **Benefit**: Prevents progress inflation from rewatching

2. **Challenge**: Real-time Progress Updates
   - **Solution**: Debounced saves with optimistic updates
   - **Benefit**: Reduces database load while maintaining accuracy

3. **Challenge**: Seek Operations
   - **Solution**: Custom seek handler with position validation
   - **Benefit**: Maintains continuous viewing integrity

4. **Challenge**: Progress Visualization
   - **Solution**: Interactive timeline with segment markers
   - **Benefit**: Clear visual feedback of watched segments

## Implementation Details

### Frontend Components

1. **Video Player Integration**
```typescript
const handleVideoProgress = (progressData: { played: number; playedSeconds: number }) => {
  const currentTime = Math.floor(progressData.playedSeconds);
  if (!currentInterval) {
    setCurrentInterval([currentTime, currentTime + 1]);
  } else {
    // Update interval logic
  }
};
```

2. **Progress Bar Visualization**
```typescript
<ProgressBar
  intervals={allIntervals}
  duration={videoDuration}
  progressPercent={currentProgress}
  onSeekTo={(time) => playerRef.current?.seekTo(time)}
/>
```

### Backend Architecture

1. **Progress Model**
```typescript
interface Progress {
  userId: string;
  videoId: string;
  watchedIntervals: Array<[number, number]>;
  lastPosition: number;
  progressPercent: number;
  totalDuration: number;
}
```

2. **API Endpoints**
- `GET /api/progress`: Retrieves current progress
- `POST /api/progress`: Updates progress with new intervals

### Database Schema

MongoDB collection structure:
```javascript
{
  userId: ObjectId,
  videoId: String,
  watchedIntervals: [[Number]],
  lastPosition: Number,
  progressPercent: Number,
  totalDuration: Number,
  lastContinuousPosition: Number
}
```
