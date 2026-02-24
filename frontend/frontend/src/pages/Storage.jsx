import StorageAlert from '../components/StorageAlert';

export default function Storage({ lang }) {
  return (
    <div className="mb-4">
      <h2 className="h3 fw-bold" style={{ color: 'var(--primary)' }}>{lang === 'sw' ? 'Tahadhari za Hifadhi' : 'Storage Alerts'}</h2>
      <div className="mt-3">
        <StorageAlert lang={lang} />
      </div>
    </div>
  );
}