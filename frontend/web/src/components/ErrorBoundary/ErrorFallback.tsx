import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Refresh } from '@mui/icons-material';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          textAlign: 'center',
        }}
      >
        <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
        
        <Typography variant="h5" gutterBottom>
          Something went wrong
        </Typography>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </Typography>
        
        {process.env.NODE_ENV === 'development' && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'grey.100',
              borderRadius: 1,
              textAlign: 'left',
            }}
          >
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {error.message}
            </Typography>
          </Box>
        )}
        
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={resetErrorBoundary}
          sx={{ mt: 3 }}
        >
          Try Again
        </Button>
      </Paper>
    </Box>
  );
};

export default ErrorFallback;
