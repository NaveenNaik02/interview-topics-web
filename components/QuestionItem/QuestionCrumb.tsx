import Link from 'next/link';
import { Icon } from './icons';

interface Props {
  topicLabel: string;
  subLabel: string;
  href: string;
}

// Optional `subtitle` content for cross-section lists (Priority Mix, Starred)
// to show which topic/subtopic a question lives under and link back to it.
export function QuestionCrumb({ topicLabel, subLabel, href }: Props) {
  return (
    <Link
      href={href}
      className="q-crumb"
      onClick={(e) => e.stopPropagation()}
      title={`Go to ${topicLabel} › ${subLabel}`}
    >
      <b>{topicLabel}</b>
      <Icon.ChevronRight />
      {subLabel}
    </Link>
  );
}
