import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import ReactPlayer from 'react-player';
import { ProgressBar } from '@/components/progress-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequestWithAuth } from '@/lib/auth';
import { mergeIntervals, calculateProgress, formatTime } from '@/lib/intervals';
import { Play, Pause, LogOut } from 'lucide-react';

const YOUTUBE_VIDEO = "https://youtu.be/2YIgGdUtbXM?si=AvWj62Y3p2wtA7-g";
const VIDEO_ID = "youtube-lecture-2YIgGdUtbXM";

interface ProgressData {
  watchedIntervals: Array<[number, number]>;
  lastPosition: number;
  progressPercent: number;
  totalDuration: number;
}

export default function Lecture() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [progress, setProgress] = useState<ProgressData>({
    watchedIntervals: [],
    lastPosition: 0,
    progressPercent: 0,
    totalDuration: 0
  });
  
  const [currentInterval, setCurrentInterval] = useState<[number, number] | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const playerRef = useRef<ReactPlayer>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const response = await apiRequestWithAuth('GET', `/api/progress?videoId=${VIDEO_ID}`);
      const data = await response.json();
      setProgress(data);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const saveProgress = async (newIntervals: Array<[number, number]>, lastPosition: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        
        const response = await apiRequestWithAuth('POST', '/api/progress', {
          videoId: VIDEO_ID,
          watchedIntervals: newIntervals,
          lastPosition,
          totalDuration: videoDuration
        });
        
        const data = await response.json();
        setProgress(data);
      } catch (error) {
        console.error('Failed to save progress:', error);
        toast({
          title: "Failed to save progress",
          description: "Your progress could not be saved. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }, 2000);
  };

  const handleVideoProgress = (progressData: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    const currentTime = Math.floor(progressData.playedSeconds);
    
    console.log('Video progress:', currentTime, 'seconds');
    
    if (!currentInterval) {
      setCurrentInterval([currentTime, currentTime + 1]);
    } else {
      const [start] = currentInterval;
      // Check if seeking backwards or within 2 seconds forward
      if (currentTime <= progress.lastContinuousPosition || Math.abs(currentTime - currentInterval[1]) <= 2) {
        // Allow backward seeking or sequential watching
        setCurrentInterval([start, currentTime + 1]);
        setProgress(prev => ({
          ...prev,
          lastPosition: currentTime,
          lastContinuousPosition: Math.max(currentTime, prev.lastContinuousPosition),
          watchedIntervals: mergeIntervals([...prev.watchedIntervals, [start, currentTime + 1]])
        }));
        saveProgress(progress.watchedIntervals, currentTime, progress.lastContinuousPosition);
      } else {
        // Prevent forward skipping
        const newIntervals = mergeIntervals([...progress.watchedIntervals, currentInterval]);
        saveProgress(newIntervals, progress.lastContinuousPosition, progress.lastContinuousPosition);
        playerRef.current?.seekTo(progress.lastContinuousPosition, 'seconds');
        setCurrentInterval([progress.lastContinuousPosition, progress.lastContinuousPosition + 1]);
        toast({
          title: "Cannot skip forward",
          description: `Please watch the content sequentially from ${formatTime(progress.lastContinuousPosition)}`,
        });
      }
    }
    
    // Save progress every 10 seconds
    if (currentTime > 0 && currentTime % 10 === 0) {
      const currentIntervals = currentInterval 
        ? mergeIntervals([...progress.watchedIntervals, currentInterval])
        : progress.watchedIntervals;
      saveProgress(currentIntervals, currentTime);
    }
  };

  const handleVideoDuration = (duration: number) => {
    setVideoDuration(duration);
  };

  const handleVideoSeek = (seekTime: number) => {
    if (currentInterval) {
      const newIntervals = mergeIntervals([...progress.watchedIntervals, currentInterval]);
      saveProgress(newIntervals, Math.floor(seekTime));
      setCurrentInterval(null);
    }
  };

  const resumeFromLastPosition = () => {
    if (playerRef.current && progress.lastPosition > 0) {
      playerRef.current.seekTo(progress.lastPosition, 'seconds');
      playerRef.current.getInternalPlayer()?.playVideo();
      toast({
        title: "Resuming video",
        description: `Resuming from ${formatTime(progress.lastPosition)}`,
      });
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Calculate current progress including the active interval
  const allIntervals = currentInterval 
    ? mergeIntervals([...progress.watchedIntervals, currentInterval])
    : progress.watchedIntervals;
  
  const currentProgress = videoDuration > 0 
    ? calculateProgress(allIntervals, videoDuration)
    : progress.progressPercent;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
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
        {/* Lecture Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Node.js Fundamentals
          </h1>
          <p className="text-gray-600">
            Track your progress as you learn Node.js concepts
          </p>
        </div>

        {/* Video Player */}
        <Card className="overflow-hidden mb-6">
          <div className="aspect-video bg-black">
            <ReactPlayer
              ref={playerRef}
              url={YOUTUBE_VIDEO}
              width="100%"
              height="100%"
              playing={false}
              controls={true}
              onProgress={handleVideoProgress}
              onDuration={handleVideoDuration}
              onSeek={handleVideoSeek}
              progressInterval={1000}
              onPlay={() => console.log('Video started playing')}
              onPause={() => console.log('Video paused')}
              config={{
                youtube: {
                  playerVars: { 
                    showinfo: 1,
                    rel: 0,
                    modestbranding: 1
                  }
                }
              }}
            />
          </div>
          
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Video Progress</h3>
                <p className="text-sm text-gray-600">Track your learning progress</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-secondary">
                  {currentProgress.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
            
            <ProgressBar
              intervals={allIntervals}
              duration={videoDuration}
              progressPercent={currentProgress}
              onSeekTo={(time) => {
                // Find the ReactPlayer instance and seek to the time
                if (playerRef.current) {
                  playerRef.current.seekTo(time);
                  toast({
                    title: "Seeking to position",
                    description: `Jumping to ${formatTime(time)}`,
                  });
                }
              }}
            />
            
            <div className="flex items-center justify-between text-sm mt-3">
              <span className="text-gray-600">Last position</span>
              <span className="font-medium">{formatTime(progress.lastPosition)}</span>
            </div>
            
            {progress.lastContinuousPosition > 0 && (
              <Button 
                onClick={() => {
                  const player = playerRef.current;
                  if (player) {
                    const playing = player.getCurrentTime() > 0 && !player.props.playing;
                    player.seekTo(progress.lastPosition);
                    if (!playing) {
                      player.props.onPlay?.();
                    } else {
                      player.props.onPause?.();
                    }
                  }
                }}
                className="w-full mt-4"
                disabled={false}
              >
                {!playerRef.current?.props.playing ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Continue from {formatTime(progress.lastPosition)}
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
            )}
            
            {isLoading && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                Saving progress...
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}