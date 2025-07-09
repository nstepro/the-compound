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
  type: 'connected' | 'step' | 'info' | 'warning' | 'error' | 'completed' | 'heartbeat';
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
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup EventSource and polling on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
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

    console.log('[CLIENT] Starting streaming parser...');
    setIsRunning(true);
    setIsStreaming(true);
    setStreamingLogs([]);
    setCurrentStep('');
    setLastResult(null);

    try {
      const streamUrl = `/api/admin/parse-stream?token=${encodeURIComponent(authToken)}`;
      console.log('[CLIENT] Connecting to stream URL:', streamUrl);
      
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      console.log('[CLIENT] EventSource created, readyState:', eventSource.readyState);

      eventSource.onopen = (event) => {
        console.log('[CLIENT] EventSource connection opened:', event);
        console.log('[CLIENT] EventSource readyState after open:', eventSource.readyState);
      };

      eventSource.onmessage = (event) => {
        console.log('[CLIENT] Received SSE message:', event.data);
        
        try {
          const data: StreamEvent = JSON.parse(event.data);
          console.log('[CLIENT] Parsed SSE data:', data);
          
          setStreamingLogs(prev => {
            const newLogs = [...prev, data];
            console.log('[CLIENT] Updated streaming logs count:', newLogs.length);
            return newLogs;
          });
          
          if (data.type === 'step') {
            console.log('[CLIENT] Setting current step:', data.message);
            setCurrentStep(data.message);
          } else if (data.type === 'completed') {
            console.log('[CLIENT] Parser completed:', data.data);
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
            console.log('[CLIENT] Parser error:', data.message);
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
          } else if (data.type === 'heartbeat') {
            console.log('[CLIENT] Heartbeat received at', data.timestamp);
          } else {
            console.log('[CLIENT] Other event type:', data.type, data.message);
          }
        } catch (error) {
          console.error('[CLIENT] Error parsing stream event:', error);
          console.error('[CLIENT] Raw event data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[CLIENT] EventSource error:', error);
        console.error('[CLIENT] EventSource readyState:', eventSource.readyState);
        console.error('[CLIENT] EventSource url:', eventSource.url);
        
        setIsRunning(false);
        setIsStreaming(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('[CLIENT] Connection was closed');
          notifications.show({
            title: 'Connection lost',
            message: 'Lost connection to parser stream',
            color: 'red',
            icon: <IconX size={16} />,
          });
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          console.log('[CLIENT] Still trying to connect...');
        } else {
          console.log('[CLIENT] Unknown connection state');
        }
        
        eventSource.close();
      };

      // Add a timeout to detect if connection never establishes
      const connectionTimeout = setTimeout(() => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.error('[CLIENT] Connection timeout - never established');
          eventSource.close();
          setIsRunning(false);
          setIsStreaming(false);
          
          notifications.show({
            title: 'Connection timeout',
            message: 'Could not establish connection to parser stream',
            color: 'red',
            icon: <IconX size={16} />,
          });
        }
      }, 30000); // 30 second timeout

      // Clear timeout when connection is established
      eventSource.addEventListener('open', () => {
        clearTimeout(connectionTimeout);
      });

      // Clear timeout when connection fails
      eventSource.addEventListener('error', () => {
        clearTimeout(connectionTimeout);
      });

    } catch (error) {
      console.error('[CLIENT] Error starting stream:', error);
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
          onLogout();
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

  const handleDebugServerInfo = async () => {
    try {
      const response = await fetch('/api/admin/debug/server-info', {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch server info');
      }
      
      const info = await response.json();
      console.log('[DEBUG] Server info:', info);
      
      notifications.show({
        title: 'Server Info',
        message: `Node: ${info.nodeVersion}, Platform: ${info.platform}, SSE: ${info.serverCapabilities.sse}`,
        color: 'blue',
      });
    } catch (error) {
      console.error('[DEBUG] Error fetching server info:', error);
      notifications.show({
        title: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
    }
  };

  const handleDebugSSETest = async () => {
    if (!authToken) {
      notifications.show({
        title: 'Authentication Error',
        message: 'No authentication token found',
        color: 'red',
        icon: <IconX size={16} />,
      });
      return;
    }

    console.log('[DEBUG] Starting SSE test...');
    
    try {
      const testUrl = `/api/admin/debug/sse-test?token=${encodeURIComponent(authToken)}`;
      console.log('[DEBUG] Connecting to test URL:', testUrl);
      
      const eventSource = new EventSource(testUrl);
      let messageCount = 0;

      eventSource.onopen = (event) => {
        console.log('[DEBUG] Test SSE connection opened:', event);
        notifications.show({
          title: 'SSE Test',
          message: 'Test connection established',
          color: 'green',
        });
      };

      eventSource.onmessage = (event) => {
        messageCount++;
        console.log(`[DEBUG] Test SSE message ${messageCount}:`, event.data);
        
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'test-complete') {
            eventSource.close();
            notifications.show({
              title: 'SSE Test Complete',
              message: `Received ${messageCount} messages successfully`,
              color: 'green',
            });
          }
        } catch (error) {
          console.error('[DEBUG] Error parsing test message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[DEBUG] Test SSE error:', error);
        console.error('[DEBUG] Test SSE readyState:', eventSource.readyState);
        eventSource.close();
        
        notifications.show({
          title: 'SSE Test Failed',
          message: `Connection failed after ${messageCount} messages`,
          color: 'red',
        });
      };

    } catch (error) {
      console.error('[DEBUG] Error starting SSE test:', error);
      notifications.show({
        title: 'SSE Test Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
    }
  };

  const handleDebugSimpleStream = async () => {
    try {
      const response = await fetch('/api/admin/debug/simple-stream', {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start simple stream');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let messageCount = 0;
      
      if (reader) {
        console.log('[DEBUG] Starting simple stream reader...');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            messageCount++;
            console.log(`[DEBUG] Simple stream chunk ${messageCount}:`, chunk);
          }
          
          notifications.show({
            title: 'Simple Stream Test',
            message: `Received ${messageCount} chunks successfully`,
            color: 'green',
          });
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error with simple stream:', error);
      notifications.show({
        title: 'Simple Stream Test Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
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
                onClick={handleRunPollingParser}
                loading={isRunning}
                leftSection={<IconPlayerPlay size={16} />}
                disabled={isRunning}
              >
                {isRunning ? 'Running Parser...' : 'Run Parser (Polling)'}
              </Button>
              
              <Button
                onClick={handleRunStreamingParser}
                loading={isRunning}
                leftSection={<IconRefresh size={16} />}
                disabled={isRunning}
                variant="outline"
              >
                {isRunning ? 'Running Parser...' : 'Run Parser (SSE)'}
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
              
              {isPolling && (
                <Button
                  onClick={stopPolling}
                  leftSection={<IconX size={16} />}
                  variant="outline"
                  color="red"
                >
                  Stop Polling
                </Button>
              )}
              
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
            
            <div style={{ marginTop: '1rem' }}>
              <Text size="sm" fw={500} mb="xs" c="dimmed">Debug Tools:</Text>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button
                  onClick={handleDebugServerInfo}
                  size="xs"
                  variant="light"
                  color="blue"
                >
                  Server Info
                </Button>
                
                <Button
                  onClick={handleDebugSSETest}
                  size="xs"
                  variant="light"
                  color="green"
                >
                  Test SSE
                </Button>
                
                <Button
                  onClick={handleDebugSimpleStream}
                  size="xs"
                  variant="light"
                  color="orange"
                >
                  Test Simple Stream
                </Button>
              </div>
            </div>

            {isRunning && !isStreaming && !isPolling && (
              <Alert icon={<IconClock size={16} />} color="blue">
                Parser is running... This may take a few minutes.
              </Alert>
            )}

            {isStreaming && (
              <Stack gap="sm">
                <Alert icon={<IconClock size={16} />} color="blue">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Parser is running with live updates (SSE)...</span>
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

            {isPolling && (
              <Stack gap="sm">
                <Alert icon={<IconClock size={16} />} color="green">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Parser is running with polling updates...</span>
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