import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Slider,
  Switch,
  FormControlLabel,
  Box,
} from '@mui/material';

export default function GameMenu({ onPause, onFogChange, onToggleBox, fogValue}) {

  const handleFogChange = (event, newValue) => {
    if (onFogChange) onFogChange(newValue);
  };

  const handleToggleBox = (event) => {
    if (onToggleBox) onToggleBox(event.target.checked);
  };

  return (
    <Card
      sx={{
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(30, 30, 30, 0.6)',
        color: 'white',
        width: 175,
        zIndex: 10,
        borderRadius: 3,
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Game Menu
        </Typography>

        <Box mb={2}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={onPause}
          >
            Pause
          </Button>
        </Box>

        <Box mb={2}>
          <Typography gutterBottom>Fog Intensity</Typography>
          <Slider
            value={fogValue}
            onChange={handleFogChange}
            min={-1} max={1}
            step={0.2}
            aria-label="Fog Intensity"
          />
        </Box>

        <FormControlLabel
          control={
            <Switch onChange={handleToggleBox} />
          }
          label="Show Box"
        />
      </CardContent>
    </Card>
  );
}
