import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Thermostat,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material';

interface TemperatureReading {
  id: string;
  temperature: number;
  measurementType: 'infrared' | 'contact' | 'combined';
  feverDetected: boolean;
  feverSeverity: 'none' | 'mild' | 'moderate' | 'high' | 'critical';
  timestamp: string;
  deviceId: string;
  isValid: boolean;
}

interface Device {
  id: string;
  name: string;
  deviceId: string;
}

interface RecentReadingsTableProps {
  readings: TemperatureReading[];
  devices: Device[];
}

const RecentReadingsTable: React.FC<RecentReadingsTableProps> = ({
  readings,
  devices,
}) => {
  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device?.name || 'Unknown Device';
  };

  const getTemperatureColor = (reading: TemperatureReading) => {
    if (!reading.isValid) return 'error';
    if (reading.feverDetected) {
      switch (reading.feverSeverity) {
        case 'critical': return 'error';
        case 'high': return 'error';
        case 'moderate': return 'warning';
        case 'mild': return 'warning';
        default: return 'success';
      }
    }
    return 'success';
  };

  const getTemperatureIcon = (reading: TemperatureReading) => {
    if (!reading.isValid) return <Error color="error" />;
    if (reading.feverDetected) return <Warning color="warning" />;
    return <CheckCircle color="success" />;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTemperature = (temp: number) => {
    return `${temp.toFixed(1)}°C`;
  };

  if (readings.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="textSecondary">
          No temperature readings available
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Status</TableCell>
            <TableCell>Temperature</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Device</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>Fever Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {readings.map((reading) => (
            <TableRow key={reading.id} hover>
              <TableCell>
                <Tooltip title={reading.isValid ? 'Valid reading' : 'Invalid reading'}>
                  {getTemperatureIcon(reading)}
                </Tooltip>
              </TableCell>
              
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Thermostat 
                    color={getTemperatureColor(reading)} 
                    fontSize="small" 
                  />
                  <Typography
                    variant="body2"
                    fontWeight={reading.feverDetected ? 'bold' : 'normal'}
                    color={getTemperatureColor(reading)}
                  >
                    {formatTemperature(reading.temperature)}
                  </Typography>
                </Box>
              </TableCell>
              
              <TableCell>
                <Chip
                  label={reading.measurementType}
                  size="small"
                  variant="outlined"
                  color={reading.measurementType === 'contact' ? 'primary' : 'default'}
                />
              </TableCell>
              
              <TableCell>
                <Typography variant="body2">
                  {getDeviceName(reading.deviceId)}
                </Typography>
              </TableCell>
              
              <TableCell>
                <Typography variant="body2" color="textSecondary">
                  {formatTimestamp(reading.timestamp)}
                </Typography>
              </TableCell>
              
              <TableCell>
                {reading.feverDetected ? (
                  <Chip
                    label={reading.feverSeverity.toUpperCase()}
                    size="small"
                    color={
                      reading.feverSeverity === 'critical' || reading.feverSeverity === 'high'
                        ? 'error'
                        : 'warning'
                    }
                  />
                ) : (
                  <Chip
                    label="NORMAL"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RecentReadingsTable;
