import { useState, useEffect, useCallback, useRef } from 'react';
import type { TideMonth } from '../types';

interface TideErrorBody {
  message?: string;
  available?: { first: string; last: string };
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const total = (month - 1) + delta;
  const newYear = year + Math.floor(total / 12);
  const newMonth = ((total % 12) + 12) % 12;
  return `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
}

export function useTides() {
  const [data, setData] = useState<TideMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const cacheRef = useRef(new Map<string, TideMonth>());
  const lastRequestRef = useRef<string | null>(null);

  const fetchMonth = useCallback(async (targetMonth: string | null) => {
    lastRequestRef.current = targetMonth;

    const cached = targetMonth ? cacheRef.current.get(targetMonth) : null;
    if (cached) {
      setData(cached);
      setError(null);
      setNotReady(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotReady(false);

    try {
      const url = targetMonth ? `/api/tides?month=${targetMonth}` : '/api/tides';
      const response = await fetch(url);

      if (response.status === 503) {
        setNotReady(true);
        return;
      }

      if (!response.ok) {
        const body: TideErrorBody = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to load tide data');
      }

      const result: TideMonth = await response.json();
      cacheRef.current.set(result.month, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth(null);
  }, [fetchMonth]);

  const retry = useCallback(() => {
    fetchMonth(lastRequestRef.current);
  }, [fetchMonth]);

  const goToMonth = useCallback((month: string) => {
    fetchMonth(month);
  }, [fetchMonth]);

  const goPrevMonth = useCallback(() => {
    if (!data) return;
    fetchMonth(shiftMonthKey(data.month, -1));
  }, [data, fetchMonth]);

  const goNextMonth = useCallback(() => {
    if (!data) return;
    fetchMonth(shiftMonthKey(data.month, 1));
  }, [data, fetchMonth]);

  const canGoPrev = Boolean(data && data.month > data.available.first);
  const canGoNext = Boolean(data && data.month < data.available.last);

  return {
    data,
    loading,
    error,
    notReady,
    retry,
    goToMonth,
    goPrevMonth,
    goNextMonth,
    canGoPrev,
    canGoNext,
  };
}
