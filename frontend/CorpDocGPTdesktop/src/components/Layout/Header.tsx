import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface HeaderProps {
  onThemeToggle: () => void;
  onMenuToggle: () => void;
  onNewChat: () => void;
  sidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onThemeToggle, 
  onMenuToggle, 
  onNewChat,
  sidebarOpen 
}) => {
  const theme = useTheme();

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        backgroundColor: 'background.default',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
        width: '100%',
        minHeight: '64px',
      }}
    >
      <Toolbar sx={{ 
        justifyContent: 'space-between', 
        minHeight: '64px !important',
        px: 2,
      }}>
        {/* Левая часть - кнопки с плавной анимацией */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          width: '100px',
          opacity: sidebarOpen ? 0 : 1,
          transform: sidebarOpen ? 'translateX(-20px)' : 'translateX(0)',
          transition: 'all 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
          pointerEvents: sidebarOpen ? 'none' : 'auto',
        }}>
          {/* Кнопка меню */}
          <IconButton
            onClick={onMenuToggle}
            size="small"
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* Кнопка нового чата */}
          <IconButton
            onClick={onNewChat}
            size="small"
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Центр - заголовок */}
        <Typography 
          variant="h6" 
          component="div" 
          fontWeight="medium"
          sx={{
            fontSize: '1.1rem',
            flex: 1,
            textAlign: 'center',
          }}
        >
          AI Ассистент МТУСИ
        </Typography>

        {/* Правая часть - переключение темы */}
        <Box sx={{ width: '48px', display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton 
            onClick={onThemeToggle} 
            size="small"
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            {theme.palette.mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};