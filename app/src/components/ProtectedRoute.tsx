import { useState } from 'react';
import type { ReactNode } from 'react';
import { Container, Paper, Title, TextInput, Button, Alert, Stack, Text, Group } from '@mantine/core';
import { IconLock, IconAlertCircle, IconLogout } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: 'admin' | 'guest';
  title: string;
  subtitle?: string;
}

export function ProtectedRoute({ children, requiredRole, title, subtitle }: ProtectedRouteProps) {
  const { user, isLoading, login, logout, hasAccess } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <Container size="sm" mt="xl">
        <Text ta="center">Loading...</Text>
      </Container>
    );
  }

  // Check if user has access
  if (hasAccess(requiredRole)) {
    return (
      <Container size="lg" py="md">
        <Group justify="flex-end" mb="md">
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              Logged in as {user?.role === 'admin' ? 'Admin' : 'Guest'}
            </Text>
            <Button
              leftSection={<IconLogout size={16} />}
              variant="subtle"
              size="sm"
              onClick={logout}
            >
              Logout
            </Button>
          </Group>
        </Group>
        {children}
      </Container>
    );
  }

  // User needs to login or doesn't have sufficient permissions
  const isWrongRole = user && !hasAccess(requiredRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await login(password);
    
    if (!result.success) {
      setError(result.message || 'Login failed');
    }
    // If login succeeds, component will re-render and show content
    
    setIsSubmitting(false);
    setPassword('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  return (
    <Container size="sm" mt="xl">
      {isWrongRole && (
        <Alert color="orange" mb="md">
          <Group justify="space-between">
            <Text size="sm">
              You are logged in as <strong>{user?.role}</strong>, but {requiredRole} access is required.
            </Text>
            <Button size="xs" variant="outline" onClick={logout}>
              Logout
            </Button>
          </Group>
        </Alert>
      )}
      
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Stack gap="md">
          <Title order={2} ta="center">
            {title}
          </Title>
          
          {subtitle && (
            <Text size="sm" c="dimmed" ta="center">
              {subtitle}
            </Text>
          )}
          
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                type="password"
                label="Password"
                placeholder="Enter password"
                value={password}
                onChange={handlePasswordChange}
                leftSection={<IconLock size={16} />}
                required
              />
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!password.trim()}
                fullWidth
              >
                {isWrongRole ? 'Login with Different Credentials' : 'Access Content'}
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
} 