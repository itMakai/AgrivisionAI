import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function DashboardCard({ title, value, market, trend, desc, color = "primary" }) {
  return (
    <div className="card app-card card-compact">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="insight-label">{title}</div>
          <div className="insight-value mt-2">{value}</div>
          {market && <div className="small muted-text mt-1">{market}</div>}
          {desc && (
            <div className="small text-danger mt-2 d-flex align-items-center gap-2">
              <AlertTriangle className="me-2" /> {desc}
            </div>
          )}
        </div>

        {trend && (
          <div className={`d-flex align-items-center ms-3 ${trend.startsWith('+') ? 'text-success' : 'text-danger'}`}>
            {trend.startsWith('+') ? <TrendingUp className="me-1" /> : <TrendingDown className="me-1" />}
            <div className="fw-semibold">{trend}</div>
          </div>
        )}
      </div>
    </div>
  );
}