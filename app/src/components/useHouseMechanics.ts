import { useState, useEffect } from 'react';

interface HouseMechanicsData {
  success: boolean;
  content: string;
  house: string;
  filename: string;
}

interface HouseMechanicsError {
  success: false;
  message: string;
}

export function useHouseMechanics(house: 'lofty' | 'shady') {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHouseMechanics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get authentication token from localStorage
        const token = localStorage.getItem('guestToken');
        
        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`/api/house-mechanics/${house}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData: HouseMechanicsError = await response.json();
          throw new Error(errorData.message || 'Failed to fetch house mechanics data');
        }

        const houseMechanicsData: HouseMechanicsData = await response.json();
        setData(houseMechanicsData.content);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchHouseMechanics();
  }, [house]);

  return { data, loading, error };
} 