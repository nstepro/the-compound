import { Card, Text, Badge, Group, Tooltip, ActionIcon, Anchor, Stack } from '@mantine/core';
import { IconMapPin, IconPhone, IconClock, IconExternalLink } from '@tabler/icons-react';
import type { Place } from '../types';

interface PlaceCardProps {
  place: Place;
}

export function PlaceCard({ place }: PlaceCardProps) {
  const typeColor = {
    restaurant: 'blue',
    shopping: 'green',
    activity: 'orange',
    attraction: 'purple',
    accommodation: 'pink',
  }[place.type] || 'gray';

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={500} size="lg">
          {place.name}
        </Text>
        <Badge color={typeColor} variant="light">
          {place.type}
        </Badge>
      </Group>

      <Group mb="xs">
        <Badge variant="outline" size="sm">
          {place.category}
        </Badge>
        {place.priceRange && (
          <Badge variant="outline" size="sm" color="green">
            {place.priceRange}
          </Badge>
        )}
        {place.rating && (
          <Badge variant="outline" size="sm" color="yellow">
            ⭐ {place.rating}
          </Badge>
        )}
      </Group>

      {place.description && (
        <Text size="sm" c="dimmed" mb="xs">
          {place.description}
        </Text>
      )}

      {place.notes && (
        <Text size="sm" c="dimmed" mb="xs" style={{ fontStyle: 'italic' }}>
          {place.notes}
        </Text>
      )}

      <Stack gap="xs" mb="md">
        {place.address && (
          <Group gap="xs">
            <IconMapPin size={16} />
            <Text size="sm">{place.address}</Text>
          </Group>
        )}
        
        {place.phone && (
          <Group gap="xs">
            <IconPhone size={16} />
            <Text size="sm">{place.phone}</Text>
          </Group>
        )}
        
        {place.hours && (
          <Group gap="xs">
            <IconClock size={16} />
            <Text size="sm">
              {typeof place.hours === 'string' ? place.hours : 'See details'}
            </Text>
          </Group>
        )}
      </Stack>

      <Group gap="xs" mb="md">
        {place.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} size="xs" variant="dot">
            {tag}
          </Badge>
        ))}
        {place.tags.length > 3 && (
          <Tooltip label={place.tags.slice(3).join(', ')}>
            <Badge size="xs" variant="dot">
              +{place.tags.length - 3} more
            </Badge>
          </Tooltip>
        )}
      </Group>

      <Group gap="xs">
        {place.url && (
          <Anchor href={place.url} target="_blank" size="sm">
            <Group gap="xs">
              <IconExternalLink size={16} />
              Website
            </Group>
          </Anchor>
        )}
        
        {place.mapsLink && (
          <Anchor href={place.mapsLink} target="_blank" size="sm">
            <Group gap="xs">
              <IconMapPin size={16} />
              Maps
            </Group>
          </Anchor>
        )}
      </Group>
    </Card>
  );
} 