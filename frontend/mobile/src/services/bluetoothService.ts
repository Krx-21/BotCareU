import { BleManager, Device, Characteristic, Service } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

// BotCareU Device Service UUIDs
const BOTCAREU_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const TEMPERATURE_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abd';
const DEVICE_INFO_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abe';
const CONFIG_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abf';

export interface TemperatureReading {
  infraredTemp: number;
  contactTemp: number;
  ambientTemp: number;
  timestamp: number;
  batteryLevel: number;
  signalStrength: number;
}

export interface DeviceInfo {
  deviceId: string;
  firmwareVersion: string;
  hardwareVersion: string;
  batteryLevel: number;
  status: 'idle' | 'measuring' | 'error';
}

export interface DeviceConfig {
  measurementInterval: number;
  feverThreshold: number;
  alertsEnabled: boolean;
  autoMeasurement: boolean;
  displayBrightness: number;
  soundEnabled: boolean;
}

class BluetoothService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private isScanning = false;
  private listeners: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.manager = new BleManager();
  }

  // Initialize Bluetooth service
  async initialize(): Promise<boolean> {
    try {
      // Request permissions for Android
      if (Platform.OS === 'android') {
        const granted = await this.requestAndroidPermissions();
        if (!granted) {
          throw new Error('Bluetooth permissions not granted');
        }
      }

      // Check if Bluetooth is enabled
      const state = await this.manager.state();
      if (state !== 'PoweredOn') {
        throw new Error('Bluetooth is not enabled');
      }

      console.log('Bluetooth service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Bluetooth service:', error);
      throw error;
    }
  }

  // Request Android permissions
  private async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      return Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('Error requesting Android permissions:', error);
      return false;
    }
  }

  // Scan for BotCareU devices
  async scanForDevices(
    onDeviceFound: (device: Device) => void,
    timeoutMs: number = 10000
  ): Promise<void> {
    if (this.isScanning) {
      throw new Error('Already scanning for devices');
    }

    try {
      this.isScanning = true;
      console.log('Starting device scan...');

      // Start scanning for devices with BotCareU service
      this.manager.startDeviceScan(
        [BOTCAREU_SERVICE_UUID],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            return;
          }

          if (device && device.name?.startsWith('BotCareU')) {
            console.log('Found BotCareU device:', device.name, device.id);
            onDeviceFound(device);
          }
        }
      );

      // Stop scanning after timeout
      setTimeout(() => {
        this.stopScan();
      }, timeoutMs);
    } catch (error) {
      this.isScanning = false;
      console.error('Failed to start device scan:', error);
      throw error;
    }
  }

  // Stop scanning
  stopScan(): void {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      console.log('Device scan stopped');
    }
  }

  // Connect to a device
  async connectToDevice(deviceId: string): Promise<Device> {
    try {
      console.log('Connecting to device:', deviceId);

      // Disconnect from current device if connected
      if (this.connectedDevice) {
        await this.disconnect();
      }

      // Connect to the device
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();

      this.connectedDevice = device;
      console.log('Connected to device:', device.name);

      // Set up connection monitoring
      device.onDisconnected((error, disconnectedDevice) => {
        console.log('Device disconnected:', disconnectedDevice?.name);
        this.connectedDevice = null;
        this.notifyListeners('deviceDisconnected', { deviceId: disconnectedDevice?.id });
      });

      // Start monitoring temperature readings
      await this.startTemperatureMonitoring();

      return device;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      throw error;
    }
  }

  // Disconnect from current device
  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
        this.connectedDevice = null;
        console.log('Disconnected from device');
      } catch (error) {
        console.error('Error disconnecting from device:', error);
      }
    }
  }

  // Check if connected to a device
  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  // Get connected device info
  async getDeviceInfo(): Promise<DeviceInfo | null> {
    if (!this.connectedDevice) return null;

    try {
      const characteristic = await this.connectedDevice.readCharacteristicForService(
        BOTCAREU_SERVICE_UUID,
        DEVICE_INFO_CHARACTERISTIC_UUID
      );

      if (characteristic.value) {
        const data = JSON.parse(atob(characteristic.value));
        return {
          deviceId: data.deviceId,
          firmwareVersion: data.firmwareVersion,
          hardwareVersion: data.hardwareVersion,
          batteryLevel: data.batteryLevel,
          status: data.status,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get device info:', error);
      return null;
    }
  }

  // Start monitoring temperature readings
  private async startTemperatureMonitoring(): Promise<void> {
    if (!this.connectedDevice) return;

    try {
      // Subscribe to temperature characteristic notifications
      this.connectedDevice.monitorCharacteristicForService(
        BOTCAREU_SERVICE_UUID,
        TEMPERATURE_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Temperature monitoring error:', error);
            return;
          }

          if (characteristic?.value) {
            try {
              const data = JSON.parse(atob(characteristic.value));
              const reading: TemperatureReading = {
                infraredTemp: data.infraredTemp,
                contactTemp: data.contactTemp,
                ambientTemp: data.ambientTemp,
                timestamp: data.timestamp || Date.now(),
                batteryLevel: data.batteryLevel,
                signalStrength: data.signalStrength,
              };

              this.notifyListeners('temperatureReading', reading);
            } catch (parseError) {
              console.error('Failed to parse temperature data:', parseError);
            }
          }
        }
      );

      console.log('Started temperature monitoring');
    } catch (error) {
      console.error('Failed to start temperature monitoring:', error);
    }
  }

  // Send configuration to device
  async sendConfiguration(config: Partial<DeviceConfig>): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      const configData = btoa(JSON.stringify(config));
      
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        BOTCAREU_SERVICE_UUID,
        CONFIG_CHARACTERISTIC_UUID,
        configData
      );

      console.log('Configuration sent to device');
    } catch (error) {
      console.error('Failed to send configuration:', error);
      throw error;
    }
  }

  // Request immediate temperature measurement
  async requestMeasurement(): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      const command = btoa(JSON.stringify({ command: 'measure_now' }));
      
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        BOTCAREU_SERVICE_UUID,
        CONFIG_CHARACTERISTIC_UUID,
        command
      );

      console.log('Measurement request sent');
    } catch (error) {
      console.error('Failed to request measurement:', error);
      throw error;
    }
  }

  // Add event listener
  addListener(event: string, callback: (data: any) => void): void {
    this.listeners.set(event, callback);
  }

  // Remove event listener
  removeListener(event: string): void {
    this.listeners.delete(event);
  }

  // Notify listeners
  private notifyListeners(event: string, data: any): void {
    const callback = this.listeners.get(event);
    if (callback) {
      callback(data);
    }
  }

  // Cleanup
  destroy(): void {
    this.stopScan();
    this.disconnect();
    this.listeners.clear();
    this.manager.destroy();
  }
}

export default new BluetoothService();
