import { useState } from 'react';
import { formatTime } from '@/lib/intervals';
import { Info, Play } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProgressBarProps {
  intervals: Array<[number, number]>;
  duration: number;
  progressPercent: number;
  className?: string;
  onSeekTo?: (time: number) => void;
}

export function ProgressBar({ 
  intervals, 
  duration, 
  progressPercent, 
  className = "",
  onSeekTo
}: ProgressBarProps) {
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  
  // Create time markers at regular intervals
  const timeMarkers = [];
  const markerCount = 5; // Number of time markers to show
  
  for (let i = 0; i <= markerCount; i++) {
    const time = Math.floor((duration / markerCount) * i);
    timeMarkers.push(time);
  }

  // Generate timeline segments with additional detail
  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const timePosition = Math.floor(position * duration);
    setHoveredTime(timePosition);
  };
  
  const handleTimelineLeave = () => {
    setHoveredTime(null);
  };
  
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeekTo) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const timePosition = Math.floor(position * duration);
    
    // Find the closest watched segment
    const nearestSegment = intervals.reduce((nearest, interval) => {
      const [start, end] = interval;
      if (Math.abs(timePosition - start) < Math.abs(timePosition - nearest[0])) {
        return interval;
      }
      return nearest;
    }, [0, 0]);
    
    onSeekTo(nearestSegment[0]);
  };
  
  const handleSegmentClick = (startTime: number) => {
    if (onSeekTo) {
      onSeekTo(startTime);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          <span className="text-gray-600 mr-2">Watched segments</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-1 hover:bg-gray-100 rounded-full"
                  onClick={() => setShowDetailedView(!showDetailedView)}
                >
                  <Info className="h-4 w-4 text-gray-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Click to {showDetailedView ? 'hide' : 'show'} detailed timeline view</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="font-medium">{intervals.length} segments</span>
      </div>
      
      {/* Timeline container */}
      <div className="w-full">
        {/* Time labels row */}
        <div className="w-full flex justify-between mb-1">
          {timeMarkers.map((time, index) => (
            <div 
              key={`time-label-${index}`} 
              className="text-xs text-gray-500"
              style={{
                width: '40px',
                textAlign: index === 0 ? 'left' : index === timeMarkers.length - 1 ? 'right' : 'center'
              }}
            >
              {formatTime(time)}
            </div>
          ))}
        </div>
        
        {/* Detailed view - taller and more interactive */}
        <div 
          className={`w-full bg-gray-100 rounded-md ${showDetailedView ? 'h-20' : 'h-12'} relative transition-all duration-200 ease-in-out`}
          onMouseMove={handleTimelineHover}
          onMouseLeave={handleTimelineLeave}
          onClick={handleTimelineClick}
        >
          {/* Time markers */}
          {timeMarkers.map((time, index) => (
            <div 
              key={`marker-${index}`} 
              className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
              style={{
                left: `${(time / duration) * 100}%`,
                width: '1px',
                transform: 'translateX(-50%)'
              }}
            >
              <div className="w-px h-3/4 bg-gray-300 opacity-70"></div>
            </div>
          ))}
          
          {/* Current hovered position */}
          {hoveredTime !== null && (
            <div 
              className="absolute h-full bg-blue-200 opacity-20 pointer-events-none"
              style={{
                left: `${(hoveredTime / duration) * 100}%`,
                width: '1px',
                transform: 'translateX(-50%)'
              }}
            >
              <div className="px-2 py-1 bg-blue-600 text-white text-xs rounded absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                {formatTime(hoveredTime)}
              </div>
            </div>
          )}
          
          {/* Watched segments */}
          {intervals.map((interval, index) => {
            const startPercent = duration > 0 ? (interval[0] / duration) * 100 : 0;
            const widthPercent = duration > 0 ? ((interval[1] - interval[0]) / duration) * 100 : 0;
            
            return (
              <div
                key={index}
                className={`absolute ${showDetailedView ? 'top-1/2 -translate-y-1/2 h-3/4' : 'top-0 h-full'} bg-secondary hover:bg-primary transition-colors cursor-pointer group`}
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  borderRadius: '4px',
                  minWidth: '4px'
                }}
                onClick={() => handleSegmentClick(interval[0])}
              >
                {/* Show time range on hover for detailed view */}
                {showDetailedView && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute inset-0"></div>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <div className="font-medium">Watched Segment</div>
                        <div>{formatTime(interval[0])} - {formatTime(interval[1])}</div>
                        <div className="text-xs opacity-75 mt-1">Duration: {formatTime(interval[1] - interval[0])}</div>
                        <div className="flex items-center mt-1 text-xs text-blue-500">
                          <Play className="h-3 w-3 mr-1" /> Click to play from here
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Play button shown on hover */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white rounded-full p-1 shadow-md">
                    <Play className="h-3 w-3 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Simple progress bar (always shown) */}
        <div className="w-full bg-gray-200 rounded-full h-2 relative">
          {intervals.map((interval, idx) => {
            const startPercent = (interval[0] / duration) * 100;
            const widthPercent = ((interval[1] - interval[0]) / duration) * 100;
            return (
              <div
                key={idx}
                className="absolute h-2 bg-secondary"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  borderRadius: idx === 0 ? '4px 0 0 4px' : idx === intervals.length - 1 ? '0 4px 4px 0' : '0'
                }}
              />
            );
          })}
          <div 
            className="absolute h-2 bg-secondary opacity-30 rounded-full" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Overall progress</span>
        <span className="font-bold text-secondary">{progressPercent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
