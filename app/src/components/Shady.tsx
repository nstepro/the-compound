import { Title, Text, Card, Box, LoadingOverlay, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Markdown from 'react-markdown';
import { useHouseMechanics } from './useHouseMechanics';
import { GuestAuth } from './GuestAuth';

function ShadyContent() {
  const { data: markdownContent, loading, error } = useHouseMechanics('shady');

  return (
    <>
      <Title order={1} mb="md">
        The Shady Sheddy
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
        
        <LoadingOverlay visible={loading} />
        
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
            {error}
          </Alert>
        )}
        
        {markdownContent && (
          <div className="markdown-content">
            <Markdown>{markdownContent}</Markdown>
          </div>
        )}
        
        {!loading && !error && !markdownContent && (
          <Text c="dimmed">
            (TBD password-protected section with info like wifi, address, house mechanics, etc.)
          </Text>
        )}
      </Card>
    </>
  );
}

export function Shady() {
  return (
    <GuestAuth>
      <ShadyContent />
    </GuestAuth>
  );
} 