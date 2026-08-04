import { useEffect, useRef, useState } from 'react';
import type { ParsedQuestion } from '@/lib/parser';
import { Icon } from './icons';
import { stripHtml } from './stripHtml';
import { useCopy } from './useCopy';

// Plain answer, or a Problem → Solution rail for implementation questions
// (q.problem set) — the code language badge is read off the rendered
// <code class="language-xxx"> the answer's fenced code block produces.
export function QuestionAnswerBody({ q }: { q: ParsedQuestion }) {
  const ref = useRef<HTMLDivElement>(null);
  const [aCopied, copyAnswer] = useCopy();
  const [codeLang, setCodeLang] = useState('');

  useEffect(() => {
    if (!ref.current) return;
    const codeEl = ref.current.querySelector('pre code[class*="language-"]');
    const m = codeEl?.className.match(/language-(\S+)/);
    setCodeLang(m ? m[1] : q.lang && q.lang !== 'none' ? q.lang : '');
  }, [q.id, q.bodyHtml, q.lang]);

  // Runs after the codeLang state update above has committed (and re-rendered
  // the badge), so Prism's injected <span> tokens aren't the render that got
  // reset by that update — dangerouslySetInnerHTML gets reapplied on it.
  // Prism + its grammars are loaded on demand here rather than imported at
  // module scope, so pages with no open (or no code-containing) questions
  // never pay for them.
  useEffect(() => {
    let cancelled = false;
    import('@/lib/highlight').then(({ highlightIn }) => {
      if (!cancelled) highlightIn(ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [q.id, q.bodyHtml, codeLang]);

  if (!q.problem) {
    return (
      <div
        className="q-body prose prose-slate dark:prose-invert max-w-none"
        ref={ref}
      >
        <div dangerouslySetInnerHTML={{ __html: q.bodyHtml }} />
        <div className="q-answer-foot">
          <button
            className={`copy-btn q-copy-answer ${aCopied ? 'copied' : ''}`}
            onClick={(e) => copyAnswer(stripHtml(q.bodyHtml), e)}
            aria-label="Copy answer"
            title="Copy answer"
          >
            {aCopied ? <Icon.Check /> : <Icon.Copy />}
          </button>
        </div>
      </div>
    );
  }

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
                <button
                  className={`copy-btn q-code-copy ${aCopied ? 'copied' : ''}`}
                  onClick={(e) => copyAnswer(stripHtml(q.bodyHtml), e)}
                  aria-label="Copy solution"
                  title="Copy solution"
                >
                  {aCopied ? <Icon.Check /> : <Icon.Copy />}Copy
                </button>
              </div>
              <div
                className="q-body prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: q.bodyHtml }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
