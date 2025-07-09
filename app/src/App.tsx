import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation, PlacesList, Shady, Lofty, GettingHere, Home, Admin, Footer } from './components';
import { theme } from './theme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div style={{ 
      backgroundColor: 'var(--mantine-color-background-2)', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {!isHomePage && <Navigation />}
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/places" element={<PlacesList />} />
          <Route path="/shady" element={<Shady />} />
          <Route path="/lofty" element={<Lofty />} />
          <Route path="/getting-here" element={<GettingHere />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App
