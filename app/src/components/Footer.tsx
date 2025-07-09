import { Box, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <Box 
      component="footer" 
      mt="xl" 
      mb="md"
      pt="md" 
      style={{
        textAlign: 'center'
      }}
    >
      <Text size="sm" c="dimmed">
        {/* Add your addresses here */}
        Teddy (Sheddy Resident), Webmaster • Hosted by Geocities
        {' • '}
        <Text 
          component={Link} 
          to="/admin" 
          size="sm" 
          c="dimmed"
          style={{ 
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          Admin
        </Text>
      </Text>
    </Box>
  );
} 