import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navigation, PlacesList, GettingHere, Home, Footer } from './components';
import { AdminDashboard } from './components/AdminDashboard';
import { Lofty } from './components/Lofty';
import { Shady } from './components/Shady';
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
          <Route path="/getting-here" element={<GettingHere />} />
          <Route 
            path="/shady" 
            element={
              <ProtectedRoute 
                requiredRole="guest" 
                title="Access Required"
                subtitle="Please enter the password to access Shady content."
              >
                <Shady />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/lofty" 
            element={
              <ProtectedRoute 
                requiredRole="guest" 
                title="Access Required"
                subtitle="Please enter the password to access Lofty content."
              >
                <Lofty />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute 
                requiredRole="admin" 
                title="Admin Access"
                subtitle="Please enter admin credentials."
              >
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
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
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App
