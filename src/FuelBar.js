import React from 'react';
import { Box, Typography, LinearProgress, Paper } from '@mui/material';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';

export default function FuelBar({ fuel }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 20,
        pointerEvents: 'none',
        width: 200,
        paddingTop: 2
      }}
    >
      <Paper
        elevation={3}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: 2,
        }}
      >
        <LocalGasStationIcon sx={{ color: 'white' }} />

        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(fuel, 100))}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: fuel < 20 ? '#f44336' : '#76ff03',
              },
            }}
          />
        </Box>

        <Typography
          variant="body2"
          sx={{ color: 'white', minWidth: 30, textAlign: 'right' }}
        >
          {Math.floor(fuel)}%
        </Typography>
      </Paper>
    </Box>
  );
}
