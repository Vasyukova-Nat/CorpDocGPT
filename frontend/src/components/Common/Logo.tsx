import React from 'react';
import { Box, useTheme } from '@mui/material';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  white?: boolean;
  forceWhite?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium',
  className,
  white = false,
  forceWhite = false
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const sizes = {
    small: { width: 32, height: 32 },
    medium: { width: 40, height: 40 },
    large: { width: 120, height: 120 },
  };

  const { width, height } = sizes[size];
  const shouldBeWhite = white || (forceWhite && isDarkMode);

  const LogoSvg = () => (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 339 339" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M267.259 74.5966L185.67 34.705C175.452 29.7089 163.548 29.7089 153.33 34.705L71.7413 74.5966C61.5229 79.5927 54.1014 89.0412 51.5777 100.267L31.4269 189.903C28.9032 201.129 31.5519 212.911 38.6232 221.914L95.0844 293.796C102.156 302.799 112.88 308.042 124.222 308.042H214.778C226.12 308.042 236.844 302.799 243.916 293.796L300.377 221.914C307.448 212.911 310.097 201.129 307.573 189.903L287.422 100.267C284.899 89.0412 277.477 79.5927 267.259 74.5966ZM198.9 6.81289C180.321 -2.27096 158.679 -2.27097 140.1 6.81289L58.5113 46.7044C39.9325 55.7883 26.4389 72.9673 21.8503 93.3786L1.6995 183.014C-2.88911 203.425 1.92669 224.847 14.7837 241.216L71.2449 313.098C84.1018 329.466 103.601 339 124.222 339H214.778C235.399 339 254.898 329.466 267.755 313.098L324.216 241.216C337.073 224.847 341.889 203.425 337.301 183.014L317.15 93.3786C312.561 72.9673 299.068 55.7883 280.489 46.7044L198.9 6.81289Z" 
        fill={shouldBeWhite ? "white" : "currentColor"}
      />
    </svg>
  );

  return (
    <Box
      className={className}
      sx={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: shouldBeWhite ? 'transparent' : 'primary.main',
      }}
    >
      <LogoSvg />
    </Box>
  );
};