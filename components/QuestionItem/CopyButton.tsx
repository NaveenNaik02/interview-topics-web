import { Icon } from './icons';
import { useCopy } from './useCopy';

interface Props {
  // Lazy — stripHtml() only runs on click, not every render.
  getText: () => string;
  variant: 'answer' | 'solution';
}

// Owns its own "copied" flash state so clicking copy only re-renders this
// button, not the (potentially large) answer/solution content it sits next
// to — that content never changes when this state does.
export function CopyButton({ getText, variant }: Props) {
  const [copied, copy] = useCopy();

  if (variant === 'answer') {
    return (
      <button
        className={`copy-btn q-copy-answer ${copied ? 'copied' : ''}`}
        onClick={(e) => copy(getText(), e)}
        aria-label="Copy answer"
        title="Copy answer"
      >
        {copied ? <Icon.Check /> : <Icon.Copy />}
      </button>
    );
  }

  return (
    <button
      className={`copy-btn q-code-copy ${copied ? 'copied' : ''}`}
      onClick={(e) => copy(getText(), e)}
      aria-label="Copy solution"
      title="Copy solution"
    >
      {copied ? <Icon.Check /> : <Icon.Copy />}Copy
    </button>
  );
}
