import { Accordion, Badge, Group, Text, Anchor, Stack, Tooltip } from '@mantine/core';
import { IconMapPin, IconPhone, IconClock, IconExternalLink } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import type { Place } from '../types';
import styles from './PlaceCard.module.css';

interface PlaceListItemProps {
  place: Place;
}

export function PlaceListItem({ place }: PlaceListItemProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showExpandedHours, setShowExpandedHours] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
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

  const formatHoursText = (hoursText: string) => {
    const firstSpaceIndex = hoursText.indexOf(' ');
    if (firstSpaceIndex === -1) {
      return hoursText;
    }
    
    const beforeSpace = hoursText.substring(0, firstSpaceIndex);
    const afterSpace = hoursText.substring(firstSpaceIndex + 1);
    
    return (
      <>
        {beforeSpace} <Text component="span" fw={700}>{afterSpace}</Text>
      </>
    );
  };

  const displayedTagsCount = isTouchDevice ? 4 : 3;
  const hasMoreTags = place.tags.length > displayedTagsCount;
  const displayedTags = showAllTags ? place.tags : place.tags.slice(0, displayedTagsCount);

  const renderTagsSection = (isCompact = false) => {
    const tagsToShow = isCompact ? place.tags.slice(0, 2) : displayedTags;
    const showMoreInCompact = isCompact && place.tags.length > 2;
    
    return (
      <Group gap="xs">
        {tagsToShow.map((tag) => (
          <Badge key={tag} size="xs" variant="dot" className={styles.tagsBadge}>
            {tag.toUpperCase()}
          </Badge>
        ))}
        {showMoreInCompact && (
          <Badge size="xs" variant="dot" className={styles.tagsBadge}>
            +{place.tags.length - 2}
          </Badge>
        )}
        {!isCompact && hasMoreTags && !showAllTags && (
          <>
            {isTouchDevice ? (
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
              <Tooltip label={place.tags.slice(displayedTagsCount).join(', ').toUpperCase()}>
                <Badge size="xs" variant="dot" className={styles.tagsBadge}>
                  +{place.tags.length - displayedTagsCount} MORE
                </Badge>
              </Tooltip>
            )}
          </>
        )}
        {!isCompact && showAllTags && isTouchDevice && (
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
    <Accordion.Item value={place.id}>
      <Accordion.Control>
        <Group justify="space-between" wrap="nowrap" gap="sm" align="center">
          <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700} c="brand" truncate style={{ flex: 1, minWidth: 0 }}>
              {place.name}
            </Text>
            {place.description && (
              <Text 
                size="xs" 
                c="dimmed" 
                truncate 
                style={{ 
                  flexShrink: 1, 
                  minWidth: 0,
                  display: 'none' 
                }} 
                className="wide-screen-only"
              >
                {place.description.length > 80 ? place.description.substring(0, 80) + '...' : place.description}
              </Text>
            )}
            <Badge color={typeColor} variant="light" size="xs" style={{ flexShrink: 0 }}>
              {place.type.toUpperCase()}
            </Badge>
            <Badge variant="light" size="xs" style={{ flexShrink: 0 }}>
              {place.category}
            </Badge>
            {place.tags.length > 0 && (
              <div 
                style={{ 
                  flexShrink: 0,
                  display: 'none' 
                }} 
                className="wide-screen-only"
              >
                {renderTagsSection(true)}
              </div>
            )}
          </Group>
          
          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
            {place.website && (
              <Anchor
                href={place.website}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                style={{ lineHeight: 1, display: 'flex', alignItems: 'center' }}
              >
                <IconExternalLink size={16} />
              </Anchor>
            )}
            {place.mapsLink && (
              <Anchor
                href={place.mapsLink}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                style={{ lineHeight: 1, display: 'flex', alignItems: 'center' }}
              >
                <IconMapPin size={16} />
              </Anchor>
            )}
          </Group>
        </Group>
      </Accordion.Control>
      
      <Accordion.Panel>
        <div style={{ padding: '12px 0' }}>
          {place.description && (
            <Text size="sm" c="dimmed" mb="sm" className={styles.cardDescription}>
              {place.description}
            </Text>
          )}
          
          <Group mb="sm">
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
                <div>
                  {typeof place.hours === 'string' ? (
                    <Text size="sm">{place.hours}</Text>
                  ) : (
                    <div>
                      <Text 
                        size="sm" 
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExpandedHours(!showExpandedHours);
                        }}
                      >
                        {showExpandedHours ? 'Hide hours' : 'Show hours'}
                      </Text>
                      {showExpandedHours && (
                        <Stack gap="xs" mt="xs">
                          {Object.entries(place.hours as Record<string, string>).map(([day, hours]) => (
                            <Group key={day} gap="xl">
                              <Text size="sm" mt="none" mb="none">{formatHoursText(hours)}</Text>
                            </Group>
                          ))}
                        </Stack>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Stack>

          {renderTagsSection()}
          
          <div className={styles.linkGroup} style={{ marginTop: '12px' }}>
            <Group gap="xs">
              {place.website && (
                <Anchor href={place.website} target="_blank" size="sm" className={styles.customLink}>
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
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  );
} 