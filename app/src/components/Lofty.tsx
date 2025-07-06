import { Container, Title, Text, Card } from '@mantine/core';

export function Lofty() {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">
        Lofty
      </Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text size="lg" mb="md">
          Welcome to Lofty!
        </Text>
        <Text c="dimmed">
          This section is coming soon. Stay tuned for updates!
        </Text>
      </Card>
    </Container>
  );
} 