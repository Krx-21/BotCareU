import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Thermostat,
  DeviceHub,
  Notifications,
  Warning,
  CheckCircle,
  Error,
  Refresh,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from 'react-query';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

import { deviceAPI, temperatureAPI, notificationAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import TemperatureCard from '@/components/Dashboard/TemperatureCard';
import DeviceStatusCard from '@/components/Dashboard/DeviceStatusCard';
import RecentReadingsTable from '@/components/Dashboard/RecentReadingsTable';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  recentReadings: number;
  feverAlerts: number;
  averageTemp: number;
  lastReading?: {
    temperature: number;
    timestamp: string;
    deviceName: string;
    feverDetected: boolean;
  };
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const {
    data: devices,
    isLoading: devicesLoading,
    error: devicesError,
  } = useQuery('devices', deviceAPI.getDevices, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const {
    data: recentReadings,
    isLoading: readingsLoading,
    error: readingsError,
  } = useQuery(
    'recent-readings',
    () => temperatureAPI.getReadings({ limit: 10 }),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  const {
    data: notifications,
    isLoading: notificationsLoading,
  } = useQuery(
    'notifications',
    () => notificationAPI.getNotifications({ unreadOnly: true, limit: 5 }),
    {
      refetchInterval: 30000,
    }
  );

  const {
    data: analytics,
    isLoading: analyticsLoading,
  } = useQuery(
    'temperature-analytics',
    () => temperatureAPI.getAnalytics({ period: 'day' }),
    {
      refetchInterval: 300000, // Refresh every 5 minutes
    }
  );

  // Calculate dashboard statistics
  const dashboardStats: DashboardStats = React.useMemo(() => {
    const deviceList = devices?.data || [];
    const readingsList = recentReadings?.data?.readings || [];

    const stats: DashboardStats = {
      totalDevices: deviceList.length,
      onlineDevices: deviceList.filter((device: any) => device.isOnline).length,
      recentReadings: readingsList.length,
      feverAlerts: readingsList.filter((reading: any) => reading.feverDetected).length,
      averageTemp: 0,
    };

    if (readingsList.length > 0) {
      const totalTemp = readingsList.reduce((sum: number, reading: any) => sum + reading.temperature, 0);
      stats.averageTemp = totalTemp / readingsList.length;

      // Get the most recent reading
      const latestReading = readingsList[0];
      if (latestReading) {
        const device = deviceList.find((d: any) => d.id === latestReading.deviceId);
        stats.lastReading = {
          temperature: latestReading.temperature,
          timestamp: latestReading.timestamp,
          deviceName: device?.name || 'Unknown Device',
          feverDetected: latestReading.feverDetected,
        };
      }
    }

    return stats;
  }, [devices, recentReadings]);

  // Prepare chart data
  const chartData = React.useMemo(() => {
    const readings = recentReadings?.data?.readings || [];
    const last24Hours = readings.slice(0, 24).reverse();

    return {
      labels: last24Hours.map((reading: any) =>
        new Date(reading.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      ),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: last24Hours.map((reading: any) => reading.temperature),
          borderColor: 'rgb(33, 150, 243)',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Fever Threshold',
          data: last24Hours.map(() => user?.preferences?.feverThreshold || 37.5),
          borderColor: 'rgb(244, 67, 54)',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderDash: [5, 5],
          fill: false,
        },
      ],
    };
  }, [recentReadings, user]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Temperature Trend (Last 24 Hours)',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 35,
        max: 42,
        title: {
          display: true,
          text: 'Temperature (°C)',
        },
      },
    },
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries('devices'),
      queryClient.invalidateQueries('recent-readings'),
      queryClient.invalidateQueries('notifications'),
      queryClient.invalidateQueries('temperature-analytics'),
    ]);
    setRefreshing(false);
  };

  const isLoading = devicesLoading || readingsLoading || notificationsLoading || analyticsLoading;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Health Monitoring Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={isConnected ? <CheckCircle /> : <Error />}
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            variant="outlined"
          />
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alerts */}
      {(devicesError || readingsError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load dashboard data. Please try refreshing the page.
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Devices
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardStats.totalDevices}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {dashboardStats.onlineDevices} online
                  </Typography>
                </Box>
                <DeviceHub color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Latest Temperature
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardStats.lastReading?.temperature.toFixed(1) || '--'}°C
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {dashboardStats.lastReading?.deviceName || 'No recent readings'}
                  </Typography>
                </Box>
                <Thermostat 
                  color={dashboardStats.lastReading?.feverDetected ? 'error' : 'primary'} 
                  sx={{ fontSize: 40 }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Fever Alerts
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardStats.feverAlerts}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Last 24 hours
                  </Typography>
                </Box>
                <Warning color={dashboardStats.feverAlerts > 0 ? 'error' : 'disabled'} sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Notifications
                  </Typography>
                  <Typography variant="h4" component="div">
                    {notifications?.data?.unreadCount || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Unread
                  </Typography>
                </Box>
                <Notifications color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Temperature Chart */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Line data={chartData} options={chartOptions} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Notifications
              </Typography>
              {notifications?.data?.notifications?.length > 0 ? (
                <Box>
                  {notifications.data.notifications.slice(0, 5).map((notification: any) => (
                    <Box key={notification.id} mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {notification.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="textSecondary">No recent notifications</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Readings Table */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Temperature Readings
              </Typography>
              <RecentReadingsTable 
                readings={recentReadings?.data?.readings || []}
                devices={devices?.data || []}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
