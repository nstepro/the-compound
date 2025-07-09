import { useState } from 'react';
import { Container, Paper, Title, TextInput, Button, Alert, Stack } from '@mantine/core';
import { IconLock, IconAlertCircle } from '@tabler/icons-react';
import axios from 'axios';

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
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
        localStorage.setItem('adminToken', response.data.token);
        onLogin(response.data.token);
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
            Admin Access
          </Title>
          
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                type="password"
                label="Admin Password"
                placeholder="Enter admin password"
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
                Login
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
} 