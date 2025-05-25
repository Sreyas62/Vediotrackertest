# Design Documentation: Video Progress Tracking

This document outlines the design choices and core mechanisms behind the video progress tracking system.

## Tracking Watched Intervals

Watched intervals are tracked by capturing player events and maintaining a record of continuous playback periods.

1.  **Segment Initiation**: When video playback starts, or resumes after a pause or seek, the system notes the current player time as `currentSegmentStartRef.current`. This marks the beginning of a potential new watched segment.
2.  **Segment Termination**: A segment is considered complete under several conditions:
    *   **Pause**: User pauses the video.
    *   **Seek**: User jumps to a different part of the video (either by clicking the progress bar or using player controls).
    *   **Buffering**: Player enters a buffering state that interrupts continuous playback.
    *   **Video End**: The video finishes playing.
    *   **Page Unload/Component Unmount**: To ensure progress isn't lost if the user navigates away.
3.  **Accurate End Time with `lastPolledTimeRef`**: A significant challenge is determining the precise end time of a segment, especially when a native YouTube player seek occurs. The player's `currentTime` might update *after* the seek event is processed, leading to inaccurate segment boundaries (e.g., marking a jumped-over portion as watched).
    *   **Solution**: A custom polling mechanism (`startPollingTime`, `stopPollingTime`) periodically updates `lastPolledTimeRef.current` with the player's current time (e.g., every 250ms). When a segment-terminating event (like PAUSED, BUFFERING, or a PLAYING event that indicates an interruption/seek) occurs, `lastPolledTimeRef.current` is used as the segment's end time. This ensures the segment closes based on the playback time *before* the seek operation fully completes and updates the player's main `currentTime` state.
4.  **Storing Raw Segments**: Each completed segment, defined by its start and end time, is stored as an object (e.g., `{ start: number, end: number }`) in an array called `rawWatchedSegments`.

## Merging Intervals for Unique Progress

To calculate progress accurately and avoid counting rewatched portions multiple times, the `rawWatchedSegments` (along with any previously saved `mergedIntervals` loaded from the backend) are processed to create a set of unique, non-overlapping intervals.

1.  **`mergeIntervalsNew` Utility**: This core utility function (located in `frontend/src/lib/progressUtils.ts`) is responsible for this task.
2.  **Process**:
    *   It takes an array of all collected segments (both newly captured `rawWatchedSegments` and existing `mergedIntervals`).
    *   The segments are typically sorted by their start times.
    *   The function then iterates through the sorted segments, merging any that overlap or are contiguous. For example, if it encounters `[0, 10]` and then `[5, 15]`, they are merged into `[0, 15]`. If it sees `[0,10]` and `[10, 20]`, they become `[0, 20]`.
3.  **Output**: The result is a new array, `mergedIntervals`, containing the minimal set of time ranges that cover all unique portions of the video the user has watched.
4.  **Progress Calculation**: The total unique watched time is then calculated by summing the durations of all intervals in this `mergedIntervals` array. This sum is used to determine the progress percentage against the video's total duration.

## Challenges Encountered and Solutions

1.  **Accurate Segment End Time on Native Seeks**:
    *   **Challenge**: As mentioned above, native YouTube player seeks would cause the `onStateChange` event to fire with a `currentTime` reflecting the *new* position, making it difficult to close the *previous* segment accurately. This could lead to either lost progress or incorrectly marked watched time over the seek jump.
    *   **Solution**: Implemented `lastPolledTimeRef` which is updated frequently by a custom timer. This ref provides a more reliable "last known good time" *before* the seek event fully processes, allowing for accurate segment closure in `onPlayerStateChange` for states like PLAYING (when it's an interruption), PAUSED, ENDED, and BUFFERING.

2.  **Stale Closures in Debounced Save Function**:
    *   **Challenge**: The `debouncedSaveProgress` function, which uses `setTimeout` to delay saving progress to the backend, would often execute with outdated state values (e.g., an old version of `rawWatchedSegments` or `mergedIntervals`). This is a common issue with closures in React when dealing with asynchronous operations and state that changes frequently.
    *   **Solution**: Used a React `useRef` (`handleSaveProgressRef`) to store the actual `handleSaveProgress` function. An `useEffect` hook was set up to update `handleSaveProgressRef.current` whenever `handleSaveProgress` (or its dependencies like `rawWatchedSegments`) changed. The debounced function then always calls `handleSaveProgressRef.current()`, ensuring it executes the latest version of the save logic with the correct, up-to-date state.

3.  **Managing Player State and React State Synchronization**:
    *   **Challenge**: Keeping React's state (`isPlaying`, `currentTime`) perfectly synchronized with the YouTube player's internal state, especially with external controls or rapid events, can be tricky.
    *   **Solution**: A combination of player event handlers (`onStateChange`, `onPlay`, `onPause`) and the custom polling mechanism for `currentTime` helps maintain consistency. State updates are carefully managed to trigger re-renders and recalculations only when necessary, using `useCallback` and `useMemo` for optimization where appropriate.

4.  **Initial Progress Load and Player Readiness**:
    *   **Challenge**: Ensuring the player is ready and its duration is known before attempting to load initial progress or seek to a last known position.
    *   **Solution**: The `onReady` event of the YouTube player is used to get the `ytPlayer` instance. `loadInitialProgress` is then typically called within a `useEffect` hook that depends on `ytPlayer` and the `token` being available. The player's duration is fetched within `loadInitialProgress` before calculating percentages or attempting seeks.
