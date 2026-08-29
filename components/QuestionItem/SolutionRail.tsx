import { useEffect, useMemo, useRef, useState } from 'react';
import type { ParsedQuestion } from '@/lib/parser';
import { stripHtml } from './stripHtml';
import { CopyButton } from './CopyButton';

// Problem → Solution rail for implementation questions (q.problem set) —
// the code language badge is read off the rendered <code class="language-xxx">
// the solution's fenced code block produces. Only this variant needs the
// codeLang state, so it's colocated here rather than in the shared
// QuestionAnswerBody — a plain answer never renders a language badge.
export function SolutionRail({ q }: { q: ParsedQuestion }) {
  const ref = useRef<HTMLDivElement>(null);
  const [codeLang, setCodeLang] = useState('');
  // Stable identity or React re-assigns innerHTML on every re-render, which
  // throws away the token spans Prism injected below.
  const html = useMemo(() => ({ __html: q.bodyHtml }), [q.bodyHtml]);

  useEffect(() => {
    if (!ref.current) return;
    const codeEl = ref.current.querySelector('pre code[class*="language-"]');
    const m = codeEl?.className.match(/language-(\S+)/);
    setCodeLang(m ? m[1] : q.lang && q.lang !== 'none' ? q.lang : '');
  }, [q.id, q.bodyHtml, q.lang]);

  // Runs after the codeLang state update above has committed (and re-rendered
  // the badge), so Prism's injected <span> tokens aren't the render that got
  // reset by that update — dangerouslySetInnerHTML gets reapplied on it.
  useEffect(() => {
    let cancelled = false;
    import('@/lib/highlight').then(({ highlightIn }) => {
      if (!cancelled) highlightIn(ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [q.id, q.bodyHtml, codeLang]);

  return (
    <div className="q-body" ref={ref}>
      <div className="q-rail">
        <div className="q-rail-item">
          <div className="q-rail-track">
            <span className="q-rail-dot" />
            <span className="q-rail-line" />
          </div>
          <div className="q-rail-content">
            <div className="q-rail-label">Problem</div>
            <p className="q-rail-problem-text">{q.problem}</p>
          </div>
        </div>
        <div className="q-rail-item">
          <div className="q-rail-track">
            <span className="q-rail-dot solid" />
          </div>
          <div className="q-rail-content">
            <div className="q-rail-label">Solution</div>
            <div className="q-code-card">
              <div className="q-code-head">
                <span className="q-code-lang">{codeLang || 'code'}</span>
                <CopyButton
                  getText={() => stripHtml(q.bodyHtml)}
                  variant="solution"
                />
              </div>
              <div
                className="q-body prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={html}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
