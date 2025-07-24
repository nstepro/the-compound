import { useState, useEffect } from 'react';
import { Container, Paper, Title, Button, Stack, Alert, Text, Badge, ScrollArea } from '@mantine/core';
import { IconDownload, IconAlertCircle, IconCheck, IconClock, IconX, IconPlayerPlay, IconExternalLink } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';

interface ParseResult {
  success: boolean;
  message: string;
  data?: {
    totalPlaces: number;
    sourceDocTitle: string;
    generatedAt: string;
    typeBreakdown: Record<string, number>;
  };
}

interface StreamEvent {
  type: 'connected' | 'step' | 'info' | 'warning' | 'error' | 'completed' | 'heartbeat';
  message: string;
  timestamp: string;
  data?: any;
}

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const authToken = user?.token;
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ParseResult | null>(null);
  const [streamingLogs, setStreamingLogs] = useState<StreamEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [completionNotificationShown, setCompletionNotificationShown] = useState(false);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };
  };

  const handleRunPollingParser = async () => {
    if (!authToken) {
      notifications.show({
        title: 'Authentication Error',
        message: 'No authentication token found',
        color: 'red',
        icon: <IconX size={16} />,
      });
      return;
    }

    console.log('[CLIENT] Starting polling parser...');
    setIsRunning(true);
    setIsPolling(true);
    setStreamingLogs([]);
    setCurrentStep('');
    setLastResult(null);
    setCompletionNotificationShown(false); // Reset completion notification flag

    try {
      // Start the parser
      const response = await fetch('/api/admin/parse-polling', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          notifications.show({
            title: 'Authentication Error',
            message: 'Your session has expired. Please log in again.',
            color: 'red',
            icon: <IconX size={16} />,
          });
          logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }

      console.log('[CLIENT] Parser started, beginning polling...');
      
      // Start polling for status
      const interval = setInterval(async () => {
        try {
          await pollParserStatus();
        } catch (error) {
          console.error('[CLIENT] Polling error:', error);
          // Continue polling even if one request fails
        }
      }, 2000); // Poll every 2 seconds

      setPollingInterval(interval);

      // Do initial poll
      await pollParserStatus();

    } catch (error) {
      console.error('[CLIENT] Error starting polling parser:', error);
      setIsRunning(false);
      setIsPolling(false);
      
      notifications.show({
        title: 'Failed to start parser',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const pollParserStatus = async () => {
    try {
      const response = await fetch('/api/admin/parse-status', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const status = result.data;
        
        // Update UI with current status
        setCurrentStep(status.currentStep || '');
        setStreamingLogs(status.logs || []);
        
        // Check if parser is complete
        if (!status.isRunning) {
          // Parser finished
          setIsRunning(false);
          setIsPolling(false);
          
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          // Only show completion notification once
          if (!completionNotificationShown) {
            setCompletionNotificationShown(true);
            
            if (status.error) {
              // Parser failed
              notifications.show({
                title: 'Parser failed',
                message: status.error,
                color: 'red',
                icon: <IconX size={16} />,
              });
            } else if (status.result) {
              // Parser succeeded
              setLastResult(status.result);
              notifications.show({
                title: 'Parser completed successfully',
                message: `Generated ${status.result.data?.totalPlaces} places`,
                color: 'green',
                icon: <IconCheck size={16} />,
              });
            }
          } else {
            // Parser is complete but we've already shown notification
            // Just update the result if we haven't already
            if (status.result && !lastResult) {
              setLastResult(status.result);
            }
          }
        }
      }
    } catch (error) {
      console.error('[CLIENT] Error polling parser status:', error);
    }
  };

  const stopPolling = async () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    setIsRunning(false);
    setIsPolling(false);
    setCurrentStep('');
    setCompletionNotificationShown(false); // Reset when manually stopped
    
    // Try to stop the parser on the server
    try {
      await fetch('/api/admin/parse-stop', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('[CLIENT] Error stopping parser:', error);
    }
  };

  const handleDownloadOutput = async () => {
    try {
      const response = await fetch('/api/admin/download-output', {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          notifications.show({
            title: 'Authentication Error',
            message: 'Your session has expired. Please log in again.',
            color: 'red',
            icon: <IconX size={16} />,
          });
          logout();
          return;
        }
        throw new Error('Failed to download output');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compound-places.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      notifications.show({
        title: 'Download failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const handleOpenGoogleDoc = async () => {
    try {
      const response = await fetch('/api/admin/google-doc-url', {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          notifications.show({
            title: 'Authentication Error',
            message: 'Your session has expired. Please log in again.',
            color: 'red',
            icon: <IconX size={16} />,
          });
          logout();
          return;
        }
        throw new Error('Failed to get Google Doc URL');
      }
      
      const result = await response.json();
      
      if (result.success && result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error(result.message || 'Failed to get Google Doc URL');
      }
    } catch (error) {
      notifications.show({
        title: 'Failed to open Google Doc',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  return (
    <Container size="lg" mt="xl">
      <Stack gap="xl">
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Stack gap="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title order={2}>Admin Dashboard</Title>
              <Button variant="subtle" onClick={logout}>
                Logout
              </Button>
            </div>
            
            <Text c="dimmed">
              Manage the compound places data by running the parser to rebuild the JSON from the Google Doc.
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder shadow="md" p="xl" radius="md">
          <Stack gap="md">
            <Title order={3}>Parser Controls</Title>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button
                onClick={handleRunPollingParser}
                loading={isRunning}
                leftSection={<IconPlayerPlay size={16} />}
                disabled={isRunning}
              >
                {isRunning ? 'Running Parser...' : 'Run Parser'}
              </Button>
              
              {isPolling && (
                <Button
                  onClick={stopPolling}
                  leftSection={<IconX size={16} />}
                  variant="outline"
                  color="red"
                >
                  Stop Parser
                </Button>
              )}
              
              <Button
                onClick={handleDownloadOutput}
                leftSection={<IconDownload size={16} />}
                variant="outline"
                disabled={!lastResult?.success}
              >
                Download Output
              </Button>

              <Button
                onClick={handleOpenGoogleDoc}
                leftSection={<IconExternalLink size={16} />}
                variant="outline"
                color="blue"
              >
                Open Google Doc
              </Button>
            </div>

            {isRunning && (
              <Alert icon={<IconClock size={16} />} color="blue">
                Parser is running... This may take a few minutes.
              </Alert>
            )}

            {isPolling && (
              <Stack gap="sm">
                <Alert icon={<IconClock size={16} />} color="green">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Parser is running with live updates...</span>
                    {currentStep && (
                      <Badge variant="light" size="sm">
                        {currentStep}
                      </Badge>
                    )}
                  </div>
                </Alert>
                
                {streamingLogs.length > 0 && (
                  <Paper withBorder p="sm" style={{ backgroundColor: '#f0f9ff' }}>
                    <Text size="sm" fw={500} mb="xs">Parser Output (updates every 2 seconds):</Text>
                    <ScrollArea h={200} scrollbarSize={8}>
                      <Stack gap="xs">
                        {streamingLogs.map((log, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <Badge 
                              size="xs" 
                              variant="light"
                              color={
                                log.type === 'error' ? 'red' :
                                log.type === 'warning' ? 'yellow' :
                                log.type === 'step' ? 'blue' :
                                log.type === 'completed' ? 'green' : 'gray'
                              }
                            >
                              {log.type}
                            </Badge>
                            <Text size="sm" style={{ fontFamily: 'monospace', flex: 1 }}>
                              {log.message}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </Text>
                          </div>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Paper>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>

        {lastResult && (
          <Paper withBorder shadow="md" p="xl" radius="md">
            <Stack gap="md">
              <Title order={3}>Last Run Results</Title>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Badge color={lastResult.success ? 'green' : 'red'}>
                  {lastResult.success ? 'Success' : 'Failed'}
                </Badge>
                {lastResult.data && (
                  <Text size="sm" c="dimmed">
                    {lastResult.data.generatedAt}
                  </Text>
                )}
              </div>

              {lastResult.success && lastResult.data ? (
                <Stack gap="sm">
                  <Text>
                    <strong>Total Places:</strong> {lastResult.data.totalPlaces}
                  </Text>
                  <Text>
                    <strong>Source:</strong> {lastResult.data.sourceDocTitle}
                  </Text>
                  
                  <div>
                    <Text fw={500} mb="xs">Places by Type:</Text>
                    <Stack gap="xs">
                      {Object.entries(lastResult.data.typeBreakdown).map(([type, count]) => (
                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text size="sm">{type}</Text>
                          <Badge variant="light" size="sm">{count}</Badge>
                        </div>
                      ))}
                    </Stack>
                  </div>
                </Stack>
              ) : (
                <Alert icon={<IconAlertCircle size={16} />} color="red">
                  <Text size="sm">{lastResult.message}</Text>
                </Alert>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
} 