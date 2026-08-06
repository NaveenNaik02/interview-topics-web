'use client';

import { Download, X } from 'lucide-react';
import { useProgressStats } from '@/lib/useProgressStats';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';

function relativeTime(isoStr: string | null) {
  if (!isoStr) return 'a while ago';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

// Whole row is dynamic (download state, progress, cached-at time), unlike
// the other settings rows — so it owns its own settings-row-text/label
// rather than splitting the static label out into the server-rendered parent.
export default function OfflineAccessControl() {
  const stats = useProgressStats();
  const {
    isOnline,
    offlineModeEnabled,
    isCaching,
    cachingProgress,
    cachedAt,
    enableOfflineMode,
    disableOfflineMode,
  } = useAppStore(
    useShallow((s) => ({
      isOnline: s.isOnline,
      offlineModeEnabled: s.offlineModeEnabled,
      isCaching: s.isCaching,
      cachingProgress: s.cachingProgress,
      cachedAt: s.cachedAt,
      enableOfflineMode: s.enableOfflineMode,
      disableOfflineMode: s.disableOfflineMode,
    })),
  );

  const pct = cachingProgress
    ? Math.round((cachingProgress.done / cachingProgress.total) * 100)
    : 0;

  return (
    <>
      <div className="settings-row-text">
        <div className="settings-row-label">Download for offline use</div>
        <div className="settings-row-hint">
          {isCaching
            ? `Downloading… ${pct}%`
            : offlineModeEnabled
              ? `Saved on this device · updated ${relativeTime(cachedAt)}`
              : `Save all ${stats.total} questions, answers and code snippets so you can study without a connection.`}
        </div>
      </div>
      {isCaching ? (
        <div className="settings-download-progress">
          <div
            className="bar-fill"
            style={{ width: `${pct}%`, background: 'var(--accent)' }}
          />
        </div>
      ) : (
        <button
          className={`settings-offline-btn${offlineModeEnabled ? ' danger' : ''}`}
          onClick={offlineModeEnabled ? disableOfflineMode : enableOfflineMode}
          disabled={!isOnline && !offlineModeEnabled}
        >
          {offlineModeEnabled ? (
            <>
              <X size={13} /> Remove download
            </>
          ) : (
            <>
              <Download size={13} />{' '}
              {isOnline ? 'Download' : 'Connect to download'}
            </>
          )}
        </button>
      )}
    </>
  );
}
