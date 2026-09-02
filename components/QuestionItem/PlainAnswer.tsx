import { useEffect, useMemo, useRef } from 'react';
import type { ParsedQuestion } from '@/lib/content/parser';
import { stripHtml } from './stripHtml';
import { CopyButton } from './CopyButton';

// Prism + its grammars are loaded on demand here rather than imported at
// module scope, so pages with no open (or no code-containing) questions
// never pay for them.
export function PlainAnswer({ q }: { q: ParsedQuestion }) {
  const ref = useRef<HTMLDivElement>(null);
  // Stable identity or React re-assigns innerHTML on every re-render, which
  // throws away the token spans Prism injected below.
  const html = useMemo(() => ({ __html: q.bodyHtml }), [q.bodyHtml]);

  useEffect(() => {
    let cancelled = false;
    import('./highlight').then(({ highlightIn }) => {
      if (!cancelled) highlightIn(ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [q.id, q.bodyHtml]);

  return (
    <div
      className="q-body prose prose-slate dark:prose-invert max-w-none"
      ref={ref}
    >
      <div dangerouslySetInnerHTML={html} />
      <div className="q-answer-foot">
        <CopyButton getText={() => stripHtml(q.bodyHtml)} variant="answer" />
      </div>
    </div>
  );
}
