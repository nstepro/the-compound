import { useState } from 'react';
import { Container, Paper, Title, TextInput, Button, Alert, Stack, Text } from '@mantine/core';
import { IconLock, IconAlertCircle } from '@tabler/icons-react';
import axios from 'axios';

interface GuestLoginProps {
  onLogin: (token: string, role: string) => void;
}

export function GuestLogin({ onLogin }: GuestLoginProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await axios.post('/api/auth/login', { password });
      
      if (response.data.success) {
        // Store token in localStorage
        localStorage.setItem('guestToken', response.data.token);
        onLogin(response.data.token, response.data.role);
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="sm" mt="xl">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Stack gap="md">
          <Title order={2} ta="center">
            Access Required
          </Title>
          
          <Text size="sm" c="dimmed" ta="center">
            Please enter the password to access this content.
          </Text>
          
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
                onChange={(e) => setPassword(e.target.value)}
                leftSection={<IconLock size={16} />}
                required
              />
              <Button
                type="submit"
                loading={isLoading}
                disabled={!password.trim()}
                fullWidth
              >
                Access Content
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
} 