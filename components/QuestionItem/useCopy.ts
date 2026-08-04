import { useCallback, useState } from 'react';

function fallbackCopy(text: string, done: (ok: boolean) => void) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done(true);
  } catch {
    done(false);
  }
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const done = (ok: boolean) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => done(true))
        .catch(() => {
          fallbackCopy(text, done);
        });
    } else {
      fallbackCopy(text, done);
    }
  }, []);
  return [copied, copy] as const;
}
