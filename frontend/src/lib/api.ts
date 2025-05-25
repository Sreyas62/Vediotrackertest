// Define the expected structure for progress data received from and sent to the backend
// This should ideally match the backend's ProgressPayload and the Progress model structure
export interface VideoProgressData {
  userId: string;
  videoId: string;
  mergedIntervals: Array<{ start: number; end: number }>;
  totalUniqueWatchedSeconds: number;
  lastKnownPosition: number;
  progressPercentage: number;
  videoDuration: number;
  // Timestamps might also be present if your backend returns them
  createdAt?: string;
  updatedAt?: string;
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Fetches the video progress for a given videoId.
 * @param videoId - The ID of the video.
 * @param token - The JWT token for authentication.
 * @returns A promise that resolves to the video progress data.
 */
export async function getVideoProgress(videoId: string, token: string): Promise<VideoProgressData> {
  const response = await fetch(`${API_BASE_URL}/progress/${videoId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    // You might want to handle different error statuses differently
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch progress and parse error' }));
    throw new Error(errorData.message || `Failed to fetch progress: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Saves the video progress.
 * @param videoId - The ID of the video.
 * @param progressData - The progress data to save. This should include all fields expected by the backend.
 * @param token - The JWT token for authentication.
 * @returns A promise that resolves to the saved video progress data.
 */
export async function saveVideoProgress(
  videoId: string, 
  progressData: Omit<VideoProgressData, 'userId' | 'videoId' | 'createdAt' | 'updatedAt'>, // userId is added by backend, videoId from path
  token: string
): Promise<VideoProgressData> {
  // console.log('[api.ts] Attempting to save progress for videoId:', videoId);
  // console.log('[api.ts] Progress data:', JSON.stringify(progressData, null, 2));
  // console.log('[api.ts] Auth token:', token);
  // console.log('[api.ts] API endpoint:', `${API_BASE_URL}/progress/${videoId}`);

  if (!token || token === 'your-jwt-token') {
    console.error('[api.ts] Invalid or placeholder token. Aborting save.');
    return Promise.reject(new Error('Invalid or placeholder token.'));
  }

  try {
    const response = await fetch(`${API_BASE_URL}/progress/${videoId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(progressData)
  });

  // console.log('[api.ts] Save progress response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to save progress and parse error response body' }));
    // console.error('[api.ts] Failed to save progress. Status:', response.status, 'Error:', errorData);
    throw new Error(errorData.message || `Failed to save progress: ${response.statusText}`);
  }
  
  const responseData = await response.json();
  // console.log('[api.ts] Progress saved successfully:', responseData);
  return responseData;
} catch (error) {
  // console.error('[api.ts] Error during saveVideoProgress fetch operation:', error);
  throw error; // Re-throw the error to be caught by the caller
}
}
