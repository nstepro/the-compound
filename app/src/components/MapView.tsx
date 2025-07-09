import { useEffect, useRef, useState, useMemo } from 'react';
import { Container, LoadingOverlay, Alert, Modal, Popover } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Place } from '../types';
import { PlaceCard } from './PlaceCard';

interface MapViewProps {
  places: Place[];
  loading: boolean;
  error: string | null;
  isVisible: boolean;
}

// Function to detect if device supports touch
const isTouchDevice = () => {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
};

// Function to get icon and color based on place type
const getTypeConfig = (type: string): { icon: string; backgroundColor: string } => {
  switch (type.toLowerCase()) {
    case 'restaurant':
      return { icon: '🍜', backgroundColor: '#FFD700' }; // Yellow
    case 'dining':
      return { icon: '🍜', backgroundColor: '#FFD700' }; // Yellow
    case 'shopping':
      return { icon: '🛍️', backgroundColor: '#9B59B6' }; // Purple
    case 'activity':
      return { icon: '🏖️', backgroundColor: '#3498DB' }; // Blue
    case 'attraction':
      return { icon: '🏖️', backgroundColor: '#3498DB' }; // Blue
    case 'accommodation':
      return { icon: '🏡', backgroundColor: '#E67E22' }; // Orange
    default:
      return { icon: '📍', backgroundColor: '#E74C3C' }; // Red
  }
};

// Simple tooltip component using PlaceCard
interface MarkerTooltipProps {
  place: Place;
  children: React.ReactNode;
}

function MarkerTooltip({ place, children }: MarkerTooltipProps) {
  const [opened, setOpened] = useState(false);
  const isTouch = isTouchDevice();

  // Only show tooltip on hover for non-touch devices
  const handleMouseEnter = () => {
    if (!isTouch) {
      setOpened(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouch) {
      setOpened(false);
    }
  };

  return (
    <Popover 
      opened={opened} 
      onClose={() => setOpened(false)}
      position="top"
      withArrow
      shadow="md"
      radius="md"
      offset={10}
      transitionProps={{ duration: 200 }}
    >
      <Popover.Target>
        <div 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </div>
      </Popover.Target>
      
      <Popover.Dropdown>
        <PlaceCard 
          place={place} 
          enableHover={false}
          compact={true}
          hideLinks={true}
          hidePhoneHours={true}
          maxDescriptionLength={120}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

export function MapView({ places, loading, error, isVisible }: MapViewProps) {
  const mapRef = useRef<any>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [initialBoundsSet, setInitialBoundsSet] = useState(false);
  
  // Filter places that have coordinates - memoized to prevent unnecessary re-renders
  const placesWithCoordinates = useMemo(() => 
    places.filter(place => place.coordinates), 
    [places]
  );

  useEffect(() => {
    // Only set initial bounds once when places are first loaded
    if (mapRef.current && placesWithCoordinates.length > 0 && !initialBoundsSet) {
      if (placesWithCoordinates.length === 1) {
        // If there's only one place, center on it with a reasonable zoom
        const place = placesWithCoordinates[0];
        if (place.coordinates) {
          mapRef.current.flyTo({
            center: [place.coordinates.lng, place.coordinates.lat],
            zoom: 12,
            duration: 1000
          });
        }
      } else {
        // Calculate bounds for multiple places
        const coordinates = placesWithCoordinates
          .map(place => place.coordinates)
          .filter(coord => coord !== null);
        
        if (coordinates.length > 0) {
          const lngs = coordinates.map(coord => coord!.lng);
          const lats = coordinates.map(coord => coord!.lat);
          
          const bounds = [
            [Math.min(...lngs), Math.min(...lats)], // Southwest coordinates
            [Math.max(...lngs), Math.max(...lats)]  // Northeast coordinates
          ];
          
          mapRef.current.fitBounds(bounds, {
            padding: 50, // Add some padding around the bounds
            duration: 1000
          });
        }
      }
      setInitialBoundsSet(true);
    }
  }, [placesWithCoordinates, initialBoundsSet]);

  // Handle map resize when it becomes visible
  useEffect(() => {
    if (isVisible && mapRef.current) {
      // Small delay to ensure the tab content is fully rendered
      const timeoutId = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isVisible]);

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
                <MarkerTooltip place={place}>
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
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onClick={() => handleMarkerClick(place)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                    }}
                  >
                    {getTypeConfig(place.type).icon}
                  </div>
                </MarkerTooltip>
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
        {selectedPlace && <PlaceCard place={selectedPlace} enableHover={false} />}
      </Modal>
    </>
  );
} 