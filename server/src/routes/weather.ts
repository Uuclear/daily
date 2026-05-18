import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

interface WeatherResult {
  date: string;
  city: string;
  condition: string;
  icon: string;
  tempMin: number;
  tempMax: number;
  description: string;
  outdoorWarning?: boolean;
}

// Chinese city name -> [lat, lon] mapping
const cityCoords: Record<string, [number, number]> = {
  '上海': [31.2304, 121.4737],
  '北京': [39.9042, 116.4074],
  '广州': [23.1291, 113.2644],
  '深圳': [22.5431, 114.0579],
  '杭州': [30.2741, 120.1551],
  '南京': [32.0603, 118.7969],
  '成都': [30.5728, 104.0668],
  '重庆': [29.5630, 106.5516],
  '武汉': [30.5928, 114.3055],
  '西安': [34.3416, 108.9398],
  '天津': [39.3434, 117.3616],
  '苏州': [31.2989, 120.5853],
  '青岛': [36.0671, 120.3826],
  '大连': [38.9140, 121.6147],
  '厦门': [24.4798, 118.0894],
  '长沙': [28.2282, 112.9388],
  '郑州': [34.7466, 113.6253],
  '济南': [36.6512, 117.1201],
  '沈阳': [41.8057, 123.4315],
  '哈尔滨': [45.8038, 126.5350],
};

const wmoCodeMap: Record<number, { condition: string; icon: string; description: string }> = {
  0: { condition: 'sunny', icon: '☀', description: '晴' },
  1: { condition: 'sunny', icon: '🌤', description: '大部晴' },
  2: { condition: 'cloudy', icon: '⛅', description: '多云' },
  3: { condition: 'overcast', icon: '☁', description: '阴' },
  45: { condition: 'fog', icon: '🌫', description: '雾' },
  48: { condition: 'fog', icon: '🌫', description: '雾凇' },
  51: { condition: 'rain', icon: '☂', description: '小毛毛雨' },
  53: { condition: 'rain', icon: '☂', description: '中毛毛雨' },
  55: { condition: 'rain', icon: '☂', description: '大毛毛雨' },
  56: { condition: 'rain', icon: '☂', description: '冻毛毛雨' },
  57: { condition: 'rain', icon: '☂', description: '强冻毛毛雨' },
  61: { condition: 'rain', icon: '☂', description: '小雨' },
  63: { condition: 'rain', icon: '☂', description: '中雨' },
  65: { condition: 'heavy_rain', icon: '☂', description: '大雨' },
  66: { condition: 'snow', icon: '❄', description: '冻雨' },
  67: { condition: 'heavy_rain', icon: '☂', description: '强冻雨' },
  71: { condition: 'snow', icon: '❄', description: '小雪' },
  73: { condition: 'snow', icon: '❄', description: '中雪' },
  75: { condition: 'snow', icon: '❄', description: '大雪' },
  77: { condition: 'snow', icon: '❄', description: '雪粒' },
  80: { condition: 'rain', icon: '☂', description: '小阵雨' },
  81: { condition: 'rain', icon: '☂', description: '中阵雨' },
  82: { condition: 'heavy_rain', icon: '☂', description: '大阵雨' },
  85: { condition: 'snow', icon: '❄', description: '小阵雪' },
  86: { condition: 'snow', icon: '❄', description: '大阵雪' },
  95: { condition: 'heavy_rain', icon: '⛈', description: '雷暴' },
  96: { condition: 'heavy_rain', icon: '⛈', description: '雷暴冰雹' },
  99: { condition: 'heavy_rain', icon: '⛈', description: '强雷暴冰雹' },
};

/** Return local date string YYYY-MM-DD in Asia/Shanghai */
function todayLocal(): string {
  const d = new Date();
  // Asia/Shanghai = UTC+8
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const shanghai = new Date(utc + 8 * 3600000);
  return `${shanghai.getFullYear()}-${String(shanghai.getMonth() + 1).padStart(2, '0')}-${String(shanghai.getDate()).padStart(2, '0')}`;
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = _req.userId;
  const { city = '上海', days = '7' } = _req.query;
  const cityName = city as string;
  const numDays = parseInt(days as string, 10);

  const coords = cityCoords[cityName];
  if (!coords) return res.json([]);

  const db = getDb();
  const today = todayLocal();

  // 1. Try to serve from cache (all requested dates must exist)
  const dateRange: string[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dateRange.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  const placeholders = dateRange.map(() => '?').join(',');
  const cached = db.prepare(
    `SELECT date, city, condition, icon, temp_min, temp_max, description FROM weather_cache
     WHERE city = ? AND (user_id = ? OR user_id = 'system') AND date IN (${placeholders})
     ORDER BY date ASC`
  ).all(cityName, userId, ...dateRange);

  // If we have all dates cached, return them immediately
  if (cached.length === dateRange.length) {
    const result: WeatherResult[] = cached.map((row: any) => ({
      date: row.date,
      city: cityName,
      condition: row.condition,
      icon: row.icon,
      tempMin: row.temp_min,
      tempMax: row.temp_max,
      description: row.description,
      outdoorWarning: ['rain', 'heavy_rain', 'snow', 'fog'].includes(row.condition),
    }));
    return res.json(result);
  }

  // 2. Cache miss for some dates → fetch from API and upsert
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia/Shanghai&forecast_days=${numDays}`
    );

    if (!response.ok) {
      // API failed — return whatever we have from cache
      if (cached.length > 0) {
        const result: WeatherResult[] = cached.map((row: any) => ({
          date: row.date,
          city: cityName,
          condition: row.condition,
          icon: row.icon,
          tempMin: row.temp_min,
          tempMax: row.temp_max,
          description: row.description,
          outdoorWarning: ['rain', 'heavy_rain', 'snow', 'fog'].includes(row.condition),
        }));
        return res.json(result);
      }
      return res.json([]);
    }

    const data = await response.json() as any;
    if (!data.daily || !data.daily.time) return res.json([]);

    const now = new Date().toISOString();
    const upsert = db.prepare(
      `INSERT INTO weather_cache (date, city, condition, icon, temp_min, temp_max, description, fetched_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date, city) DO UPDATE SET
         condition = excluded.condition,
         icon = excluded.icon,
         temp_min = excluded.temp_min,
         temp_max = excluded.temp_max,
         description = excluded.description,
         fetched_at = excluded.fetched_at`
    );

    const forecast: WeatherResult[] = data.daily.time.map((dateStr: string, i: number) => {
      const wmoCode = data.daily.weather_code[i];
      const mapped = wmoCodeMap[wmoCode] || { condition: 'cloudy', icon: '⛅', description: '多云' };
      const entry: WeatherResult = {
        date: dateStr,
        city: cityName,
        condition: mapped.condition,
        icon: mapped.icon,
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        description: mapped.description,
        outdoorWarning: ['rain', 'heavy_rain', 'snow', 'fog'].includes(mapped.condition),
      };
      upsert.run(dateStr, cityName, mapped.condition, mapped.icon, entry.tempMin, entry.tempMax, mapped.description, now, userId);
      return entry;
    });

    res.json(forecast);
  } catch (e) {
    console.error('Weather API error:', e);
    // Fallback to cache
    if (cached.length > 0) {
      const result: WeatherResult[] = cached.map((row: any) => ({
        date: row.date,
        city: cityName,
        condition: row.condition,
        icon: row.icon,
        tempMin: row.temp_min,
        tempMax: row.temp_max,
        description: row.description,
        outdoorWarning: ['rain', 'heavy_rain', 'snow', 'fog'].includes(row.condition),
      }));
      return res.json(result);
    }
    res.json([]);
  }
});

export default router;
