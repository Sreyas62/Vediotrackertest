export function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length === 0) return [];
  
  const sorted = intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];
    
    if (current[0] <= lastMerged[1]) {
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

export function calculateProgress(intervals: Array<[number, number]>, totalDuration: number): number {
  if (totalDuration === 0) return 0;
  
  const mergedIntervals = mergeIntervals(intervals);
  const watchedTime = mergedIntervals.reduce((total, [start, end]) => total + (end - start), 0);
  
  return Math.min(Math.round((watchedTime / totalDuration) * 100), 100);
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
