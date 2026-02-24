import PriceTrendChart from '../components/PriceTrendChart';

export default function Forecast({ lang }) {
  return (
    <div className="mb-4">
      <h2 className="h3 fw-bold" style={{ color: 'var(--primary)' }}>{lang === 'sw' ? 'Utabiri wa Bei' : 'Price Forecast'}</h2>
      <div className="card mt-3">
        <div className="card-body">
          <PriceTrendChart lang={lang} />
        </div>
      </div>
    </div>
  );
}