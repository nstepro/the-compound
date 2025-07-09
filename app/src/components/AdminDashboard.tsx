import { useState, useRef, useEffect } from 'react';
import { Container, Paper, Title, Button, Stack, Alert, Text, Badge, ScrollArea } from '@mantine/core';
import { IconRefresh, IconDownload, IconAlertCircle, IconCheck, IconClock, IconX, IconPlayerPlay } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

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
  type: 'connected' | 'step' | 'info' | 'warning' | 'error' | 'completed';
  message: string;
  timestamp: string;
  data?: any;
}

interface AdminDashboardProps {
  onLogout: () => void;
  authToken: string | null;
}

export function AdminDashboard({ onLogout, authToken }: AdminDashboardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ParseResult | null>(null);
  const [streamingLogs, setStreamingLogs] = useState<StreamEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup EventSource on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };
  };

  const handleRunStreamingParser = async () => {
    if (!authToken) {
      notifications.show({
        title: 'Authentication Error',
        message: 'No authentication token found',
        color: 'red',
        icon: <IconX size={16} />,
      });
      return;
    }

    setIsRunning(true);
    setIsStreaming(true);
    setStreamingLogs([]);
    setCurrentStep('');
    setLastResult(null);

    try {
      const eventSource = new EventSource(
        `/api/admin/parse-stream?token=${encodeURIComponent(authToken)}`
      );
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);
          
          setStreamingLogs(prev => [...prev, data]);
          
          if (data.type === 'step') {
            setCurrentStep(data.message);
          } else if (data.type === 'completed') {
            setLastResult(data.data);
            setCurrentStep('Completed');
            setIsRunning(false);
            setIsStreaming(false);
            eventSource.close();
            
            notifications.show({
              title: 'Parser completed successfully',
              message: `Generated ${data.data?.data?.totalPlaces} places`,
              color: 'green',
              icon: <IconCheck size={16} />,
            });
          } else if (data.type === 'error') {
            setCurrentStep('Error');
            setIsRunning(false);
            setIsStreaming(false);
            eventSource.close();
            
            notifications.show({
              title: 'Parser failed',
              message: data.message,
              color: 'red',
              icon: <IconX size={16} />,
            });
          }
        } catch (error) {
          console.error('Error parsing stream event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setIsRunning(false);
        setIsStreaming(false);
        eventSource.close();
        
        if (eventSource.readyState === EventSource.CLOSED) {
          notifications.show({
            title: 'Connection lost',
            message: 'Lost connection to parser stream',
            color: 'red',
            icon: <IconX size={16} />,
          });
        }
      };
    } catch (error) {
      console.error('Error starting stream:', error);
      setIsRunning(false);
      setIsStreaming(false);
      
      notifications.show({
        title: 'Failed to start stream',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
    setIsStreaming(false);
    setCurrentStep('');
  };

  const handleRunParser = async () => {
    setIsRunning(true);
    
    try {
      const response = await fetch('/api/admin/parse', {
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
          onLogout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setLastResult(result);
      
      if (result.success) {
        notifications.show({
          title: 'Parser completed successfully',
          message: `Generated ${result.data?.totalPlaces} places`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } else {
        notifications.show({
          title: 'Parser failed',
          message: result.message,
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult({
        success: false,
        message: errorMessage
      });
      
      notifications.show({
        title: 'Parser failed',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsRunning(false);
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
          onLogout();
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

  return (
    <Container size="lg" mt="xl">
      <Stack gap="xl">
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Stack gap="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title order={2}>Admin Dashboard</Title>
              <Button variant="subtle" onClick={onLogout}>
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
                onClick={handleRunStreamingParser}
                loading={isRunning}
                leftSection={<IconPlayerPlay size={16} />}
                disabled={isRunning}
              >
                {isRunning ? 'Running Parser...' : 'Run Parser (Streaming)'}
              </Button>
              
              <Button
                onClick={handleRunParser}
                loading={isRunning}
                leftSection={<IconRefresh size={16} />}
                disabled={isRunning}
                variant="outline"
              >
                {isRunning ? 'Running Parser...' : 'Run Parser (Legacy)'}
              </Button>
              
              {isStreaming && (
                <Button
                  onClick={stopStream}
                  leftSection={<IconX size={16} />}
                  variant="outline"
                  color="red"
                >
                  Stop Stream
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
            </div>

            {isRunning && !isStreaming && (
              <Alert icon={<IconClock size={16} />} color="blue">
                Parser is running... This may take a few minutes.
              </Alert>
            )}

            {isStreaming && (
              <Stack gap="sm">
                <Alert icon={<IconClock size={16} />} color="blue">
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
                  <Paper withBorder p="sm" style={{ backgroundColor: '#f8f9fa' }}>
                    <Text size="sm" fw={500} mb="xs">Live Output:</Text>
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