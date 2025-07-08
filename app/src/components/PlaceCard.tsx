import { Card, Text, Badge, Group, Tooltip, ActionIcon, Anchor, Stack } from '@mantine/core';
import { IconMapPin, IconPhone, IconClock, IconExternalLink } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import type { Place } from '../types';
import styles from './PlaceCard.module.css';

interface PlaceCardProps {
  place: Place;
  enableHover?: boolean;
  compact?: boolean;
  hideLinks?: boolean;
  hidePhoneHours?: boolean;
  maxDescriptionLength?: number;
}

export function PlaceCard({ 
  place, 
  enableHover = true, 
  compact = false, 
  hideLinks = false, 
  hidePhoneHours = false,
  maxDescriptionLength 
}: PlaceCardProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    // Detect if device supports touch
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
    
    // Also check on window resize (for responsive testing)
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getDisplayDescription = () => {
    if (!place.description) return null;
    if (maxDescriptionLength && place.description.length > maxDescriptionLength) {
      return truncateText(place.description, maxDescriptionLength);
    }
    return place.description;
  };

  const getDisplayedTagsCount = () => {
    if (isTouchDevice) return 4; // Show more tags on touch devices
    return compact ? 2 : 3;
  };

  const displayedTagsCount = getDisplayedTagsCount();
  const hasMoreTags = place.tags.length > displayedTagsCount;
  const displayedTags = showAllTags ? place.tags : place.tags.slice(0, displayedTagsCount);

  const renderTagsSection = () => {
    return (
      <Group gap="xs" mb={hideLinks ? "0" : "md"}>
        {displayedTags.map((tag) => (
          <Badge key={tag} size="xs" variant="dot" className={styles.tagsBadge}>
            {tag.toUpperCase()}
          </Badge>
        ))}
        {hasMoreTags && !showAllTags && (
          <>
            {isTouchDevice ? (
              // On touch devices, make it clickable to expand
              <Badge 
                size="xs" 
                variant="dot" 
                className={styles.tagsBadge}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTags(true);
                }}
              >
                +{place.tags.length - displayedTagsCount} MORE
              </Badge>
            ) : (
              // On desktop, use tooltip
              <Tooltip label={place.tags.slice(displayedTagsCount).join(', ')}>
                <Badge size="xs" variant="dot" className={styles.tagsBadge}>
                  +{place.tags.length - displayedTagsCount} MORE
                </Badge>
              </Tooltip>
            )}
          </>
        )}
        {showAllTags && isTouchDevice && (
          <Badge 
            size="xs" 
            variant="dot" 
            className={styles.tagsBadge}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setShowAllTags(false);
            }}
          >
            SHOW LESS
          </Badge>
        )}
      </Group>
    );
  };

  return (
    <Card 
      shadow="none" 
      padding={compact ? "sm" : "lg"}
      radius="md" 
      withBorder 
      className={`${styles.placeCard} ${getTypeClass(place.type)} ${enableHover ? styles.hoverEnabled : ''}`}
      style={compact ? { minWidth: '280px', maxWidth: '320px' } : undefined}
    >
      <div className={styles.cardHeader}>
        <Group justify="space-between" mb="xs">
          <Text fw={800} size={compact ? "md" : "lg"} className={styles.cardTitle} c="brand.6">
            {place.name}
          </Text>
          <Badge variant="light" size="sm" >
            {place.category.toUpperCase()}
          </Badge>
        </Group>
          
        {getDisplayDescription() && (
          <Text size="sm" c="dimmed" mb="xs" className={styles.cardDescription}>
            {getDisplayDescription()}
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
        
        {!hidePhoneHours && place.phone && (
          <div className={styles.infoGroup}>
            <IconPhone size={16} className={styles.infoIcon} />
            <Text size="sm">{place.phone}</Text>
          </div>
        )}
        
        {!hidePhoneHours && place.hours && (
          <div className={styles.infoGroup}>
            <IconClock size={16} className={styles.infoIcon} />
            <Text size="sm">
              {typeof place.hours === 'string' ? place.hours : 'See details'}
            </Text>
          </div>
        )}
      </Stack>

      {renderTagsSection()}

      {!hideLinks && (
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
      )}
    </Card>
  );
} 