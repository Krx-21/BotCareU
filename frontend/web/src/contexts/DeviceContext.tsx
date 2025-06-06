import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { deviceAPI } from '@/services/api';
import { useWebSocket } from './WebSocketContext';

interface Device {
  id: string;
  deviceId: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  batteryLevel?: number;
  signalStrength?: number;
  lastSeen?: string;
  isOnline: boolean;
  healthStatus: {
    overall: 'good' | 'warning' | 'critical';
    issues: string[];
  };
}

interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  isLoading: boolean;
  error: string | null;
}

interface DeviceContextType extends DeviceState {
  selectDevice: (device: Device | null) => void;
  refreshDevices: () => void;
  pairDevice: (deviceData: { deviceId: string; pairingCode: string; name: string }) => Promise<void>;
  updateDevice: (deviceId: string, updateData: any) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
}

type DeviceAction =
  | { type: 'SET_DEVICES'; payload: Device[] }
  | { type: 'SELECT_DEVICE'; payload: Device | null }
  | { type: 'UPDATE_DEVICE'; payload: { deviceId: string; updates: Partial<Device> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: DeviceState = {
  devices: [],
  selectedDevice: null,
  isLoading: false,
  error: null,
};

const deviceReducer = (state: DeviceState, action: DeviceAction): DeviceState => {
  switch (action.type) {
    case 'SET_DEVICES':
      return {
        ...state,
        devices: action.payload,
        isLoading: false,
        error: null,
      };
    case 'SELECT_DEVICE':
      return {
        ...state,
        selectedDevice: action.payload,
      };
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(device =>
          device.deviceId === action.payload.deviceId
            ? { ...device, ...action.payload.updates }
            : device
        ),
        selectedDevice: state.selectedDevice?.deviceId === action.payload.deviceId
          ? { ...state.selectedDevice, ...action.payload.updates }
          : state.selectedDevice,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
};

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(deviceReducer, initialState);
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();

  // Fetch devices
  const { data: devicesData, isLoading, error, refetch } = useQuery(
    'devices',
    deviceAPI.getDevices,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      onSuccess: (response) => {
        dispatch({ type: 'SET_DEVICES', payload: response.data });
      },
      onError: (error: any) => {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      },
    }
  );

  // Listen for real-time device updates
  useEffect(() => {
    const handleDeviceStatusUpdate = (event: CustomEvent) => {
      const { deviceId, ...updates } = event.detail;
      dispatch({
        type: 'UPDATE_DEVICE',
        payload: { deviceId, updates }
      });
    };

    window.addEventListener('deviceStatusUpdate', handleDeviceStatusUpdate as EventListener);

    return () => {
      window.removeEventListener('deviceStatusUpdate', handleDeviceStatusUpdate as EventListener);
    };
  }, []);

  // Update loading state
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, [isLoading]);

  // Update error state
  useEffect(() => {
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as any).message });
    }
  }, [error]);

  const selectDevice = (device: Device | null) => {
    dispatch({ type: 'SELECT_DEVICE', payload: device });
  };

  const refreshDevices = () => {
    refetch();
  };

  const pairDevice = async (deviceData: { deviceId: string; pairingCode: string; name: string }) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await deviceAPI.pairDevice(deviceData);
      
      // Refresh devices list
      await refetch();
      
      dispatch({ type: 'SET_ERROR', payload: null });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to pair device';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateDevice = async (deviceId: string, updateData: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await deviceAPI.updateDevice(deviceId, updateData);
      
      // Update local state
      dispatch({
        type: 'UPDATE_DEVICE',
        payload: { deviceId: response.data.deviceId, updates: response.data }
      });
      
      // Invalidate and refetch devices
      queryClient.invalidateQueries('devices');
      
      dispatch({ type: 'SET_ERROR', payload: null });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update device';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await deviceAPI.removeDevice(deviceId);
      
      // Remove from local state
      const updatedDevices = state.devices.filter(device => device.id !== deviceId);
      dispatch({ type: 'SET_DEVICES', payload: updatedDevices });
      
      // Clear selected device if it was the removed one
      if (state.selectedDevice?.id === deviceId) {
        dispatch({ type: 'SELECT_DEVICE', payload: null });
      }
      
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to remove device';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const value: DeviceContextType = {
    ...state,
    selectDevice,
    refreshDevices,
    pairDevice,
    updateDevice,
    removeDevice,
  };

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDevices = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevices must be used within a DeviceProvider');
  }
  return context;
};
