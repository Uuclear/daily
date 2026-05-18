import axios from 'axios';
import type { Task, ScheduleEvent, Team, WeatherData, WeekSchedule } from '../types/models';

const api = axios.create({
  baseURL: '/api',
  validateStatus: (status) => status < 500, // treat 4xx as failures too
});

export const getTasks = async (status?: string): Promise<Task[]> => {
  const params = status ? { status } : {};
  const { data } = await api.get<Task[]>('/tasks', { params });
  return data;
};

export const createTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> => {
  const { data } = await api.post<Task>('/tasks', task);
  return data;
};

export const updateTask = async (id: string, task: Partial<Task>): Promise<Task> => {
  const { data } = await api.put<Task>(`/tasks/${id}`, task);
  return data;
};

export const updateTaskStatus = async (id: string, status: Task['status']): Promise<Task> => {
  const { data } = await api.put<Task>(`/tasks/${id}/status`, { status });
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

export const getWeekSchedule = async (date?: string): Promise<WeekSchedule> => {
  const params = date ? { date } : {};
  const { data } = await api.get<WeekSchedule>('/schedule', { params });
  return data;
};

export const createScheduleEvent = async (event: Omit<ScheduleEvent, 'id'>): Promise<ScheduleEvent> => {
  const { data } = await api.post<ScheduleEvent>('/schedule', event);
  return data;
};

export const updateScheduleEvent = async (id: string, event: Partial<ScheduleEvent>): Promise<ScheduleEvent> => {
  const { data } = await api.put<ScheduleEvent>(`/schedule/${id}`, event);
  return data;
};

export const deleteScheduleEvent = async (id: string): Promise<void> => {
  await api.delete(`/schedule/${id}`);
};

export const saveDailySummary = async (date: string, content: string): Promise<any> => {
  const { data } = await api.post('/schedule/summary', { date, content });
  return data;
};

export const getTeams = async (): Promise<Team[]> => {
  const { data } = await api.get<Team[]>('/teams');
  return data;
};

export const getWeather = async (city = '上海', days = 7): Promise<WeatherData[]> => {
  const { data } = await api.get<WeatherData[]>('/weather', { params: { city, days } });
  return data;
};

export const getPersons = async (): Promise<string[]> => {
  const { data } = await api.get<{ name: string }[]>('/persons');
  return data.map(p => p.name);
};

export const addPerson = async (name: string): Promise<{ id: string; name: string }> => {
  const { data } = await api.post('/persons', { name });
  return data;
};

export interface SearchResult {
  id: string;
  matchedField: string;
  [key: string]: any;
}

export const search = async (keyword: string): Promise<{ tasks: SearchResult[]; events: SearchResult[] }> => {
  const { data } = await api.get('/search', { params: { q: keyword } });
  return data;
};
