import type { ParsedQuestion } from '@/lib/parser';
import { CodeAnswer } from './CodeAnswer';
import { PlainAnswer } from './PlainAnswer';
import { SolutionRail } from './SolutionRail';

export function QuestionAnswerBody({ q }: { q: ParsedQuestion }) {
  if (q.code) return <CodeAnswer q={q} />;
  return q.problem ? <SolutionRail q={q} /> : <PlainAnswer q={q} />;
}
