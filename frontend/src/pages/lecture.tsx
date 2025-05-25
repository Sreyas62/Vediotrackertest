import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import { ProgressBar } from '@/components/progress-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { WatchedInterval, mergeIntervals as mergeIntervalsNew, calculateTotalUniqueWatched, calculateProgressPercentage } from '../lib/progressUtils'; // Renamed mergeIntervals to avoid conflict if old one is used by ProgressBar
import { getVideoProgress, saveVideoProgress, VideoProgressData } from '../lib/api';
import { formatTime } from '@/lib/intervals'; // Keep for UI display
import { Play, Pause, LogOut } from 'lucide-react';

// Extract YouTube Video ID from URL
const YOUTUBE_URL = "https://youtu.be/2YIgGdUtbXM?si=AvWj62Y3p2wtA7-g";
const getYouTubeID = (url: string): string => {
  const arr = url.split(/(?:vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  return arr[1] !== undefined ? arr[1].split(/[?&]/)[0] : url;
};
const YOUTUBE_VIDEO_ID = getYouTubeID(YOUTUBE_URL); // This will be '2YIgGdUtbXM'

export default function Lecture() {
  const { user, logout, token } = useAuth();
  const { toast } = useToast();

  // New state variables for react-youtube player and progress
  const [ytPlayer, setYtPlayer] = useState<YouTubePlayer | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false); // Keep for loading indicators

  const [rawWatchedSegments, setRawWatchedSegments] = useState<WatchedInterval[]>([]);
  const [mergedIntervals, setMergedIntervals] = useState<WatchedInterval[]>([]);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);

  const [liveProgressPercentage, setLiveProgressPercentage] = useState<number>(0);
  const [lastKnownPosition, setLastKnownPosition] = useState<number>(0);

  const currentSegmentStartRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPolledTimeRef = useRef<number>(0);

  const updateLiveProgressDisplay = useCallback((currentLiveIntervals: WatchedInterval[], currentVideoDuration: number) => {
    if (currentVideoDuration <= 0) {
      setLiveProgressPercentage(0);
      // setLiveMergedIntervals was removed as liveMergedIntervals is now from useMemo
      return;
    }
    const totalWatched = calculateTotalUniqueWatched(currentLiveIntervals);
    const percentage = calculateProgressPercentage(totalWatched, currentVideoDuration);
    setLiveProgressPercentage(percentage);
    // setLiveMergedIntervals was removed
    // console.log('[Lecture.tsx] Live progress updated:', { totalWatched, percentage, currentVideoDuration, currentLiveIntervals });
  }, [setLiveProgressPercentage]);

  const calculateAndSetProgressDisplay = useCallback((currentMergedIntervals: WatchedInterval[], currentVideoDuration: number) => {
    if (currentVideoDuration <= 0) {
        setProgressPercentage(0);
        setMergedIntervals(currentMergedIntervals);
        return;
    }
    const totalWatched = calculateTotalUniqueWatched(currentMergedIntervals);
    const percentage = calculateProgressPercentage(totalWatched, currentVideoDuration);
    setProgressPercentage(percentage);
    setMergedIntervals(currentMergedIntervals);
  }, []);

  // Load progress from backend
  const loadInitialProgress = useCallback(async (currentPlayer: YouTubePlayer) => {
    if (!token || !YOUTUBE_VIDEO_ID || !currentPlayer) return;
    setIsLoading(true);
    try {
      const data = await getVideoProgress(YOUTUBE_VIDEO_ID, token);
      const fetchedVideoDuration = await currentPlayer.getDuration();
      setVideoDuration(fetchedVideoDuration);

      if (data) {
        setMergedIntervals(data.mergedIntervals || []);
        setLastKnownPosition(data.lastKnownPosition || 0);
        // setProgressPercentage(data.progressPercentage || 0); // This will be recalculated
        
        if (fetchedVideoDuration > 0) {
          calculateAndSetProgressDisplay(data.mergedIntervals || [], fetchedVideoDuration);
        }
        if (currentPlayer && typeof currentPlayer.seekTo === 'function' && data.lastKnownPosition) {
            currentPlayer.seekTo(data.lastKnownPosition, true);
        }
      } else {
        if (fetchedVideoDuration > 0) calculateAndSetProgressDisplay([], fetchedVideoDuration);
      }
    } catch (error) {
      console.error('[Lecture.tsx] Failed to load video progress:', error);
      toast({ title: "Failed to load progress", description: (error as Error).message, variant: "destructive" });
      const fetchedVideoDuration = ytPlayer ? await ytPlayer.getDuration() : 0;
       if (fetchedVideoDuration > 0) {
         setVideoDuration(fetchedVideoDuration);
         calculateAndSetProgressDisplay([], fetchedVideoDuration);
       }
    } finally {
        setIsLoading(false);
    }
  }, [token, YOUTUBE_VIDEO_ID]); // Removed ytPlayer from useCallback dependencies

  // Save progress to backend
  const handleSaveProgress = useCallback(async () => {
    if (!ytPlayer || !token || !YOUTUBE_VIDEO_ID || videoDuration <= 0) {
      return;
    }
    setIsLoading(true);
    // currentSegmentStartRef.current should be null here if player is paused/ended, segment already added to rawWatchedSegments
    // If forcing save while playing, that's an edge case not fully handled by this flow yet.
    const currentVideoTime = await ytPlayer.getCurrentTime(); // Get current time for lastKnownPosition

    const segmentsToProcess = [...mergedIntervals, ...rawWatchedSegments];
    const finalMergedIntervals = mergeIntervalsNew(segmentsToProcess);
    const totalWatched = calculateTotalUniqueWatched(finalMergedIntervals);
    const percentage = calculateProgressPercentage(totalWatched, videoDuration);

    const progressDataToSave: Omit<VideoProgressData, 'userId' | 'videoId' | 'createdAt' | 'updatedAt'> = {
      mergedIntervals: finalMergedIntervals,
      totalUniqueWatchedSeconds: totalWatched,
      lastKnownPosition: currentVideoTime, // Use the most recent time for lastKnownPosition
      progressPercentage: percentage,
      videoDuration: videoDuration,
    };

    try {
      const savedData = await saveVideoProgress(YOUTUBE_VIDEO_ID, progressDataToSave, token);
      setMergedIntervals(savedData.mergedIntervals);
      setProgressPercentage(savedData.progressPercentage);
      setLastKnownPosition(savedData.lastKnownPosition);
      setRawWatchedSegments([]); // Clear raw segments after successful save and merge
      toast({ title: "Progress Saved", description: `Progress saved at ${formatTime(savedData.lastKnownPosition)}.` });
    } catch (error) {
      console.error('[Lecture.tsx] Failed to save video progress:', error);
      toast({ title: "Failed to save progress", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [ytPlayer, token, videoDuration, rawWatchedSegments, mergedIntervals, toast, calculateAndSetProgressDisplay]);

  const handleSaveProgressRef = useRef(handleSaveProgress);

  useEffect(() => {
    handleSaveProgressRef.current = handleSaveProgress;
  }, [handleSaveProgress]);

  const debouncedSaveProgress = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveProgressRef.current(); // Call the latest version via ref
    }, 3000);
  }, []); // Dependency array is empty as it uses the ref

  const stopPollingTime = useCallback(() => {
    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    intervalTimerRef.current = null;
  }, []);

  const startPollingTime = useCallback(() => {
    stopPollingTime();
    if (!ytPlayer) return;
    intervalTimerRef.current = setInterval(async () => {
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        const newTime = await ytPlayer.getCurrentTime();
        setCurrentTime(newTime);
      }
    }, 250);
  }, [ytPlayer, stopPollingTime]);

  // YouTube Player Event Handlers
  // Calculate liveMergedIntervals for progress display
  const liveMergedIntervals = useMemo(() => {
    let intervalsToMerge = [...mergedIntervals, ...rawWatchedSegments];
    let activeSegmentForLog: WatchedInterval | null = null;

    if (isPlaying && currentSegmentStartRef.current !== null && currentTime > currentSegmentStartRef.current) {
      const activeSegment = { start: currentSegmentStartRef.current, end: currentTime };
      intervalsToMerge.push(activeSegment);
      activeSegmentForLog = activeSegment;
    }
    const result = mergeIntervalsNew(intervalsToMerge);
    return result;
  }, [mergedIntervals, rawWatchedSegments, isPlaying, currentTime, currentSegmentStartRef.current]); // currentSegmentStartRef.current is needed here

  useEffect(() => {
    if (videoDuration > 0) {
      updateLiveProgressDisplay(liveMergedIntervals, videoDuration);
    } else {
      // If videoDuration is not yet known, reflect empty/default live state
      updateLiveProgressDisplay([], 0); // Pass empty array for intervals if duration is 0
    }
    // Keep lastPolledTimeRef in sync with the latest currentTime from polling
    lastPolledTimeRef.current = currentTime;
  }, [liveMergedIntervals, videoDuration, updateLiveProgressDisplay, currentTime]);

  // useEffect to load initial progress (ensure this is not duplicated)
  useEffect(() => {
    if (ytPlayer && token) {
      loadInitialProgress(ytPlayer);
    }
  }, [ytPlayer, token, loadInitialProgress]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    console.log('[Lecture.tsx] YouTube Player ready.');
    setYtPlayer(event.target);
    // loadInitialProgress will be called by the useEffect dependent on ytPlayer and token
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = async (event) => {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
    
    // Note: 'currentTime' is the polled state variable for current video time.
    // 'eventTime' here is the time when the event fired, fetched fresh.
    const eventTime = await ytPlayer.getCurrentTime();
    console.log('[Lecture.tsx] Player state changed:', event.data, 'at time:', eventTime);

    switch (event.data) {
      case YouTube.PlayerState.PLAYING:
        const playStartTime = await ytPlayer.getCurrentTime(); // Get the most accurate time for when PLAYING actually starts
        setIsPlaying(true);

        if (currentSegmentStartRef.current !== null) {
          // A segment was active, meaning an interruption (like a seek) occurred.
          // Use lastPolledTimeRef.current as the end of that interrupted segment.
          if (lastPolledTimeRef.current > currentSegmentStartRef.current) { // Ensure the segment was valid
            const oldSegment = { start: currentSegmentStartRef.current, end: lastPolledTimeRef.current };
            setRawWatchedSegments(prev => [...prev, oldSegment]);
            console.log('[Lecture.tsx] Segment ended by interruption/seek (PLAYING state), using lastPolledTimeRef, added to raw:', oldSegment);
          } else {
            console.log('[Lecture.tsx] Interrupted segment (PLAYING state) was invalid (lastPolledTimeRef <= start), not adding. Start:', currentSegmentStartRef.current, 'End(lastPolledTimeRef):', lastPolledTimeRef.current);
          }
        }
        
        currentSegmentStartRef.current = playStartTime; // Start new segment from actual play start time
        console.log('[Lecture.tsx] New segment started (PLAYING). StartRef:', currentSegmentStartRef.current);
        startPollingTime();

        if (videoDuration === 0 && typeof ytPlayer.getDuration === 'function') {
          const fetchedVideoDuration = await ytPlayer.getDuration();
          if (fetchedVideoDuration > 0) setVideoDuration(fetchedVideoDuration);
        }
        break;

      case YouTube.PlayerState.PAUSED:
        setIsPlaying(false);
        stopPollingTime();
        // If a segment was active, close it using lastPolledTimeRef.current.
        // This handles cases where a seek operation (while playing) results in a PAUSED state.
        // eventTime would be post-seek, lastPolledTimeRef.current is pre-seek.
        if (currentSegmentStartRef.current !== null && lastPolledTimeRef.current > currentSegmentStartRef.current) {
            const newSegment = { start: currentSegmentStartRef.current, end: lastPolledTimeRef.current };
            setRawWatchedSegments(prev => [...prev, newSegment]);
            console.log('[Lecture.tsx] New raw segment added (PAUSED), using lastPolledTimeRef:', newSegment);
        } else if (currentSegmentStartRef.current !== null) {
            // Log if segment was active but invalid (e.g., lastPolledTimeRef.current <= start)
            console.log('[Lecture.tsx] PAUSED: Active segment invalid based on lastPolledTimeRef. StartRef:', currentSegmentStartRef.current, 'lastPolledTimeRef:', lastPolledTimeRef.current);
        }
        currentSegmentStartRef.current = null; // Segment ended
        debouncedSaveProgress();
        break;

      case YouTube.PlayerState.ENDED:
        setIsPlaying(false);
        stopPollingTime();
        // Use lastPolledTimeRef.current as the end point for the segment,
        // as this reflects the last known position during active playback before the ENDED event.
        if (currentSegmentStartRef.current !== null && lastPolledTimeRef.current > currentSegmentStartRef.current) {
            // Ensure lastPolledTimeRef.current is not beyond videoDuration.
            const segmentEnd = Math.min(lastPolledTimeRef.current, videoDuration);
            if (segmentEnd > currentSegmentStartRef.current) { // Final check for validity
                const finalSegment = { start: currentSegmentStartRef.current, end: segmentEnd };
                setRawWatchedSegments(prev => [...prev, finalSegment]);
                console.log('[Lecture.tsx] New raw segment added (ENDED), using lastPolledTimeRef:', finalSegment);
            } else {
                 console.log('[Lecture.tsx] ENDED: Segment invalid after capping with videoDuration. StartRef:', currentSegmentStartRef.current, 'lastPolledTimeRef:', lastPolledTimeRef.current, 'CappedEnd:', segmentEnd, 'VideoDuration:', videoDuration);
            }
        } else if (currentSegmentStartRef.current !== null) {
            console.log('[Lecture.tsx] ENDED: Segment invalid or zero-length based on lastPolledTimeRef. StartRef:', currentSegmentStartRef.current, 'lastPolledTimeRef:', lastPolledTimeRef.current, 'VideoDuration:', videoDuration);
        }
        currentSegmentStartRef.current = null; // Segment ended
        debouncedSaveProgress();
        break;

      case YouTube.PlayerState.BUFFERING:
        stopPollingTime(); // Stop polling immediately.
        setIsPlaying(false); // Video is not actively playing during buffer; prevents liveMergedIntervals from adding active segment.
        
        const preBufferCurrentTimeOnBuffer = lastPolledTimeRef.current; // Capture last polled time before it's affected by the new position.

        if (currentSegmentStartRef.current !== null && preBufferCurrentTimeOnBuffer > currentSegmentStartRef.current) {
          const segmentBeforeBuffer = { start: currentSegmentStartRef.current, end: preBufferCurrentTimeOnBuffer };
          setRawWatchedSegments(prev => [...prev, segmentBeforeBuffer]);
          console.log('[Lecture.tsx] Segment ended by BUFFERING, added to raw:', segmentBeforeBuffer);
        }
        
        console.log(`[Lecture.tsx] Player buffering. Closed active segment ending at ${preBufferCurrentTimeOnBuffer}. currentSegmentStartRef was ${currentSegmentStartRef.current}, now nulled. isPlaying set to false. Event time (new position): ${eventTime}`);
        currentSegmentStartRef.current = null; // Nullify to prevent active segment spanning the buffer/seek.
        break;

    } // Closes switch
  }; // Closes onPlayerStateChange

  useEffect(() => {
    // This effect handles cleanup of polling and save timeouts on unmount or when stopPollingTime changes.
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      stopPollingTime();
    };
  }, [stopPollingTime]); // Assuming stopPollingTime is memoized or stable.

  // Save progress when user tries to leave the page (best effort)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPlaying && ytPlayer && currentSegmentStartRef.current !== null) {
        // Note: Most browsers will not allow async operations here to complete reliably.
        // Synchronous XHR is deprecated and not recommended.
        // This is more of a best-effort, a proper solution might involve navigator.sendBeacon if applicable.
        console.log('[Lecture.tsx] Attempting to save progress on page unload (best effort).');
        // Consider if immediate save is critical or if debounced save is sufficient.
        // handleSaveProgress(); // This might not complete
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPlaying, ytPlayer, handleSaveProgress]);

  const playerOptions: YouTubeProps['opts'] = {
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      // origin: window.location.origin, // Consider if needed for your deployment
    },
  };

  const handlePlayPause = () => {
    console.log('[Lecture.tsx] handlePlayPause clicked. Current isPlaying state:', isPlaying, 'Player:', ytPlayer);
    if (!ytPlayer) return;
    if (isPlaying) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
    // The isPlaying state will be updated by onPlayerStateChange
  };

  const handleLogout = () => {
    logout();
  };
  
  const handlePlayPauseFromPosition = () => {
    if (!ytPlayer) return;

    if (isPlaying) {
      ytPlayer.pauseVideo();
      toast({
        title: "Video Paused",
        description: `Paused at ${formatTime(currentTime)}`,
      });
    } else {
      // If lastKnownPosition is very close to the start, or 0, just play.
      // Otherwise, seek to lastKnownPosition then play.
      // This also handles playing from start if video hasn't been played yet.
      const targetTime = lastKnownPosition > 1 ? lastKnownPosition : 0;
      ytPlayer.seekTo(targetTime, true);
      ytPlayer.playVideo();
      toast({
        title: targetTime > 0 ? "Resuming video" : "Playing video",
        description: targetTime > 0 ? `Resuming from ${formatTime(targetTime)}` : "Playing from start",
      });
    }
  };

  // Prepare intervals for ProgressBar using live data
  const liveProgressBarIntervals = liveMergedIntervals.map(iv => [iv.start, iv.end] as [number, number]);

  console.log('[Lecture.tsx] Rendering component. isPlaying:', isPlaying, 'currentTime:', currentTime, 'videoDuration:', videoDuration);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Play className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">LearnTracker</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Node.js Fundamentals</h1>
          <p className="text-gray-600">Track your progress as you learn Node.js concepts</p>
        </div>

        <Card className="overflow-hidden mb-6">
          <div className="aspect-video bg-black flex justify-center items-center">
            {YOUTUBE_VIDEO_ID ? (
              <YouTube
                videoId={YOUTUBE_VIDEO_ID}
                opts={playerOptions}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
                onError={(e: any) => console.error('[Lecture.tsx] YouTube Player Error:', e)}
                className='w-full h-full'
              />
            ) : (
              <p>Invalid YouTube Video URL</p>
            )}
          </div>
          
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Video Progress</h3>
                <p className="text-sm text-gray-600">
                  Current Time: {formatTime(currentTime)} / {formatTime(videoDuration)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-secondary">
                  {liveProgressPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
            
            <ProgressBar
              intervals={liveProgressBarIntervals} // Use live mapped intervals
              duration={videoDuration}
              progressPercent={liveProgressPercentage} // Use live percentage
              onSeekTo={(time) => {
                if (ytPlayer) {
                  ytPlayer.seekTo(time, true);
                  toast({ title: "Seeking to position", description: "Jumping to a new time." });
                }
              }}
            />
            
            <div className="flex items-center justify-between text-sm mt-3">
              <span className="text-gray-600">Last saved position</span>
              <span className="font-medium">{formatTime(lastKnownPosition)}</span>
            </div>
            
            {/* Button to Play/Pause, always visible if player is ready */}
            {ytPlayer && (
              <Button 
                onClick={handlePlayPauseFromPosition} // Updated function name
                className="w-full mt-4"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isPlaying ? 'Pause' : (lastKnownPosition > 1 ? `Continue from ${formatTime(lastKnownPosition)}` : 'Play from Start')}
              </Button>
            )}
            
            {isLoading && (
              <div className="mt-2 text-xs text-gray-500 text-center">Saving progress...</div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}