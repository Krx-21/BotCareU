import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import { StatusBar } from 'react-native';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { BluetoothProvider } from './contexts/BluetoothContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/Auth/LoginScreen';
import RegisterScreen from './screens/Auth/RegisterScreen';
import DashboardScreen from './screens/Dashboard/DashboardScreen';
import DevicesScreen from './screens/Devices/DevicesScreen';
import DevicePairingScreen from './screens/Devices/DevicePairingScreen';
import TemperatureHistoryScreen from './screens/Temperature/TemperatureHistoryScreen';
import ProfileScreen from './screens/Profile/ProfileScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';

// Navigation
import { useAuth } from './contexts/AuthContext';
import BottomTabNavigator from './navigation/BottomTabNavigator';

// Theme
import { theme } from './theme/theme';

// Services
import { initializeNotifications } from './services/notificationService';
import { requestPermissions } from './services/permissionService';

// Types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  DevicePairing: { deviceId?: string };
  TemperatureHistory: { deviceId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Main App Navigator
const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {isAuthenticated ? (
        // Authenticated screens
        <>
          <Stack.Screen name="Main" component={BottomTabNavigator} />
          <Stack.Screen 
            name="DevicePairing" 
            component={DevicePairingScreen}
            options={{
              headerShown: true,
              title: 'Pair Device',
              headerStyle: {
                backgroundColor: theme.colors.primary,
              },
              headerTintColor: theme.colors.onPrimary,
            }}
          />
          <Stack.Screen 
            name="TemperatureHistory" 
            component={TemperatureHistoryScreen}
            options={{
              headerShown: true,
              title: 'Temperature History',
              headerStyle: {
                backgroundColor: theme.colors.primary,
              },
              headerTintColor: theme.colors.onPrimary,
            }}
          />
        </>
      ) : (
        // Unauthenticated screens
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Initialize app services
    const initializeApp = async () => {
      try {
        // Request necessary permissions
        await requestPermissions();
        
        // Initialize push notifications
        await initializeNotifications();
        
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <BluetoothProvider>
            <NotificationProvider>
              <StatusBar 
                barStyle="light-content" 
                backgroundColor={theme.colors.primary}
              />
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </NotificationProvider>
          </BluetoothProvider>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
};

export default App;
