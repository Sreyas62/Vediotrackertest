import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/intervals';

interface VideoPlayerProps {
  videoUrl: string;
  onProgress: (data: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
  onDuration: (duration: number) => void;
  onSeek?: (seconds: number) => void;
  currentTime?: number;
  className?: string;
}

export function VideoPlayer({ 
  videoUrl, 
  onProgress, 
  onDuration, 
  onSeek,
  currentTime = 0,
  className = "" 
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && currentTime > 0) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 0;
      
      setPlayedSeconds(currentTime);
      
      onProgress({
        played: duration > 0 ? currentTime / duration : 0,
        playedSeconds: currentTime,
        loaded: 1,
        loadedSeconds: duration
      });
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      onDuration(videoDuration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const seekTime = percent * duration;
      
      videoRef.current.currentTime = seekTime;
      setPlayedSeconds(seekTime);
      onSeek?.(seekTime);
    }
  };

  const progressPercent = duration > 0 ? (playedSeconds / duration) * 100 : 0;

  return (
    <div className={`relative bg-black aspect-video rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white" />
            )}
          </Button>
          
          {/* Time display */}
          <div className="flex items-center space-x-2 text-white text-sm">
            <span>{formatTime(playedSeconds)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          {/* Volume control */}
          <div className="flex items-center space-x-2 ml-auto">
            <Button variant="ghost" size="sm" className="text-white hover:text-gray-300">
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-gray-300">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div 
            className="w-full bg-white bg-opacity-20 rounded-full h-1 cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="bg-primary h-1 rounded-full relative transition-all"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
