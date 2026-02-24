import WeatherChart from '../components/WeatherChart';

export default function Weather({ lang }) {
  return (
    <div className="mb-4">
      <h2 className="h3 fw-bold" style={{ color: 'var(--primary)' }}>{lang === 'sw' ? 'Hali ya Hewa Wiki Hii' : 'Weather This Week'}</h2>
      <div className="card mt-3">
        <div className="card-body">
          <WeatherChart lang={lang} />
        </div>
      </div>
    </div>
  );
}