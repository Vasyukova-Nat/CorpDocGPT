import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#302475', 
      light: '#B39DDB',
      dark: '#5E35B1',
    },
    secondary: {
      main: '#1E1E1E',
      contrastText: '#BB86FC',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
    },
    success: {
      main: '#66BB6A',
      light: '#81C784',
      dark: '#388E3C',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});