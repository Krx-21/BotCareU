import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  sendMessage: (event: string, data: any) => void;
  joinDeviceRoom: (deviceId: string) => void;
  leaveDeviceRoom: (deviceId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user]);

  const connectSocket = () => {
    try {
      const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setConnectionError('No authentication token available');
        return;
      }

      const newSocket = io(WS_URL, {
        transports: ['websocket'],
        timeout: 20000,
        forceNew: true,
      });

      newSocket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Authenticate with the server
        newSocket.emit('auth', { token });
      });

      newSocket.on('auth_success', (data) => {
        console.log('WebSocket authenticated:', data);
      });

      newSocket.on('auth_error', (error) => {
        console.error('WebSocket authentication failed:', error);
        setConnectionError('Authentication failed');
        disconnectSocket();
      });

      newSocket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          scheduleReconnect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        scheduleReconnect();
      });

      // Handle incoming events
      newSocket.on('temperature:update', (data) => {
        console.log('Temperature update received:', data);
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('temperatureUpdate', { detail: data }));
      });

      newSocket.on('fever:alert', (data) => {
        console.log('Fever alert received:', data);
        window.dispatchEvent(new CustomEvent('feverAlert', { detail: data }));
      });

      newSocket.on('device:status', (data) => {
        console.log('Device status update received:', data);
        window.dispatchEvent(new CustomEvent('deviceStatusUpdate', { detail: data }));
      });

      newSocket.on('notification', (data) => {
        console.log('Notification received:', data);
        window.dispatchEvent(new CustomEvent('newNotification', { detail: data }));
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError('Failed to create connection');
    }
  };

  const disconnectSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    setIsConnected(false);
    setConnectionError(null);
  };

  const scheduleReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionError('Max reconnection attempts reached');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current++;

    console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated && user) {
        connectSocket();
      }
    }, delay);
  };

  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  };

  const joinDeviceRoom = (deviceId: string) => {
    if (socket && isConnected) {
      socket.emit('join_device', deviceId);
    }
  };

  const leaveDeviceRoom = (deviceId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_device', deviceId);
    }
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    connectionError,
    sendMessage,
    joinDeviceRoom,
    leaveDeviceRoom,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
