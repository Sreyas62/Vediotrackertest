import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import ReactPlayer from 'react-player';
import { ProgressBar } from '@/components/progress-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequestWithAuth } from '@/lib/auth';
import { mergeIntervals, calculateProgress, formatTime } from '@/lib/intervals';
import { ChevronRight, Play, FileText, Code, BookOpen, LogOut } from 'lucide-react';

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
      if (Math.abs(currentTime - currentInterval[1]) <= 2) {
        setCurrentInterval([start, currentTime + 1]);
      } else {
        // User seeked or there's a gap, finalize current interval and start new one
        const newIntervals = mergeIntervals([...progress.watchedIntervals, currentInterval]);
        saveProgress(newIntervals, currentTime);
        setCurrentInterval([currentTime, currentTime + 1]);
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
    // This would be handled by passing the lastPosition to the VideoPlayer
    toast({
      title: "Resuming video",
      description: `Jumping to ${formatTime(progress.lastPosition)}`,
    });
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lecture Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <span>Computer Science</span>
            <ChevronRight className="h-4 w-4" />
            <span>Introduction to Algorithms</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">Lecture 3: Sorting Algorithms</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Understanding Merge Sort and Quick Sort
          </h1>
          <p className="text-gray-600">
            Learn the fundamentals of divide-and-conquer sorting algorithms and their time complexity analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <div className="aspect-video bg-black">
                <ReactPlayer
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
                />
                
                <div className="flex items-center justify-between text-sm mt-3">
                  <span className="text-gray-600">Last position</span>
                  <span className="font-medium">{formatTime(progress.lastPosition)}</span>
                </div>
                
                {progress.lastPosition > 0 && (
                  <Button 
                    onClick={resumeFromLastPosition}
                    className="w-full mt-4"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume from {formatTime(progress.lastPosition)}
                  </Button>
                )}
                
                {isLoading && (
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Saving progress...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Course Outline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Outline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-green-50 border border-green-200">
                  <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">Introduction to Sorting</p>
                    <p className="text-xs text-gray-500">15:30 • Completed</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-green-50 border border-green-200">
                  <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">Bubble Sort Analysis</p>
                    <p className="text-xs text-gray-500">22:15 • Completed</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">Merge Sort & Quick Sort</p>
                    <p className="text-xs text-blue-600">45:32 • {currentProgress.toFixed(1)}% completed</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors opacity-60">
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">🔒</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 truncate">Heap Sort Implementation</p>
                    <p className="text-xs text-gray-400">38:45 • Locked</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-all group cursor-pointer">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-500 transition-colors">
                    <FileText className="h-4 w-4 text-red-500 group-hover:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Lecture Slides</p>
                    <p className="text-xs text-gray-500">PDF • 2.3 MB</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-all group cursor-pointer">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                    <Code className="h-4 w-4 text-green-500 group-hover:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Code Examples</p>
                    <p className="text-xs text-gray-500">Python • GitHub</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-all group cursor-pointer">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                    <BookOpen className="h-4 w-4 text-purple-500 group-hover:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Practice Problems</p>
                    <p className="text-xs text-gray-500">5 exercises</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Course Completion</span>
                    <span className="text-sm font-bold text-secondary">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: "45%" }}></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">2h 15m</div>
                    <div className="text-xs text-gray-500">Watch Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">2 / 8</div>
                    <div className="text-xs text-gray-500">Lectures</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
