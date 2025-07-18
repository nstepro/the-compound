import { Container, Title, Text, Card, Box } from '@mantine/core';

export function GettingHere() {
  return (
    <Container size="sm" py="xl">
      <Title order={1} mb="md">
        Getting to the Sheddy
      </Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Box
          component="img"
          src="/sheddy-narrow.svg"
          alt="Sheddy Logo"
          mb="md"
          style={{
            maxWidth: '300px',
            width: '100%',
            height: 'auto',
            filter: 'brightness(0) saturate(100%) invert(27%) sepia(77%) saturate(1729%) hue-rotate(211deg) brightness(95%) contrast(95%)'
          }}
        />
        <Text c="dimmed">
          (TBD password-protected section with directions to boulder hill)
        </Text>
      </Card>
    </Container>
  );
} 