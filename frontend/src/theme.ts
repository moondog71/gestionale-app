import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2B4BA0',
      light: '#5C74CF',
      dark: '#001258',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#7B2080',
      light: '#AE52B2',
      dark: '#30004B',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F6F8FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#191C20',
      secondary: '#44474E',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    subtitle1: { fontWeight: 500 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 20, textTransform: 'none', fontWeight: 500 },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: 'none', border: '0.5px solid rgba(0,0,0,0.1)' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 500, backgroundColor: '#F6F8FF', color: '#44474E', fontSize: 12 },
      },
    },
  },
})

export default theme
