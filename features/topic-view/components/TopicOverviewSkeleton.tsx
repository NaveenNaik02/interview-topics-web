export const TopicOverviewSkeleton = () => {
  return (
    <div className="content-wrapper animate-pulse">
      <div className="tv-h-head">
        <div className="tv-h-ring bg-[var(--bg-soft)]" />
        <div className="tv-h-title">
          <div className="h-6 w-56 bg-[var(--bg-soft)] rounded mb-3" />
          <div className="h-4 w-80 max-w-full bg-[var(--bg-soft)] rounded mb-3" />
          <div className="h-3.5 w-40 bg-[var(--bg-soft)] rounded" />
        </div>
      </div>

      <div className="tv-h-bulkbar">
        <div className="h-8 w-32 bg-[var(--bg-soft)] rounded-full" />
      </div>

      <div className="tv-h-list">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="tv-h-row">
            <div className="tv-h-row-main">
              <div className="tv-h-row-name">
                <div className="h-4 w-40 bg-[var(--bg-soft)] rounded" />
              </div>
              <div className="tv-h-bar" />
              <div className="h-3 w-10 bg-[var(--bg-soft)] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
