import { Title, Text, Card, LoadingOverlay, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Markdown from 'react-markdown';
import { useHouseMechanics } from './useHouseMechanics';

export function Shady() {
  const { data: markdownContent, loading, error } = useHouseMechanics('shady');

  return (
    <>
      <Title order={1} mb="md">
        The Shady Sheddy
      </Title>
      
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        
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