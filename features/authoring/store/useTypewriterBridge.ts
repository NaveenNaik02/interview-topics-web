'use client';

import { useEffect } from 'react';
import { useTypewriter } from '@/lib/useTypewriter';
import { useAuthoring, useAuthoringApi } from './authoringStore';

// The store parks AI results in `stream`; this plays them into the right
// field a few characters at a time. It stays a hook because useTypewriter
// holds an interval it must clear on unmount — a store action has no
// unmount, so an in-flight typewriter would keep writing into a closed modal.
export const useTypewriterBridge = () => {
  const api = useAuthoringApi();
  const stream = useAuthoring((s) => s.stream);

  const typeTitle = useTypewriter((t) => api.getState().setTitle(t));
  const typeMarkdown = useTypewriter((t) => api.getState().setMarkdown(t));
  const typeProblem = useTypewriter((t) => api.getState().setProblem(t));

  useEffect(() => {
    if (!stream) return;
    const play =
      stream.target === 'title'
        ? typeTitle
        : stream.target === 'problem'
          ? typeProblem
          : typeMarkdown;
    play(stream.text, () => api.getState().finishStream());
    // Keyed on the token so two identical results still replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?.token]);
};
