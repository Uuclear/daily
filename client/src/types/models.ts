export interface Task {
  id: string;
  project_name: string;
  location: string;
  assigned_team: string | null;
  status: 'entrusted' | 'in_progress' | 'reporting' | 'completed';
  progress: number;
  planned_start_date: string | null;
  deadline: string | null;
  notes: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEvent {
  id: string;
  task_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  work_content: string;
  is_milestone: number;
  assigned_team: string | null;
  location: string;
  notes: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  members: string[];
}

export interface WeatherData {
  date: string;
  city: string;
  condition: 'sunny' | 'cloudy' | 'overcast' | 'rain' | 'heavy_rain' | 'snow' | 'fog' | 'haze';
  icon: string;
  tempMin: number;
  tempMax: number;
  description: string;
  outdoorWarning?: boolean;
}

export interface WeekSchedule {
  dates: string[];
  events: Record<string, ScheduleEvent[]>;
  summaries: Record<string, { id: string; date: string; content: string; updated_at: string }>;
}

export interface DailySummary {
  id: string;
  date: string;
  content: string;
  updated_at: string;
}
