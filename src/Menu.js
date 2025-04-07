import React, { useState } from 'react';
import {Paper,IconButton,Typography,Button,Slider,Switch,Fade,Box,} from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export function GameMenu({ onPause, onFogChange, onToggleBox, fogValue, gameTime}) {

  const handleFogChange = (event, newValue) => {
    if (onFogChange) onFogChange(newValue);
  };

  const handleToggleBox = (event) => {
    if (onToggleBox) onToggleBox(event.target.checked);
  };

  const isDay = gameTime > 7 && gameTime < 18;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 30,
        width: 175,
        pointerEvents: 'auto',
        transform: 'scale(0.85)',
      }}
    >
      <Paper
        elevation={4}
        sx={{
          padding: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: 'rgba(0,0,0,0.75)',
          borderRadius: 2,
          color: 'white',
        }}
      >
        {/* Pause Button */}
        <IconButton onClick={onPause} color="inherit">
          <PauseIcon />
        </IconButton>

        {/* Fog Slider */}
        <Typography variant="body2">Clear Sky</Typography>
        <Slider
          value={fogValue}
          onChange={handleFogChange}
          step={0.2}
          min={-1}
          max={1}
          sx={{ color: '#90caf9' }}
        />

        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2">Collide Box</Typography>
          <Switch onChange={handleToggleBox} color="primary" />
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {isDay ? (
            <WbSunnyIcon sx={{ color: '#ffeb3b' }} />
          ) : (
            <NightsStayIcon sx={{ color: '#90caf9' }} />
          )}
          <Typography variant="body2">Time: {gameTime}h</Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export function StartUp({ onStart}) {
  const [visible, setVisible] = useState(true);

  const handleStart = () => {
    setVisible(false);
    if (onStart) onStart();
  };

  return (
    <Fade in={visible} timeout={500}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <Paper
          elevation={6}
          sx={{
            padding: 4,
            textAlign: 'center',
            backgroundColor: '#1e1e1e',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <Typography variant="h4" gutterBottom>
            🚗 Car Driving Game
          </Typography>
          <Typography variant="body1" gutterBottom>
            by WebGL2
          </Typography>
          <IconButton onClick={handleStart} color="inherit">
            <PlayArrowIcon />
          </IconButton>
        </Paper>
      </Box>
    </Fade>
  );
}
