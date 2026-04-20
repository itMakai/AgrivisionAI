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
  const emptySeries = { labels: [], datasets: [] };
  const [series, setSeries] = useState(predictions || emptySeries);

  useEffect(() => {
    let mounted = true;
    if (predictions && Array.isArray(predictions.labels) && Array.isArray(predictions.datasets)) {
      setSeries(predictions);
      return () => {
        mounted = false;
      };
    }

    fetchPlatformAnalytics()
      .then((data) => {
        if (!mounted) return;
        setSeries(data?.price_series || emptySeries);
      })
      .catch(() => {
        if (!mounted) return;
        setSeries(emptySeries);
      });

    return () => {
      mounted = false;
    };
  }, [predictions]);

  const labels = useMemo(() => series?.labels || [], [series]);
  const palette = ['#1E6B52', '#2563EB', '#F59E0B', '#DB2777', '#7C3AED', '#0EA5A4', '#DC2626', '#4F46E5'];

  const datasets = (series?.datasets || []).map((dataset, index) => ({
    label: dataset.label,
    data: dataset.values || [],
    borderColor: dataset.borderColor || palette[index % palette.length],
    backgroundColor: dataset.backgroundColor || 'rgba(0,0,0,0)',
    tension: 0.35,
    pointRadius: 4,
    pointHoverRadius: 6,
    fill: false,
  }));

  if (!datasets.length) {
    return (
      <div className="card border-0 bg-light">
        <div className="card-body text-center py-5 text-muted">
          No active crop listings are available yet to compare price ranges.
        </div>
      </div>
    );
  }

  const data = {
    labels,
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
              text: title || (lang === 'sw' ? 'Mstari wa Bei za Mazao' : 'Crop Price Range Lines'),
              font: { size: 18 }
            },
            legend: { display: true }
          },
          scales: {
            y: {
              ticks: { callback: (value) => 'KSh ' + value.toLocaleString() }
            },
            x: {
              title: {
                display: true,
                text: lang === 'sw' ? 'Kiwango cha Bei' : 'Price Range',
              },
            }
          }
        }}
      />
    </div>
  );
}
