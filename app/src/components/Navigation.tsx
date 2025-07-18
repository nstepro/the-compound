import { Container, Group, Button, Burger, Drawer, Stack, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, useLocation } from 'react-router-dom';

// Function to create a CSS filter for the brand color
function getBrandColorFilter(): string {
  // For #307fe2 (your brand color), these filter values produce the correct color
  // You can adjust these values if you change your brand color
  return `brightness(0) saturate(100%) invert(27%) sepia(77%) saturate(1729%) hue-rotate(211deg) brightness(95%) contrast(95%)`;
}

export function Navigation() {
  const [opened, { open, close }] = useDisclosure(false);
  const location = useLocation();

  const tabs = [
    { id: 'places', label: 'Places', path: '/places' },
    { id: 'shady', label: 'Shady', path: '/shady' },
    { id: 'lofty', label: 'Lofty', path: '/lofty' },
    // { id: 'getting-here', label: 'Getting to the Sheddy', path: '/getting-here' }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Container size="xl" py="md" style={{ width: '100%' }}>
      <Group justify="space-between" style={{ width: '100%' }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Box
            component="img"
            src="/sheddy-narrow.svg"
            alt="Sheddy Logo"
            h={40}
            w="auto"
            style={{
              // Dynamically color the SVG using the brand color
              filter: getBrandColorFilter()
            }}
          />
        </Link>

        {/* Desktop Navigation */}
        <Group gap="md" visibleFrom="sm">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={isActive(tab.path) ? 'filled' : 'subtle'}
              component={Link}
              to={tab.path}
            >
              {tab.label}
            </Button>
          ))}
        </Group>

        {/* Mobile Navigation */}
        <Burger opened={opened} onClick={open} hiddenFrom="sm" color="brand.6" />
      </Group>
      
      <Drawer opened={opened} onClose={close} position="right">
        <Stack>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={isActive(tab.path) ? 'filled' : 'subtle'}
              component={Link}
              to={tab.path}
              fullWidth
              onClick={close}
            >
              {tab.label}
            </Button>
          ))}
        </Stack>
      </Drawer>
    </Container>
  );
} 