import type { ParsedQuestion } from '@/lib/parser';
import { PlainAnswer } from './PlainAnswer';
import { SolutionRail } from './SolutionRail';

export function QuestionAnswerBody({ q }: { q: ParsedQuestion }) {
  return q.problem ? <SolutionRail q={q} /> : <PlainAnswer q={q} />;
}
