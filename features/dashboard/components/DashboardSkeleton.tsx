import { CSSProperties } from 'react';

// The rings render their own empty track at --p:0, so they need no fill.
const empty = { '--p': 0 } as CSSProperties;

export default function DashboardSkeleton() {
  return (
    <div className="dashboard-view animate-pulse">
      <header className="dash-hero-ring">
        <div className="dash-ring" style={empty} />
        <div className="dash-hero-text">
          <div className="h-8 w-80 max-w-full bg-[var(--bg-soft)] rounded mb-3" />
          <div className="h-4 w-64 max-w-full bg-[var(--bg-soft)] rounded" />
        </div>
      </header>

      <div className="dash-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="topic-card">
            <div className="tc-main">
              <div className="tc-top">
                <div className="h-10 w-10 bg-[var(--bg-soft)] rounded-full" />
                <div className="tc-ring" style={empty} />
              </div>
              <div className="h-6 w-40 max-w-full bg-[var(--bg-soft)] rounded" />
              <div className="h-4 w-full bg-[var(--bg-soft)] rounded" />
              <div className="tc-foot">
                <div className="h-3 w-20 bg-[var(--bg-soft)] rounded" />
                <div className="h-3 w-10 bg-[var(--bg-soft)] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
