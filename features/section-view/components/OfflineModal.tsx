import { Send } from 'lucide-react';

interface OfflineModalProps {
  open: boolean;
  onClose: () => void;
}

export default function OfflineModal({ open, onClose }: OfflineModalProps) {
  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      onClick={onClose}
    >
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="offline-notavail-icon">
          <Send size={22} />
        </div>
        <h2 className="confirm-title">Not available offline</h2>
        <p className="confirm-message">
          You&apos;re offline and haven&apos;t downloaded this content yet,
          so questions and answers can&apos;t be opened right now.
          Reconnect, or download an offline copy next time you&apos;re
          online to study anywhere.
        </p>
        <div className="confirm-actions">
          <button
            className="btn btn-ghost"
            onClick={onClose}
          >
            Dismiss
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onClose();
              document.dispatchEvent(new Event('open-offline-options'));
            }}
          >
            Offline options
          </button>
        </div>
      </div>
    </div>
  );
}
