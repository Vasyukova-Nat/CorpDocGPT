import { useState, useEffect } from 'react';
import { Theme } from '@mui/material/styles';
import { lightTheme } from '../themes/light';
import { darkTheme } from '../themes/dark';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const theme: Theme = isDarkMode ? darkTheme : lightTheme;

  return {
    theme,
    isDarkMode,
    toggleTheme,
  };
};