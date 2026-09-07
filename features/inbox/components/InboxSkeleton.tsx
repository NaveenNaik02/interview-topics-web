// Mirrors the inbox page: header with its capture button, the Captured /
// Set aside tabs, then a few cards. Bars inside a card use --bg-hover, since
// .ic-card already sits on --bg-soft.
export default function InboxSkeleton() {
  return (
    <div className="content-wrapper animate-pulse">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="ic-page-head">
          <div>
            <div className="eyebrow h-4 w-28 rounded bg-[var(--bg-soft)]" />
            <div className="my-2 h-10 w-36 rounded bg-[var(--bg-soft)]" />
            <div className="h-4 w-[30rem] max-w-full rounded bg-[var(--bg-soft)]" />
          </div>
          <div className="h-9 w-36 rounded-lg bg-[var(--bg-soft)]" />
        </div>
      </div>

      <div className="ic-tabs">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="ic-tab">
            <span className="h-4 w-20 rounded bg-[var(--bg-soft)]" />
          </div>
        ))}
      </div>

      <div className="ic-list">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="ic-card">
            <div className="ic-card-top">
              <span className="h-3 w-14 rounded bg-[var(--bg-hover)]" />
            </div>
            <div className="h-4 w-full rounded bg-[var(--bg-hover)]" />
            <div className="h-4 w-2/3 rounded bg-[var(--bg-hover)]" />
            <div className="ic-card-actions">
              {[16, 20, 16].map((w, j) => (
                <span
                  key={j}
                  className="h-7 rounded-md bg-[var(--bg-hover)]"
                  style={{ width: `${w * 4}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
