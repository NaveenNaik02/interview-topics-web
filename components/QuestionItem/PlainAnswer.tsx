import { useEffect, useRef } from 'react';
import type { ParsedQuestion } from '@/lib/parser';
import { stripHtml } from './stripHtml';
import { CopyButton } from './CopyButton';

// Prism + its grammars are loaded on demand here rather than imported at
// module scope, so pages with no open (or no code-containing) questions
// never pay for them.
export function PlainAnswer({ q }: { q: ParsedQuestion }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/highlight').then(({ highlightIn }) => {
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
      <div dangerouslySetInnerHTML={{ __html: q.bodyHtml }} />
      <div className="q-answer-foot">
        <CopyButton getText={() => stripHtml(q.bodyHtml)} variant="answer" />
      </div>
    </div>
  );
}
