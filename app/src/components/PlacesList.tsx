import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Title, Text, Group, TextInput, SimpleGrid, LoadingOverlay, Alert, Tabs, Center, Loader, Accordion, Button, Code } from '@mantine/core';
import { IconSearch, IconAlertCircle, IconLayoutList, IconMap, IconLayoutGrid, IconInfoCircle } from '@tabler/icons-react';
import { PlaceCard } from './PlaceCard';
import { PlaceListItem } from './PlaceListItem';
import { MapView } from './MapView';
import type { PlacesData, Place } from '../types';

const ITEMS_PER_PAGE = 20;

// Sample data for development fallback
const SAMPLE_DATA: PlacesData = {
  metadata: {
    generatedAt: new Date().toISOString(),
    totalPlaces: 3,
    sourceDocTitle: 'Sample Development Data',
    sourceDocId: 'sample',
    parserVersion: '1.0.0',
    enrichmentVersion: '2.0.0',
    summary: 'Sample places data for development',
    categories: ['Restaurants', 'Activities'],
    enrichmentStats: {
      totalPlaces: 3,
      enrichedPlaces: 2,
      skippedPlaces: 1
    }
  },
  places: [
    {
      id: 'sample-restaurant-1',
      name: 'Sample Restaurant',
      type: 'dining',
      description: 'A great local restaurant with amazing food',
      category: 'Restaurants',
      address: '123 Main St, Anytown, ME 04001',
      phone: '(555) 123-4567',
      website: 'https://example.com',
      mapsLink: 'https://maps.google.com/?q=123+Main+St,+Anytown,+ME+04001',
      rating: 4.5,
      priceRange: '$$',
      hours: 'Mon-Sun 11am-9pm',
      notes: 'Great for families, outdoor seating available',
      tags: ['restaurant', 'local', 'family-friendly'],
      coordinates: { lat: 44.3106, lng: -69.7795 },
      origText: 'Sample Restaurant - A great local restaurant with amazing food',
      enrichmentStatus: {
        enriched: true,
        enrichedAt: new Date().toISOString(),
        enrichmentVersion: '2.0.0'
      }
    },
    {
      id: 'sample-activity-1',
      name: 'Sample Hiking Trail',
      type: 'activity',
      description: 'Beautiful hiking trail with scenic views',
      category: 'Activities',
      address: 'Trail Head, Anytown, ME 04001',
      website: null,
      mapsLink: 'https://maps.google.com/?q=Trail+Head,+Anytown,+ME+04001',
      phone: null,
      priceRange: null,
      rating: null,
      hours: null,
      notes: 'Moderate difficulty, bring water',
      tags: ['hiking', 'outdoor', 'scenic'],
      coordinates: { lat: 44.3206, lng: -69.7695 },
      origText: 'Sample Hiking Trail - Beautiful hiking trail with scenic views',
      enrichmentStatus: {
        enriched: true,
        enrichedAt: new Date().toISOString(),
        enrichmentVersion: '2.0.0'
      }
    },
    {
      id: 'sample-shop-1',
      name: 'Sample Gift Shop',
      type: 'shopping',
      description: 'Local gift shop with unique items',
      category: 'Shopping',
      address: '456 Oak St, Anytown, ME 04001',
      phone: '(555) 987-6543',
      website: null,
      mapsLink: 'https://maps.google.com/?q=456+Oak+St,+Anytown,+ME+04001',
      priceRange: null,
      rating: null,
      hours: null,
      notes: 'Unique handcrafted items',
      tags: ['gifts', 'local', 'souvenirs'],
      coordinates: { lat: 44.3006, lng: -69.7895 },
      origText: 'Sample Gift Shop - Local gift shop with unique items',
      enrichmentStatus: {
        enriched: false,
        enrichedAt: new Date().toISOString(),
        enrichmentVersion: '2.0.0'
      }
    }
  ]
};

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
  const [activeTab, setActiveTab] = useState<string | null>('grid');
  const [hasMore, setHasMore] = useState(true);
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const useSampleData = () => {
    setPlacesData(SAMPLE_DATA);
    setFilteredPlaces(SAMPLE_DATA.places);
    setIsUsingSampleData(true);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const response = await fetch('/api/compound-places');
        
        if (!response.ok) {
          // Check if it's a 404 or other error
          if (response.status === 404) {
            throw new Error('PLACES_NOT_FOUND');
          }
          throw new Error('Failed to load places data');
        }
        
        const data: PlacesData = await response.json();
        setPlacesData(data);
        setFilteredPlaces(data.places);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        
        if (errorMessage === 'PLACES_NOT_FOUND') {
          setError('PLACES_NOT_FOUND');
        } else {
          setError(errorMessage);
        }
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
        if (entries[0].isIntersecting && hasMore && !loadingMore && activeTab === 'grid') {
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

  if (error === 'PLACES_NOT_FOUND') {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconInfoCircle size={16} />} title="No Places Data Found" color="blue" mb="md">
          <Text mb="md">
            The places data hasn't been generated yet. You have two options:
          </Text>
          
          <Text fw={500} mb="sm">Option 1: Use sample data for development</Text>
          <Button 
            onClick={useSampleData}
            variant="light"
            mb="md"
          >
            Load Sample Data
          </Button>
          
          <Text fw={500} mb="sm">Option 2: Generate real data</Text>
          <Text size="sm" mb="sm">
            Run the parser to generate the places data from your Google Doc:
          </Text>
          <Code block mb="md">
            cd app{'\n'}
            npm run parse
          </Code>
          <Text size="sm" c="dimmed">
            Make sure you have configured your environment variables (OPENAI_API_KEY, GOOGLE_DOC_ID, etc.) first.
          </Text>
        </Alert>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
          {error}
        </Alert>
        <Text size="sm" c="dimmed">
          You can try loading sample data for development:
        </Text>
        <Button 
          onClick={useSampleData}
          variant="light"
          mt="sm"
        >
          Load Sample Data
        </Button>
      </Container>
    );
  }

  if (!placesData) {
    return null;
  }

  return (
    <Container size="xl" py="xl">
      {isUsingSampleData && (
        <Alert icon={<IconInfoCircle size={16} />} title="Using Sample Data" color="yellow" mb="md">
          You're currently viewing sample data for development. To see real data, run the parser with your Google Doc.
        </Alert>
      )}
      
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
          <Tabs.Tab value="grid" leftSection={<IconLayoutGrid size={16} />}>
            Grid
          </Tabs.Tab>
          <Tabs.Tab value="list" leftSection={<IconLayoutList size={16} />}>
            List
          </Tabs.Tab>
          <Tabs.Tab value="map" leftSection={<IconMap size={16} />}>
            Map
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="grid" mt="xl">
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

        <Tabs.Panel value="list" mt="xl">
          <Accordion variant="default" multiple style={{ border: '1px solid var(--mantine-color-brand-6)' }}>
            {filteredPlaces.map((place) => (
              <PlaceListItem key={place.id} place={place} />
            ))}
          </Accordion>
          
          {/* End of results indicator for list view */}
          {filteredPlaces.length > 0 && (
            <Center py="md">
              <Text size="sm" c="dimmed">
                Showing all {filteredPlaces.length} places
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