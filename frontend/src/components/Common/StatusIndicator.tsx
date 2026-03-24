import React from 'react';
import {
  Alert,
  Box,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const StatusIndicator: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: apiService.getHealth,
    refetchInterval: 10000,
  });

  const getStatusConfig = () => {
    if (isLoading) {
      return {
        severity: 'info' as const,
        icon: <CircularProgress size={20} />,
        text: 'Проверка состояния системы...',
        backgroundColor: isDarkMode ? 'rgba(2, 136, 209, 0.2)' : undefined,
      };
    }
    
    if (error || !health) {
      return {
        severity: 'error' as const,
        icon: <ErrorIcon />,
        text: 'Ошибка подключения к серверу',
        backgroundColor: isDarkMode ? 'rgba(211, 47, 47, 0.2)' : undefined,
      };
    }
    
    if (health.status === 'healthy') {
      return {
        severity: 'success' as const,
        icon: <HealthyIcon />,
        text: 'Все системы работают нормально',
        backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.2)' : undefined,
      };
    }
    
    return {
      severity: 'warning' as const,
      icon: <WarningIcon />,
      text: 'Частичное нарушение работы',
      backgroundColor: isDarkMode ? 'rgba(255, 152, 0, 0.2)' : undefined,
    };
  };

  const { severity, icon, text, backgroundColor } = getStatusConfig();

  return (
    <Alert
      severity={severity}
      icon={icon}
      sx={{
        borderRadius: 2,
        mb: 3,
        backgroundColor: backgroundColor,
        '& .MuiAlert-message': {
          width: '100%',
        },
        ...(isDarkMode && {
          color: 'white',
          '& .MuiAlert-icon': {
            color: theme.palette[severity].main,
          },
        }),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Typography variant="body2" sx={{ color: isDarkMode ? 'white' : 'inherit' }}>
          {text}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8, color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'inherit' }}>
          Документов: {health?.components?.knowledge_base_documents || 0}
        </Typography>
      </Box>
    </Alert>
  );
};