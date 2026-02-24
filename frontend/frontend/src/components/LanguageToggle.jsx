export default function LanguageToggle({ lang, setLang }) {
  return (
    <div className="d-flex rounded-pill p-1" style={{ background: 'rgba(255,255,255,0.12)' }}>
      <button
        onClick={() => setLang('sw')}
        className={`btn btn-sm ${lang === 'sw' ? 'btn-light text-primary' : 'btn-outline-light text-white'}`}
        style={{ borderRadius: '999px' }}
      >
        Kiswahili
      </button>
      <button
        onClick={() => setLang('en')}
        className={`btn btn-sm ${lang === 'en' ? 'btn-light text-primary' : 'btn-outline-light text-white'}`}
        style={{ borderRadius: '999px' }}
      >
        English
      </button>
    </div>
  );
}