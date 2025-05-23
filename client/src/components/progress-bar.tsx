interface ProgressBarProps {
  intervals: Array<[number, number]>;
  duration: number;
  progressPercent: number;
  className?: string;
}

export function ProgressBar({ intervals, duration, progressPercent, className = "" }: ProgressBarProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Watched segments</span>
        <span className="font-medium">{intervals.length} segments</span>
      </div>
      
      {/* Segment progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 relative">
        {intervals.map((interval, index) => {
          const startPercent = duration > 0 ? (interval[0] / duration) * 100 : 0;
          const widthPercent = duration > 0 ? ((interval[1] - interval[0]) / duration) * 100 : 0;
          
          return (
            <div
              key={index}
              className="absolute top-0 h-2 bg-secondary"
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
                borderRadius: index === 0 ? '9999px 0 0 9999px' : 
                              index === intervals.length - 1 ? '0 9999px 9999px 0' : '0'
              }}
            />
          );
        })}
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Overall progress</span>
        <span className="font-bold text-secondary">{progressPercent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
