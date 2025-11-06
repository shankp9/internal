import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace('/api', '');

let socket: Socket | null = null;
let pipelineSocket: Socket | null = null;

/**
 * Get or create the main Socket.IO connection
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[Socket.IO] Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket.IO] Connection error:', error);
  });

  return socket;
}

/**
 * Get or create the pipeline namespace Socket.IO connection
 */
export function getPipelineSocket(): Socket | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (pipelineSocket && pipelineSocket.connected) {
    return pipelineSocket;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  pipelineSocket = io(`${SOCKET_URL}/pipeline`, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  pipelineSocket.on('connect', () => {
    console.log('[Socket.IO] Connected to pipeline namespace');
  });

  pipelineSocket.on('disconnect', () => {
    console.log('[Socket.IO] Disconnected from pipeline namespace');
  });

  pipelineSocket.on('connect_error', (error) => {
    console.error('[Socket.IO] Pipeline connection error:', error);
  });

  return pipelineSocket;
}

/**
 * Join a meeting pipeline room
 */
export function joinMeetingPipeline(meetingId: string) {
  const pipelineSocket = getPipelineSocket();
  if (pipelineSocket) {
    console.log(`[Socket.IO] Joining meeting pipeline room: meeting-${meetingId}`);
    pipelineSocket.emit('join-meeting-pipeline', meetingId);
  } else {
    console.warn('[Socket.IO] Cannot join room: socket not available');
  }
}

/**
 * Leave a meeting pipeline room
 */
export function leaveMeetingPipeline(meetingId: string) {
  const pipelineSocket = getPipelineSocket();
  if (pipelineSocket) {
    pipelineSocket.emit('leave-meeting-pipeline', meetingId);
  }
}

/**
 * Disconnect all sockets
 */
export function disconnectSockets() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (pipelineSocket) {
    pipelineSocket.disconnect();
    pipelineSocket = null;
  }
}

/**
 * React hook for listening to pipeline status updates
 */
export function usePipelineStatus(
  meetingId: string | null,
  onStatusUpdate: (data: any) => void,
  onCompleted: (data: any) => void,
  onError: (error: any) => void
) {
  // This is a helper function, not a React hook
  // Components should use useEffect to set up listeners
  if (typeof window === 'undefined' || !meetingId) {
    return;
  }

  const pipelineSocket = getPipelineSocket();
  if (!pipelineSocket) {
    return;
  }

  // Join the room
  joinMeetingPipeline(meetingId);

  // Listen to pipeline status updates
  pipelineSocket.on('pipeline-status', onStatusUpdate);
  pipelineSocket.on('pipeline-completed', onCompleted);
  pipelineSocket.on('pipeline-error', onError);

  // Return cleanup function
  return () => {
    if (pipelineSocket) {
      pipelineSocket.off('pipeline-status', onStatusUpdate);
      pipelineSocket.off('pipeline-completed', onCompleted);
      pipelineSocket.off('pipeline-error', onError);
      leaveMeetingPipeline(meetingId);
    }
  };
}

