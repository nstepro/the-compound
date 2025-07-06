import { useState, useEffect } from 'react';
import { Container, Title, Text, Group, Badge, TextInput, Select, SimpleGrid, LoadingOverlay, Alert } from '@mantine/core';
import { IconSearch, IconAlertCircle } from '@tabler/icons-react';
import { PlaceCard } from './PlaceCard';
import type { PlacesData, Place } from '../types';

export function PlacesList() {
  const [placesData, setPlacesData] = useState<PlacesData | null>(null);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const response = await fetch('/compound-places.json');
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

  useEffect(() => {
    if (!placesData) return;

    let filtered = placesData.places;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        place.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(place => place.category === selectedCategory);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(place => place.type === selectedType);
    }

    setFilteredPlaces(filtered);
  }, [placesData, searchTerm, selectedCategory, selectedType]);

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

  const categories = ['all', ...placesData.metadata.categories];
  const types = ['all', ...Array.from(new Set(placesData.places.map(p => p.type)))];

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">
        {placesData.metadata.sourceDocTitle}
      </Title>
      
      <Text size="lg" c="dimmed" mb="xl">
        {placesData.metadata.summary}
      </Text>

      <Group mb="xl">
        <Badge variant="light" size="lg">
          {placesData.metadata.totalPlaces} places
        </Badge>
        <Badge variant="light" size="lg" color="green">
          {placesData.metadata.enrichmentStats.enrichedPlaces} enriched
        </Badge>
      </Group>

      <Group mb="xl">
        <TextInput
          placeholder="Search places..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />
        
        <Select
          placeholder="Category"
          value={selectedCategory}
          onChange={(value) => setSelectedCategory(value || 'all')}
          data={categories.map(cat => ({ value: cat, label: cat === 'all' ? 'All Categories' : cat }))}
          style={{ minWidth: 200 }}
        />
        
        <Select
          placeholder="Type"
          value={selectedType}
          onChange={(value) => setSelectedType(value || 'all')}
          data={types.map(type => ({ value: type, label: type === 'all' ? 'All Types' : type }))}
          style={{ minWidth: 150 }}
        />
      </Group>

      <Text size="md" mb="md">
        Showing {filteredPlaces.length} places
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {filteredPlaces.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </SimpleGrid>
    </Container>
  );
} 