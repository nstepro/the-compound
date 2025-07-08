import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation, PlacesList, Shady, Lofty, GettingHere, Home } from './components';
import { theme } from './theme';
import '@mantine/core/styles.css';

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div style={{ 
      backgroundColor: 'var(--mantine-color-background-2)', 
      minHeight: '100vh'
    }}>
      {!isHomePage && <Navigation />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/places" element={<PlacesList />} />
        <Route path="/shady" element={<Shady />} />
        <Route path="/lofty" element={<Lofty />} />
        <Route path="/getting-here" element={<GettingHere />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App
