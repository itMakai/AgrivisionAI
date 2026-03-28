import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,          
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fetchRealTimeWeather } from '../lib/api';

// Register BarElement 
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function WeatherChart({ lang, weatherData = null }) {
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);

  const labels = daily.map(d => {
    let dt = null;
    if (d.date) dt = new Date(d.date + 'T00:00:00');
    else if (d.dt) dt = new Date(d.dt * 1000);
    else dt = new Date();
    return dt.toLocaleDateString(undefined, { weekday: 'short' });
  });

  const data = {
    labels: labels.length ? labels : (lang === 'sw' ? ['Jum', 'Jum2', 'Jum3', 'Alh', 'Iju', 'Jum', 'Jum'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
    datasets: [
      {
        label: lang === 'sw' ? 'Mvua (mm)' : 'Rainfall (mm)',
        data: daily.length ? daily.map(d => d.precip_mm ?? d.precipitation ?? 0) : [0, 0, 2, 8, 25, 12, 0],
        backgroundColor: '#3B82F6',
        yAxisID: 'y',
      },
      {
        label: lang === 'sw' ? 'Unyevu (%)' : 'Humidity (%)',
        data: daily.length ? daily.map(d => d.humidity_pct ?? d.hum_avg ?? 0) : [45, 42, 55, 78, 85, 72, 48],
        backgroundColor: '#10B981',
        yAxisID: 'y1',
      },
      {
        label: lang === 'sw' ? 'Joto (°C)' : 'Temp (°C)',
        data: daily.length ? daily.map(d => {
          // Prefer daily.temp.day (OpenWeather), then temp (number), then avg_temp
          if (d.temp && typeof d.temp === 'object') return d.temp.day ?? d.temp.avg ?? null;
          return d.temp ?? d.avg_temp ?? d.temperature ?? null;
        }) : [22, 23, 21, 20, 19, 21, 22],
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245,158,11,0.2)',
        type: 'line',
        yAxisID: 'y2',
        tension: 0.3,
        pointRadius: 3,
      }
    ]
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    if (weatherData && weatherData.daily) {
      setDaily(weatherData.daily);
      setLoading(false);
    } else {
      fetchRealTimeWeather({ city: 'Nairobi' }).then(res => {
        if (!mounted) return;
        if (res && res.daily) setDaily(res.daily);
      }).catch(() => {
        // ignore errors, keep static sample data
      }).finally(() => { if (mounted) setLoading(false); });
    }

    return () => {
      mounted = false;
    };
  }, [weatherData]);

  return (
    <div className="card">
      {loading ? <div className="small text-muted px-3 pt-3">Loading weather data...</div> : null}
      <Bar
        data={data}
        options={{
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: lang === 'sw' ? 'Hali ya Hewa Wiki Hii' : 'Weather This Week',
              font: { size: 18 }
            },
            tooltip: {
              callbacks: {
                // Show value and unit for each dataset
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  if (label.includes('Rain') || label.includes('Mvua')) return `${label}: ${value} mm`;
                  if (label.includes('Unyevu') || label.includes('Humidity')) return `${label}: ${value} %`;
                  if (label.includes('Temp') || label.includes('Joto')) return `${label}: ${value} °C`;
                  return `${label}: ${value}`;
                },
                // Show description in footer
                footer: function(items) {
                  if (!items || !items.length) return '';
                  const idx = items[0].dataIndex;
                  const d = daily[idx];
                  const desc = d?.weather?.[0]?.description ?? d?.summary ?? d?.description ?? '';
                  return desc ? [`${desc}`] : '';
                }
              }
            }
          },
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: lang === 'sw' ? 'Mvua (mm)' : 'Rain (mm)' } },
            y1: { type: 'linear', position: 'left', offset: true, grid: { drawOnChartArea: false }, title: { display: true, text: lang === 'sw' ? 'Unyevu (%)' : 'Humidity (%)' } },
            y2: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: lang === 'sw' ? 'Joto (°C)' : 'Temp (°C)' } }
          }
        }}
      />
    </div>
  );
}
