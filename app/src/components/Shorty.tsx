import { Container, Title, Text, Card } from '@mantine/core';

export function Shorty() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">
        Shorty
      </Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text size="lg" mb="md">
          Welcome to Shorty!
        </Text>
        <Text c="dimmed">
          This section is coming soon. Stay tuned for updates!
        </Text>
      </Card>
    </Container>
  );
} 