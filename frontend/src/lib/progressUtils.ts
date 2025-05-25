export interface WatchedInterval {
  start: number;
  end: number;
}

/**
 * Merges overlapping or adjacent time intervals.
 * @param intervals - An array of watched intervals.
 * @returns A new array of merged, unique intervals, sorted by start time.
 */
export function mergeIntervals(intervals: WatchedInterval[]): WatchedInterval[] {
  if (!intervals || intervals.length === 0) {
    return [];
  }

  // Sort intervals by start time
  const sortedIntervals = [...intervals].sort((a, b) => a.start - b.start);

  const merged: WatchedInterval[] = [];
  let currentMerge = { ...sortedIntervals[0] };

  for (let i = 1; i < sortedIntervals.length; i++) {
    const nextInterval = sortedIntervals[i];
    // If the next interval overlaps with or is adjacent to the current merge
    if (nextInterval.start <= currentMerge.end) {
      currentMerge.end = Math.max(currentMerge.end, nextInterval.end);
    } else {
      // No overlap, push the current merge and start a new one
      merged.push(currentMerge);
      currentMerge = { ...nextInterval };
    }
  }
  // Push the last merged interval
  merged.push(currentMerge);

  return merged;
}

/**
 * Calculates the total number of unique seconds watched from merged intervals.
 * @param mergedIntervals - An array of unique, merged watched intervals.
 * @returns The total unique seconds watched.
 */
export function calculateTotalUniqueWatched(mergedIntervals: WatchedInterval[]): number {
  if (!mergedIntervals) return 0;
  return mergedIntervals.reduce((total, interval) => total + (interval.end - interval.start), 0);
}

/**
 * Calculates the progress percentage.
 * @param totalUniqueWatchedSeconds - Total unique seconds watched.
 * @param videoDuration - Total duration of the video in seconds.
 * @returns Progress percentage (0-100).
 */
export function calculateProgressPercentage(
  totalUniqueWatchedSeconds: number,
  videoDuration: number
): number {
  if (videoDuration <= 0) {
    return 0;
  }
  const percentage = (totalUniqueWatchedSeconds / videoDuration) * 100;
  return Math.min(Math.max(percentage, 0), 100); // Clamp between 0 and 100
}
