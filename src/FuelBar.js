import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

export function FuelBar({ fuel, money}) {
  return (
    <Box
      position="absolute"
      top={16}
      left={16}
      display="flex"
      flexDirection="column"
      gap={1}
      bgcolor="rgba(0, 0, 0, 0.6)"
      px={2}
      py={1.5}
      borderRadius={2}
      boxShadow={3}
      width={180}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <LocalGasStationIcon sx={{ color: 'orange' }} />
        <Box width="100%">
          <LinearProgress
            variant="determinate"
            value={fuel}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#555',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'orange',
              },
            }}
          />
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <MonetizationOnIcon sx={{ color: 'gold' }} />
        <Typography variant="subtitle1" color="white">
          {money}
        </Typography>
      </Box>
    </Box>
  );
}