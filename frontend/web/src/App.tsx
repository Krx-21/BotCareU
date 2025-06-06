import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from 'react-error-boundary';

// Context Providers
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { DeviceProvider } from '@/contexts/DeviceContext';

// Components
import Layout from '@/components/Layout/Layout';
import ErrorFallback from '@/components/ErrorBoundary/ErrorFallback';
import LoadingSpinner from '@/components/UI/LoadingSpinner';

// Pages
import LoginPage from '@/pages/Auth/LoginPage';
import RegisterPage from '@/pages/Auth/RegisterPage';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import DevicesPage from '@/pages/Devices/DevicesPage';
import TemperaturePage from '@/pages/Temperature/TemperaturePage';
import AnalyticsPage from '@/pages/Analytics/AnalyticsPage';
import ProfilePage from '@/pages/Profile/ProfilePage';
import SettingsPage from '@/pages/Settings/SettingsPage';
import NotificationsPage from '@/pages/Notifications/NotificationsPage';
import NotFoundPage from '@/pages/NotFound/NotFoundPage';

// Hooks
import { useAuth } from '@/hooks/useAuth';

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#f50057',
      light: '#ff5983',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// React Query client configuration
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

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              autoHideDuration={5000}
            >
              <Router>
                <AuthProvider>
                  <WebSocketProvider>
                    <DeviceProvider>
                      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                        <Routes>
                          {/* Public Routes */}
                          <Route
                            path="/login"
                            element={
                              <PublicRoute>
                                <LoginPage />
                              </PublicRoute>
                            }
                          />
                          <Route
                            path="/register"
                            element={
                              <PublicRoute>
                                <RegisterPage />
                              </PublicRoute>
                            }
                          />

                          {/* Protected Routes */}
                          <Route
                            path="/"
                            element={
                              <ProtectedRoute>
                                <Layout />
                              </ProtectedRoute>
                            }
                          >
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="devices" element={<DevicesPage />} />
                            <Route path="temperature" element={<TemperaturePage />} />
                            <Route path="analytics" element={<AnalyticsPage />} />
                            <Route path="notifications" element={<NotificationsPage />} />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="settings" element={<SettingsPage />} />
                          </Route>

                          {/* 404 Route */}
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Box>
                    </DeviceProvider>
                  </WebSocketProvider>
                </AuthProvider>
              </Router>
            </SnackbarProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
