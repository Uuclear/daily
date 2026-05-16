import { useState, useEffect, useCallback } from 'react';
import type { Task } from '../types/models';
import * as api from '../api/client';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const data = await api.getTasks(status);
      setTasks(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await api.createTask(task);
    setTasks(prev => [created, ...prev]);
    return created;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const updated = await api.updateTask(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  };

  const updateTaskStatus = async (id: string, status: Task['status']) => {
    const updated = await api.updateTaskStatus(id, status);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  };

  const deleteTask = async (id: string) => {
    await api.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return { tasks, loading, error, fetchTasks, createTask, updateTask, updateTaskStatus, deleteTask };
}
