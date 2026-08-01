'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import InboxCaptureModal from './InboxCaptureModal';

export default function InboxCaptureButton() {
  const [capturing, setCapturing] = useState(false);

  return (
    <>
      <button
        className="btn btn-primary ic-page-cta"
        onClick={() => setCapturing(true)}
      >
        <Bookmark size={14} />
        Save a question
      </button>
      {capturing && (
        <InboxCaptureModal
          onClose={() => setCapturing(false)}
          onSaved={() => setCapturing(false)}
        />
      )}
    </>
  );
}
