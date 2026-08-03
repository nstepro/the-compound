import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Textarea,
  Button,
  Stack,
  Alert,
  Card,
  Group,
  Badge,
  Anchor,
} from '@mantine/core';
import { IconPlus, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  mapsLink: string | null;
}

interface ExistingPlace {
  id: string;
  name: string;
  category: string;
  type: string;
  tags?: string[];
  address?: string;
  mapsLink?: string;
}

interface ProposedPlace {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string | null;
  notes?: string | null;
  origText: string;
  tags?: string[];
  hours?: string | string[];
  address?: string;
  mapsLink?: string;
  emoji?: string;
}

type PreviewStatus =
  | 'needs_clarification'
  | 'ready'
  | 'already_exists'
  | 'possible_duplicate';

interface PreviewResponse {
  success: boolean;
  status: PreviewStatus;
  message: string;
  candidates?: PlaceCandidate[];
  proposedPlace?: ProposedPlace;
  existingPlace?: ExistingPlace;
  summary?: string;
  docLinePreview?: string;
  advisoryDocMatch?: boolean;
}

interface AddPlacePanelProps {
  authToken: string | undefined;
  onAuthError: () => void;
}

export function AddPlacePanel({ authToken, onAuthError }: AddPlacePanelProps) {
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  });

  const handleAuthFailure = (status: number) => {
    if (status === 401 || status === 403) {
      notifications.show({
        title: 'Authentication Error',
        message: 'Your session has expired. Please log in again.',
        color: 'red',
      });
      onAuthError();
      return true;
    }
    return false;
  };

  const runPreview = async (placeId?: string | null) => {
    if (!authToken) {
      return;
    }
    if (!text.trim()) {
      notifications.show({
        title: 'Input required',
        message: 'Describe the place you want to add.',
        color: 'yellow',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/places/preview', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text: text.trim(),
          notes: notes.trim() || undefined,
          selectedPlaceId: placeId ?? undefined,
        }),
      });

      if (handleAuthFailure(response.status)) {
        return;
      }

      const result: PreviewResponse = await response.json();
      if (!response.ok || !result.success) {
        throw new Error((result as { message?: string }).message || 'Preview failed');
      }

      setPreview(result);
    } catch (error) {
      notifications.show({
        title: 'Preview failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async (forceDuplicate = false) => {
    if (!authToken || !preview?.proposedPlace) {
      return;
    }

    setCommitting(true);
    try {
      const response = await fetch('/api/admin/places/commit', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          proposedPlace: preview.proposedPlace,
          forceDuplicate,
        }),
      });

      if (handleAuthFailure(response.status)) {
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to add place');
      }

      notifications.show({
        title: 'Place added',
        message: `${preview.proposedPlace.name} was added to the doc and places file.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setText('');
      setNotes('');
      setPreview(null);
    } catch (error) {
      notifications.show({
        title: 'Add failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
    } finally {
      setCommitting(false);
    }
  };

  const resetPreview = () => {
    setPreview(null);
  };

  return (
    <Paper withBorder shadow="md" p="xl" radius="md">
      <Stack gap="md">
        <Title order={3}>Quick Add Place</Title>
        <Text c="dimmed" size="sm">
          Describe a place in plain text. We will look it up, update the Google Doc, and append it to
          the places file—without running the full parser.
        </Text>

        <Textarea
          label="Place description"
          placeholder='e.g. "spark bagels near lincolnville"'
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          minRows={2}
          maxLength={500}
          disabled={loading || committing}
        />

        <Textarea
          label="Optional notes"
          placeholder="e.g. cash only, great for kids"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          minRows={1}
          maxLength={500}
          disabled={loading || committing}
        />

        <Group>
          <Button
            onClick={() => runPreview()}
            loading={loading}
            leftSection={<IconPlus size={16} />}
            disabled={!text.trim() || committing}
          >
            Preview
          </Button>
          {preview && (
            <Button variant="subtle" onClick={resetPreview} disabled={loading || committing}>
              Start over
            </Button>
          )}
        </Group>

        {preview?.status === 'needs_clarification' && preview.candidates && preview.candidates.length > 0 && (
          <Stack gap="sm">
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              {preview.message}
            </Alert>
            {preview.candidates.map((candidate) => (
              <Card key={candidate.placeId} withBorder padding="sm">
                <Stack gap="xs">
                  <Text fw={600}>{candidate.name}</Text>
                  {candidate.address && (
                    <Text size="sm" c="dimmed">
                      {candidate.address}
                    </Text>
                  )}
                  <Group gap="xs">
                    {candidate.rating != null && (
                      <Badge variant="light">Rating {candidate.rating}</Badge>
                    )}
                    {candidate.mapsLink && (
                      <Anchor href={candidate.mapsLink} target="_blank" rel="noopener noreferrer" size="sm">
                        View on Maps
                      </Anchor>
                    )}
                  </Group>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => runPreview(candidate.placeId)}
                    loading={loading}
                  >
                    This one
                  </Button>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        {preview?.status === 'needs_clarification' &&
          (!preview.candidates || preview.candidates.length === 0) && (
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              {preview.message}
            </Alert>
          )}

        {preview?.status === 'already_exists' && preview.existingPlace && (
          <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Already in the guide">
            <Stack gap="xs">
              <Text size="sm">{preview.message}</Text>
              <Text size="sm">
                <strong>{preview.existingPlace.name}</strong> ({preview.existingPlace.category})
              </Text>
              {preview.existingPlace.tags && preview.existingPlace.tags.length > 0 && (
                <Text size="sm">Tags: {preview.existingPlace.tags.join(', ')}</Text>
              )}
              {preview.existingPlace.mapsLink && (
                <Anchor href={preview.existingPlace.mapsLink} target="_blank" rel="noopener noreferrer" size="sm">
                  View on Maps
                </Anchor>
              )}
            </Stack>
          </Alert>
        )}

        {(preview?.status === 'ready' || preview?.status === 'possible_duplicate') && (
          <Stack gap="sm">
            {preview.status === 'possible_duplicate' && preview.existingPlace && (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="Possible duplicate">
                <Text size="sm">{preview.message}</Text>
                <Text size="sm" mt="xs">
                  Existing: <strong>{preview.existingPlace.name}</strong> ({preview.existingPlace.category})
                </Text>
              </Alert>
            )}

            {preview.advisoryDocMatch && (
              <Alert color="gray" variant="light">
                A similar name may already appear in the Google Doc. Adding will create a new JSON entry
                and doc line.
              </Alert>
            )}

            <Paper withBorder p="md" bg="gray.0">
              <Text fw={500} mb="xs">
                I&apos;ll add the following:
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {preview.summary}
              </Text>
              {preview.docLinePreview && (
                <Text size="xs" c="dimmed" mt="sm" fs="italic">
                  Doc line: {preview.docLinePreview}
                </Text>
              )}
            </Paper>

            <Group>
              <Button
                color="green"
                onClick={() =>
                  handleCommit(preview.status === 'possible_duplicate')
                }
                loading={committing}
              >
                {preview.status === 'possible_duplicate' ? 'Add as new place' : 'Add place'}
              </Button>
              <Button variant="subtle" onClick={resetPreview} disabled={committing}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
