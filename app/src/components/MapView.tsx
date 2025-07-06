import { useEffect, useRef, useState } from 'react';
import { Container, LoadingOverlay, Alert, Modal } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Place } from '../types';
import { PlaceCard } from './PlaceCard';

interface MapViewProps {
  places: Place[];
  loading: boolean;
  error: string | null;
}

// Function to get icon and color based on place type
const getTypeConfig = (type: string): { icon: string; backgroundColor: string } => {
  switch (type.toLowerCase()) {
    case 'restaurant':
      return { icon: '🍜', backgroundColor: '#FFD700' }; // Yellow
    case 'shopping':
      return { icon: '🛍️', backgroundColor: '#9B59B6' }; // Purple
    case 'activity':
      return { icon: '🏃', backgroundColor: '#27AE60' }; // Green
    case 'attraction':
      return { icon: '🏖️', backgroundColor: '#3498DB' }; // Blue
    case 'accommodation':
      return { icon: '🏡', backgroundColor: '#E67E22' }; // Orange
    default:
      return { icon: '📍', backgroundColor: '#E74C3C' }; // Red
  }
};

export function MapView({ places, loading, error }: MapViewProps) {
  const mapRef = useRef<any>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  
  // Filter places that have coordinates
  const placesWithCoordinates = places.filter(place => place.coordinates);

  useEffect(() => {
    if (mapRef.current && placesWithCoordinates.length > 0) {
      // Center the map on the first place with coordinates
      const firstPlace = placesWithCoordinates[0];
      if (firstPlace.coordinates) {
        mapRef.current.flyTo({
          center: [firstPlace.coordinates.lng, firstPlace.coordinates.lat],
          zoom: 10,
          duration: 1000
        });
      }
    }
  }, [placesWithCoordinates]);

  const handleMarkerClick = (place: Place) => {
    setSelectedPlace(place);
    setModalOpened(true);
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setSelectedPlace(null);
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <LoadingOverlay visible={loading} />
        <div style={{ height: '70vh' }}>Loading map...</div>
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

  // Default to a Maine coordinates view
  const defaultCenter = [-69.4455, 44.3106]; // Maine coordinates
  const defaultZoom = 7;

  return (
    <>
      <div style={{ height: '70vh', width: '100%' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
          initialViewState={{
            longitude: defaultCenter[0],
            latitude: defaultCenter[1],
            zoom: defaultZoom
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
        >
          {placesWithCoordinates.map((place) => (
            place.coordinates && (
              <Marker
                key={place.id}
                longitude={place.coordinates.lng}
                latitude={place.coordinates.lat}
                anchor="bottom"
              >
                <div 
                  style={{
                    background: getTypeConfig(place.type).backgroundColor,
                    width: '35px',
                    height: '35px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  title={place.name}
                  onClick={() => handleMarkerClick(place)}
                >
                  {getTypeConfig(place.type).icon}
                </div>
              </Marker>
            )
          ))}
        </Map>
      </div>

      <Modal
        opened={modalOpened}
        onClose={handleCloseModal}
        size="lg"
        centered
      >
        {selectedPlace && <PlaceCard place={selectedPlace} />}
      </Modal>
    </>
  );
} 