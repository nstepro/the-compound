import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { GuestLogin } from './GuestLogin';
import { Container, Button, Group, Text } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';

interface GuestAuthProps {
  children: ReactNode;
}

export function GuestAuth({ children }: GuestAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored token on component mount
    const storedToken = localStorage.getItem('guestToken');
    if (storedToken) {
      // TODO: Optionally verify token with backend
      setIsAuthenticated(true);
      // For now, we'll assume the role is stored or can be derived from the token
      // In a real app, you might want to decode the JWT to get the role
      setUserRole('guest'); // Default assumption
    }
  }, []);

  const handleLogin = (_token: string, role: string) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('guestToken');
    setUserRole(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <GuestLogin onLogin={handleLogin} />;
  }

  return (
    <Container size="lg" py="md">
      <Group justify="flex-end" mb="md">
        <Group gap="sm">
          <Text size="sm" c="dimmed">
            Logged in as {userRole === 'admin' ? 'Admin' : 'Guest'}
          </Text>
          <Button
            leftSection={<IconLogout size={16} />}
            variant="subtle"
            size="sm"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Group>
      </Group>
      {children}
    </Container>
  );
} 