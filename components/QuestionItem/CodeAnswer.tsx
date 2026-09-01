import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ParsedQuestion } from '@/lib/parser';
import { CopyButton } from './CopyButton';

// Code-output questions: the snippet is the question, so it renders open,
// while the output and the explanation stay collapsed — revealing them is
// the point of the exercise. Both are optional; the explanation disclosure
// is dropped entirely when there's nothing behind it.
export function CodeAnswer({ q }: { q: ParsedQuestion }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const code = q.code ?? '';
  const lang = q.lang && q.lang !== 'none' ? q.lang : 'code';

  useEffect(() => {
    let cancelled = false;
    import('@/lib/highlight').then(({ highlightIn }) => {
      if (!cancelled) highlightIn(ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [q.id, showExplain]);

  return (
    <div className="q-body" ref={ref}>
      <div className="q-code-card">
        <div className="q-code-head">
          <span className="q-code-lang">{lang}</span>
          <CopyButton getText={() => code} variant="solution" />
        </div>
        <pre className="qc-code">
          <code className={`language-${lang}`}>{code}</code>
        </pre>
      </div>

      <button
        type="button"
        className={`qc-toggle ${showOutput ? 'open' : ''}`}
        onClick={() => setShowOutput(!showOutput)}
        aria-expanded={showOutput}
      >
        <span>Output</span>
        <ChevronDown size={15} />
      </button>
      {showOutput && <pre className="qc-output">{q.output?.trim() || '—'}</pre>}

      {q.bodyHtml && (
        <>
          <button
            type="button"
            className={`qc-toggle ${showExplain ? 'open' : ''}`}
            onClick={() => setShowExplain(!showExplain)}
            aria-expanded={showExplain}
          >
            <span>Explanation</span>
            <ChevronDown size={15} />
          </button>
          {showExplain && (
            <div
              className="qc-explain prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: q.bodyHtml }}
            />
          )}
        </>
      )}
    </div>
  );
}
