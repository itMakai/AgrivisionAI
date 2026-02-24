import { AlertTriangle } from 'lucide-react';

export default function StorageAlert({ lang }) {
  return (
    <div className="card app-card border-start border-4 border-danger mb-3">
      <div className="card-body d-flex gap-3 align-items-start">
        <div className="text-danger">
          <AlertTriangle width={36} height={36} />
        </div>
        <div>
          <h5 className="card-title text-danger mb-1">
            {lang === 'sw' ? 'HATARI KUBWA YA KUOZA' : 'HIGH SPOILAGE RISK'}
          </h5>
          <p className="mb-1">{lang === 'sw' ? 'Uza embe zako ndani ya siku 3 tu!' : 'Sell your mangoes within 3 days only!'}</p>
          <p className="small muted-text mb-0">{lang === 'sw' ? 'Unyevu wa juu + joto = upotevu mkubwa' : 'High humidity + heat = major loss'}</p>
        </div>
      </div>
    </div>
  );
}