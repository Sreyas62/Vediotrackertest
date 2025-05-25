import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WatchedInterval, mergeIntervals, calculateTotalUniqueWatched, calculateProgressPercentage } from '../lib/progressUtils';
import { getVideoProgress, saveVideoProgress, VideoProgressData } from '../lib/api';

// Assume this comes from auth context or similar
const MOCK_USER_TOKEN = 'your-jwt-token'; 
// Assume this is passed as a prop or derived from the route
const MOCK_VIDEO_ID = 'lecture123'; 
// Replace with your actual video source
const VIDEO_SRC = '/sample.mp4'; 

const Lecture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // For tracking raw segments before merging
  const [rawWatchedSegments, setRawWatchedSegments] = useState<WatchedInterval[]>([]);
  // For storing unique, merged intervals from backend and local calculations
  const [mergedIntervals, setMergedIntervals] = useState<WatchedInterval[]>([]);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [lastKnownPosition, setLastKnownPosition] = useState<number>(0);

  // To keep track of the start of a continuous watching segment
  const currentSegmentStartRef = useRef<number | null>(null);
  // To avoid saving too frequently
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateAndSetProgress = useCallback((currentMergedIntervals: WatchedInterval[], videoDuration: number) => {
    const totalWatched = calculateTotalUniqueWatched(currentMergedIntervals);
    const percentage = calculateProgressPercentage(totalWatched, videoDuration);
    setProgressPercentage(percentage);
    setMergedIntervals(currentMergedIntervals); // Update state with the latest merged intervals
  }, []);

  // Load progress from backend
  useEffect(() => {
    if (!MOCK_USER_TOKEN || !MOCK_VIDEO_ID || !videoRef.current) return;

    const loadProgress = async () => {
      try {
        const data = await getVideoProgress(MOCK_VIDEO_ID, MOCK_USER_TOKEN);
        if (data && videoRef.current) {
          setMergedIntervals(data.mergedIntervals || []);
          setLastKnownPosition(data.lastKnownPosition || 0);
          // Ensure duration is available before calculating progress from loaded data
          if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
            setDuration(videoRef.current.duration);
            calculateAndSetProgress(data.mergedIntervals || [], videoRef.current.duration);
            videoRef.current.currentTime = data.lastKnownPosition || 0;
          } else {
            // If duration is not yet available, store and apply later in onLoadedMetadata
            setMergedIntervals(data.mergedIntervals || []);
          }
          setProgressPercentage(data.progressPercentage || 0); 
        }
      } catch (error) {
        console.error('Failed to load video progress:', error);
        // Initialize with empty progress if load fails
        setMergedIntervals([]);
        setProgressPercentage(0);
        setLastKnownPosition(0);
      }
    };
    loadProgress();
  }, [MOCK_VIDEO_ID, MOCK_USER_TOKEN, calculateAndSetProgress]); // videoRef.current removed from deps

  const handleSaveProgress = useCallback(() => {
    if (!videoRef.current || !MOCK_USER_TOKEN || !MOCK_VIDEO_ID || duration <= 0) return;

    const currentVideoTime = videoRef.current.currentTime;
    let finalIntervals = [...mergedIntervals];

    // If there's an active segment being watched, add it to raw segments before merging
    if (currentSegmentStartRef.current !== null && currentVideoTime > currentSegmentStartRef.current) {
      const newSegment = { start: currentSegmentStartRef.current, end: currentVideoTime };
      finalIntervals = mergeIntervals([...rawWatchedSegments, ...mergedIntervals, newSegment]);
      // No need to setRawWatchedSegments here as we are saving immediately
    } else {
      finalIntervals = mergeIntervals([...rawWatchedSegments, ...mergedIntervals]);
    }
    
    const totalWatched = calculateTotalUniqueWatched(finalIntervals);
    const percentage = calculateProgressPercentage(totalWatched, duration);

    const progressData: Omit<VideoProgressData, 'userId' | 'createdAt' | 'updatedAt' | 'videoId'> = {
      mergedIntervals: finalIntervals,
      totalUniqueWatchedSeconds: totalWatched,
      lastKnownPosition: currentVideoTime,
      progressPercentage: percentage,
      videoDuration: duration,
    };

    saveVideoProgress(MOCK_VIDEO_ID, progressData, MOCK_USER_TOKEN)
      .then(savedData => {
        console.log('Progress saved:', savedData);
        // Update local state with confirmed saved data if necessary, especially mergedIntervals
        setMergedIntervals(savedData.mergedIntervals);
        setProgressPercentage(savedData.progressPercentage);
        setLastKnownPosition(savedData.lastKnownPosition);
        setRawWatchedSegments([]); // Clear raw segments after successful save
      })
      .catch(error => console.error('Failed to save video progress:', error));
  }, [mergedIntervals, rawWatchedSegments, duration, MOCK_VIDEO_ID, MOCK_USER_TOKEN]);

  const debouncedSaveProgress = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(handleSaveProgress, 2000); // Save after 2 seconds of inactivity
  }, [handleSaveProgress]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const videoDuration = videoRef.current.duration;
    setDuration(videoDuration);
    // If progress was loaded before duration was known, apply it now
    if (mergedIntervals.length > 0 || lastKnownPosition > 0) {
        calculateAndSetProgress(mergedIntervals, videoDuration);
        videoRef.current.currentTime = lastKnownPosition;
    } else {
        // This case implies no progress was loaded, or it was empty.
        // Ensure UI reflects this, e.g., progress is 0%.
        calculateAndSetProgress([], videoDuration);
    }
  };

  const handlePlay = () => {
    if (!videoRef.current) return;
    setIsPlaying(true);
    currentSegmentStartRef.current = videoRef.current.currentTime;
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (videoRef.current && currentSegmentStartRef.current !== null) {
      const newSegment = { start: currentSegmentStartRef.current, end: videoRef.current.currentTime };
      if (newSegment.end > newSegment.start) { // Only add if it's a valid segment
        setRawWatchedSegments(prev => [...prev, newSegment]);
      }
      currentSegmentStartRef.current = null;
      debouncedSaveProgress();
    }
  };
  
  const handleSeeking = () => {
    if (!videoRef.current) return;
    // If seeking happens while playing, the current segment ends.
    if (isPlaying && currentSegmentStartRef.current !== null) {
      const newSegment = { start: currentSegmentStartRef.current, end: videoRef.current.currentTime };
       if (newSegment.end > newSegment.start) {
         setRawWatchedSegments(prev => [...prev, newSegment]);
       }
    }
    // After seeking, the new currentTime will be the start of a new segment when play resumes.
    // If it was playing, it will likely trigger a 'play' event or user has to press play.
    // If it was paused, the currentSegmentStartRef remains null until play.
    currentSegmentStartRef.current = videoRef.current.currentTime; 
    // Consider saving progress on seek if it's a significant jump or user might exit
    debouncedSaveProgress();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    // Potentially save progress periodically if needed, but debouncedSave on pause/seek is often enough
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (videoRef.current && currentSegmentStartRef.current !== null) {
      const newSegment = { start: currentSegmentStartRef.current, end: videoRef.current.duration }; // Video ended, segment goes to full duration
      if (newSegment.end > newSegment.start) {
        setRawWatchedSegments(prev => [...prev, newSegment]);
      }
    }
    currentSegmentStartRef.current = null;
    handleSaveProgress(); // Save immediately when video ends
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Also, attempt to save progress one last time if a segment was active
      // This is a bit tricky because the component is unmounting
      // For simplicity, we rely on pause/ended/beforeunload for robust saving
    };
  }, []);

  // Optional: Save progress when user tries to leave the page
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // handleSaveProgress(); // This might not complete in time or be reliable
      // A more robust way is to send a beacon, but that's more complex.
      // For now, we rely on pause/ended events.
      if (isPlaying && videoRef.current && currentSegmentStartRef.current !== null) {
        // If playing, quickly form the last segment and attempt a synchronous save if possible
        // Or, ensure frequent enough debounced saves.
        console.log('Attempting to save progress on page unload.');
        handleSaveProgress(); // This is best-effort
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isPlaying, handleSaveProgress]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Lecture Video</h1>
      <video
        ref={videoRef}
        controls
        width="800"
        src={VIDEO_SRC} // Make sure this video file exists in your public folder or is a valid URL
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeking={handleSeeking}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={{ backgroundColor: '#000' }}
      />
      <div>
        <p>Time: {currentTime.toFixed(2)}s / {duration.toFixed(2)}s</p>
        <p>Progress: {progressPercentage.toFixed(2)}%</p>
        <p>Last Saved Position: {lastKnownPosition.toFixed(2)}s</p>
        <div style={{ marginTop: '10px' }}>
          <p>Watched Intervals (Merged):</p>
          <ul style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #ccc', padding: '5px' }}>
            {mergedIntervals.map((interval, index) => (
              <li key={index}>{`[${interval.start.toFixed(2)}s - ${interval.end.toFixed(2)}s]`}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Lecture;
