import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchPlatformAnalytics } from '../lib/api';

// Register only once
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function PriceTrendChart({ lang, predictions = null, title = null }) {
  const [rows, setRows] = useState(predictions || []);

  useEffect(() => {
    let mounted = true;
    if (predictions && predictions.length) {
      setRows(predictions);
      return () => {
        mounted = false;
      };
    }

    fetchPlatformAnalytics()
      .then((data) => {
        if (!mounted) return;
        setRows(data?.price_series || []);
      })
      .catch(() => {
        if (!mounted) return;
        setRows([]);
      });

    return () => {
      mounted = false;
    };
  }, [predictions]);

  const labels = useMemo(() => {
    const first = rows?.[0]?.points || [];
    return first.map((point) => {
      try {
        return new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch {
        return point.date;
      }
    });
  }, [rows]);

  const palette = ['#1E6B52', '#2563EB', '#F59E0B', '#DB2777', '#7C3AED'];
  const datasets = (rows || []).slice(0, 4).map((series, index) => ({
    label: `${series.crop}`,
    data: (series.points || []).map((point) => point.value),
    borderColor: palette[index % palette.length],
    backgroundColor: 'rgba(0,0,0,0)',
    tension: 0.35,
    pointRadius: 3,
  }));

  if (!datasets.length) {
    datasets.push({
      label: 'Maize',
      data: [3200, 3400, 3800, 4200, 4800, 5200, 4900],
      borderColor: '#1E6B52',
      backgroundColor: 'rgba(30, 107, 82, 0.1)',
      tension: 0.4,
      pointBackgroundColor: '#F59E0B',
      pointRadius: 4,
    });
  }

  const data = {
    labels: labels.length ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets,
  };
  return (
    <div className="card">
      <Line
        data={data}
        options={{
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: title || (lang === 'sw' ? 'Utabiri wa Bei za Mazao' : 'Predicted Crop Prices'),
              font: { size: 18 }
            },
            legend: { display: true }
          },
          scales: {
            y: {
              ticks: { callback: (value) => 'KSh ' + value.toLocaleString() }
            }
          }
        }}
      />
    </div>
  );
}
