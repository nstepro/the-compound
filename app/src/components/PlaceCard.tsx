import { Card, Text, Badge, Group, Tooltip, ActionIcon, Anchor, Stack } from '@mantine/core';
import { IconMapPin, IconPhone, IconClock, IconExternalLink } from '@tabler/icons-react';
import type { Place } from '../types';
import styles from './PlaceCard.module.css';

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

  const getTypeClass = (type: string) => {
    const typeClasses = {
      restaurant: styles.restaurantCard,
      shopping: styles.shoppingCard,
      activity: styles.activityCard,
      attraction: styles.attractionCard,
      accommodation: styles.accommodationCard,
    };
    return typeClasses[type as keyof typeof typeClasses] || '';
  };

  return (
    <Card 
      shadow="none" 
      padding="lg" 
      radius="md" 
      // bg="accent.6"
      withBorder 
      className={`${styles.placeCard} ${getTypeClass(place.type)}`}
    >
      <div className={styles.cardHeader}>
        <Group justify="space-between" mb="xs">
          <Text fw={800} size="lg" className={styles.cardTitle} c="brand.6">
            {place.name}
          </Text>
          <Badge variant="light" size="sm" >
            {place.category.toUpperCase()}
          </Badge>
        </Group>
          

        {place.description && (
          <Text size="sm" c="dimmed" mb="xs" className={styles.cardDescription}>
            {place.description}
          </Text>
        )}
      </div>

      <Group mb="xs">
        <Badge color={typeColor} variant="outline">
          {place.type.toUpperCase()}
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

      <Stack gap="xs" mb="md">
        {place.address && (
          <div className={styles.infoGroup}>
            <IconMapPin size={16} className={styles.infoIcon} />
            <Text size="sm">{place.address}</Text>
          </div>
        )}
        
        {place.phone && (
          <div className={styles.infoGroup}>
            <IconPhone size={16} className={styles.infoIcon} />
            <Text size="sm">{place.phone}</Text>
          </div>
        )}
        
        {place.hours && (
          <div className={styles.infoGroup}>
            <IconClock size={16} className={styles.infoIcon} />
            <Text size="sm">
              {typeof place.hours === 'string' ? place.hours : 'See details'}
            </Text>
          </div>
        )}
      </Stack>

      <Group gap="xs" mb="md">
        {place.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} size="xs" variant="dot" className={styles.tagsBadge}>
            {tag.toUpperCase()}
          </Badge>
        ))}
        {place.tags.length > 3 && (
          <Tooltip label={place.tags.slice(3).join(', ')}>
            <Badge size="xs" variant="dot" className={styles.tagsBadge}>
              +{place.tags.length - 3} MORE
            </Badge>
          </Tooltip>
        )}
      </Group>

      <div className={styles.linkGroup}>
        <Group gap="xs">
          {place.url && (
            <Anchor href={place.url} target="_blank" size="sm" className={styles.customLink}>
              <Group gap="xs">
                <IconExternalLink size={16} />
                Website
              </Group>
            </Anchor>
          )}
          
          {place.mapsLink && (
            <Anchor href={place.mapsLink} target="_blank" size="sm" className={styles.customLink}>
              <Group gap="xs">
                <IconMapPin size={16} />
                Maps
              </Group>
            </Anchor>
          )}
        </Group>
      </div>
    </Card>
  );
} 