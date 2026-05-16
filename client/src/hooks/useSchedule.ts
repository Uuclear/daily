import { useState, useEffect, useCallback } from 'react';
import type { WeekSchedule, ScheduleEvent, DailySummary } from '../types/models';
import * as api from '../api/client';

/** Get local date string YYYY-MM-DD without timezone issues */
function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useSchedule() {
  const [schedule, setSchedule] = useState<WeekSchedule>({ dates: [], events: {}, summaries: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return localDateString(monday);
  });

  const fetchSchedule = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const data = await api.getWeekSchedule(date);
      setSchedule(data);
      if (date) setCurrentWeekStart(date);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule(currentWeekStart);
  }, [fetchSchedule, currentWeekStart]);

  const goToWeek = (date: string) => {
    const d = new Date(date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    setCurrentWeekStart(localDateString(monday));
  };

  const goToToday = () => {
    goToWeek(localDateString(new Date()));
  };

  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    goToWeek(localDateString(d));
  };

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    goToWeek(localDateString(d));
  };

  const addEvent = async (event: Omit<ScheduleEvent, 'id'>) => {
    const created = await api.createScheduleEvent(event);
    setSchedule(prev => {
      const events = { ...prev.events };
      if (!events[created.date]) events[created.date] = [];
      events[created.date] = [...events[created.date], created];
      return { ...prev, events };
    });
    return created;
  };

  const updateEvent = async (id: string, updates: Partial<ScheduleEvent>) => {
    const updated = await api.updateScheduleEvent(id, updates);
    setSchedule(prev => {
      const newEvents: Record<string, ScheduleEvent[]> = {};
      Object.entries(prev.events).forEach(([date, evts]) => {
        const filtered = evts.filter(e => e.id !== id);
        if (filtered.length > 0) newEvents[date] = filtered;
      });
      if (!newEvents[updated.date]) newEvents[updated.date] = [];
      newEvents[updated.date].push(updated);
      return { ...prev, events: newEvents };
    });
    return updated;
  };

  const removeEvent = async (id: string) => {
    await api.deleteScheduleEvent(id);
    setSchedule(prev => {
      const newEvents: Record<string, ScheduleEvent[]> = {};
      Object.entries(prev.events).forEach(([date, evts]) => {
        const filtered = evts.filter(e => e.id !== id);
        if (filtered.length > 0) newEvents[date] = filtered;
      });
      return { ...prev, events: newEvents };
    });
  };

  const updateSummary = async (date: string, content: string) => {
    const saved = await api.saveDailySummary(date, content);
    setSchedule(prev => {
      const summaries = { ...prev.summaries };
      summaries[date] = saved;
      return { ...prev, summaries };
    });
    return saved;
  };

  return { schedule, loading, error, currentWeekStart, prevWeek, nextWeek, goToToday, addEvent, updateEvent, removeEvent, updateSummary, refresh: () => fetchSchedule(currentWeekStart) };
}
