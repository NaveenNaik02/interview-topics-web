import { Star } from 'lucide-react';

interface Props {
  isStarred?: boolean;
  onToggle: () => void;
}

// Optional `actions` content — the quick-access star toggle shown in the row
// head (separate from the "Star for review" entry inside RowActions' kebab).
export function StarButton({ isStarred, onToggle }: Props) {
  return (
    <button
      className={`q-star ${isStarred ? 'on' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={
        isStarred ? 'Unstar question' : 'Star for pre-interview review'
      }
      aria-pressed={isStarred}
      title={
        isStarred
          ? 'Starred — quick pre-interview review'
          : 'Star for pre-interview review'
      }
    >
      <Star fill={isStarred ? 'currentColor' : 'none'} />
    </button>
  );
}
