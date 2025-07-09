import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Title, Text, Group, TextInput, SimpleGrid, LoadingOverlay, Alert, Tabs, Center, Loader } from '@mantine/core';
import { IconSearch, IconAlertCircle, IconList, IconMap } from '@tabler/icons-react';
import { PlaceCard } from './PlaceCard';
import { MapView } from './MapView';
import type { PlacesData, Place } from '../types';

const ITEMS_PER_PAGE = 20;

export function PlacesList() {
  const [placesData, setPlacesData] = useState<PlacesData | null>(null);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [displayedPlaces, setDisplayedPlaces] = useState<Place[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('list');
  const [hasMore, setHasMore] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const response = await fetch('/api/compound-places');
        if (!response.ok) {
          throw new Error('Failed to load places data');
        }
        const data: PlacesData = await response.json();
        setPlacesData(data);
        setFilteredPlaces(data.places);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    loadPlaces();
  }, []);

  // Debounce search term with no intermediate state changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Optimized search filter function
  const filterPlaces = useCallback((places: Place[], searchTerm: string) => {
    if (!searchTerm) return places;
    
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return places.filter(place => {
      return searchTerms.every(term => {
        return place.name.toLowerCase().includes(term) ||
               place.description?.toLowerCase().includes(term) ||
               place.tags.some(tag => tag.toLowerCase().includes(term)) ||
               place.category.toLowerCase().includes(term) ||
               place.type.toLowerCase().includes(term) ||
               place.address?.toLowerCase().includes(term);
      });
    });
  }, []);

  useEffect(() => {
    if (!placesData) return;

    const filtered = filterPlaces(placesData.places, debouncedSearchTerm);
    setFilteredPlaces(filtered);
    setCurrentPage(1);
  }, [placesData, debouncedSearchTerm, filterPlaces]);

  // Update displayed places when filtered places or current page changes
  useEffect(() => {
    const totalItems = currentPage * ITEMS_PER_PAGE;
    const newDisplayedPlaces = filteredPlaces.slice(0, totalItems);
    setDisplayedPlaces(newDisplayedPlaces);
    setHasMore(totalItems < filteredPlaces.length);
  }, [filteredPlaces, currentPage]);

  // Load more items
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    // Simulate network delay for better UX
    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setLoadingMore(false);
    }, 500);
  }, [loadingMore, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && activeTab === 'list') {
          loadMore();
        }
      },
      { rootMargin: '100px' }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [loadMore, hasMore, loadingMore, activeTab]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <LoadingOverlay visible={loading} />
        <Title order={2}>Loading Places...</Title>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!placesData) {
    return null;
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="center">
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <TextInput
            placeholder="Search by name, type, description, category, address, or tags..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ 
              fontFamily: 'monospace'
            }}
            styles={{
              input: {
                borderRadius: '9999px',
                borderColor: 'var(--mantine-color-blue-5)',
                color: 'var(--mantine-color-blue-7)',
                fontFamily: 'monospace',
                '&:focus': {
                  borderColor: 'var(--mantine-color-blue-6)',
                }
              }
            }}
          />
          <Text size="xs" ta="right" c="dimmed" mt={4}>
            Showing {displayedPlaces.length} of {filteredPlaces.length} places
          </Text>
        </div>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab} mb="xl" mt="none">
        <Tabs.List>
          <Tabs.Tab value="list" leftSection={<IconList size={16} />}>
            List View
          </Tabs.Tab>
          <Tabs.Tab value="map" leftSection={<IconMap size={16} />}>
            Map View
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="list" mt="xl">
          <SimpleGrid 
            cols={{ base: 1, sm: 2, lg: 3 }} 
            spacing="md"
          >
            {displayedPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </SimpleGrid>
          
          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} style={{ height: '20px', margin: '20px 0' }} />
          
          {/* Loading indicator */}
          {loadingMore && (
            <Center py="md">
              <Group gap="sm">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">Loading more places...</Text>
              </Group>
            </Center>
          )}
          
          {/* End of results indicator */}
          {!hasMore && filteredPlaces.length > 0 && (
            <Center py="md">
              <Text size="sm" c="dimmed">
                You've reached the end! All {filteredPlaces.length} places shown.
              </Text>
            </Center>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="map" mt="xl">
          <MapView 
            places={filteredPlaces} 
            loading={loading} 
            error={error}
            isVisible={activeTab === 'map'}
          />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
} 