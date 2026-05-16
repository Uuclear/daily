import type { WeatherData } from './types/models';

interface WeatherCardProps {
  weather: WeatherData;
}

export function WeatherCard({ weather }: WeatherCardProps) {
  const conditionColors: Record<string, string> = {
    sunny: '#fffbe6',
    cloudy: '#f5f5f5',
    overcast: '#f5f5f5',
    rain: '#fff2f0',
    heavy_rain: '#fff2f0',
    snow: '#f0f5ff',
    fog: '#f5f5f5',
    haze: '#f5f5f5',
  };

  if (!weather || !weather.date) return null;

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '6px 4px',
        background: conditionColors[weather.condition] || '#fafafa',
        minHeight: 56,
      }}
    >
      <div style={{ fontSize: 18, lineHeight: 1 }}>{weather.icon}</div>
      <div style={{ fontSize: 10, color: weather.outdoorWarning ? '#ff4d4f' : '#888' }}>
        {weather.tempMin}~{weather.tempMax}°C
      </div>
      <div style={{ fontSize: 9, color: '#999' }}>{weather.description}</div>
      {weather.outdoorWarning && (
        <span style={{ fontSize: 8, color: '#ff4d4f' }}>户外作业注意</span>
      )}
    </div>
  );
}
