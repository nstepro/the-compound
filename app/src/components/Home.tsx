import { Container, Stack, Box, Group, Button, Divider } from '@mantine/core';
import { Link } from 'react-router-dom';

// Function to create a CSS filter for the brand color
function getBrandColorFilter(): string {
  // For #307fe2 (your brand color), these filter values produce the correct color
  // You can adjust these values if you change your brand color
  return `brightness(0) saturate(100%) invert(27%) sepia(77%) saturate(1729%) hue-rotate(211deg) brightness(95%) contrast(95%)`;
}

export function Home() {
  const tabs = [
    { id: 'places', label: 'Places', path: '/places' },
    { id: 'shady', label: 'Shady', path: '/shady' },
    { id: 'lofty', label: 'Lofty', path: '/lofty' },
    // { id: 'getting-here', label: 'Getting to the Sheddy', path: '/getting-here' }
  ];

  return (
    <Container size="lg" py="xl">
      <Stack align="center" gap="xl" style={{ minHeight: '70vh', justifyContent: 'center' }}>
        {/* Large centered logo */}
        <Box
          component="img"
          src="/sheddy-full.svg"
          alt="Sheddy Logo"
          style={{
            maxWidth: '600px',
            width: '100%',
            height: 'auto',
            // Apply the same brand color filter as the navigation logo
            filter: getBrandColorFilter()
          }}
        />

        {/* Subtle half-width divider */}
        <Divider 
          size="xs" 
          color="gray.4" 
          style={{ 
            width: '50%', 
            opacity: 0.6 
          }} 
        />
        
        {/* Centered navigation links */}
        <Group justify="center" gap="lg" wrap="wrap">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="outline"
              component={Link}
              to={tab.path}
              size="sm"
              style={{ fontWeight: 800 }}
            >
              {tab.label}
            </Button>
          ))}
        </Group>
      </Stack>
    </Container>
  );
} 