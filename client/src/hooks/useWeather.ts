import { useState, useEffect } from 'react';
import type { WeatherData } from '../types/models';
import * as api from '../api/client';

export function useWeather(city = '上海') {
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await api.getWeather(city, 7);
        setWeather(data);
      } catch {
        setWeather([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [city]);

  return { weather, loading };
}
